// services/mocks/mockadminappointments.ts
// Giả lập API-25 GET /admin/appointments API-26 PATCH /admin/appointments/:id/status và API-27 POST /admin/appointments/:id/medical-record (UC011 phía Admin), dùng chung "bảng appointments" ở mockstore.ts
import { ApiError } from '../apierror';
import type { AppointmentStatus } from '../../types';
import type {
  AdminAppointment, AdminAppointmentQuery, AdminStatusAction, AdminStatusResult, AppointmentPatient,
  CompletePayload, CompleteResult,
} from '../../types/adminappointment';
import { SEED_USERS } from './mockdata';
import { getCatalogDoctors } from './mockadmindoctors';
import { mockCurrentUser } from './mockauth';
import { findAppointment, loadAppointments, updateAppointment } from './mockstore';
import { addCreatedRecord, hasRecordForAppointment } from './mockrecordstore';
import type { MedicalRecord, PrescriptionItem } from '../../types/medical';
import { mockFindRecordByAppointment } from './mockrecords';
import type { MockAppointment } from './mockstore';
import { delay, flag } from './mockutils';
import { isRealDate } from '../../utils/schedule';
import { normalize } from '../../utils/text';

const FORBIDDEN = 'Bạn không có quyền truy cập chức năng này';
const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';
const STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED'];

// Khớp phần bệnh nhân của seed.sql
const SEED_PATIENTS: Record<string, { full_name: string; phone: string }> = {
  'patient1@medicare.test': { full_name: 'Nguyễn Văn An', phone: '0911111111' },
  'patient2@medicare.test': { full_name: 'Trần Thị Bình', phone: '0922222222' },
  'patient3@medicare.test': { full_name: 'Lê Hoàng Cường', phone: '0933333333' },
};

// Tài khoản đăng ký mới được mockauth lưu ở localStorage 'mock_users'
const registeredUsername = (userId: string): string | null => {
  try {
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]') as { id: string; username?: string }[];
    return users.find((u) => u.id === userId)?.username ?? null;
  } catch {
    return null;
  }
};

const patientOf = (userId: string): AppointmentPatient => {
  const seed = SEED_USERS.find((u) => u.id === userId);
  const info = seed ? SEED_PATIENTS[seed.email] : undefined;
  return {
    id: userId,
    patient_code: `BN${userId.slice(-6)}`,
    full_name: info?.full_name ?? seed?.username ?? registeredUsername(userId),
    phone: info?.phone ?? null,
  };
};

const toAdminView = (a: MockAppointment): AdminAppointment => {
  const d = getCatalogDoctors().find((x) => String(x.id) === String(a.doctor_id));
  return {
    id: a.id,
    doctor: { id: a.doctor_id, full_name: d?.full_name ?? '', specialty: d?.specialty ?? '' },
    appointment_date: a.appointment_date,
    start_time: a.start_time,
    end_time: a.end_time,
    symptoms: a.symptoms,
    status: a.status,
    cancel_reason: a.cancel_reason,
    cancelled_at: a.cancelled_at ?? null,
    created_at: a.created_at,
    patient: patientOf(a.patient_id),
  };
};

// verifyToken + requireRole('ADMIN') của BE
const requireAdmin = () => {
  if (flag('mock_error_500')) throw new ApiError(500, SERVER_ERROR);
  const user = mockCurrentUser();
  if (user.role !== 'ADMIN') throw new ApiError(403, FORBIDDEN);
  return user;
};

// ================= API-25  GET /admin/appointments =================
export const mockAdminGetAll = async (query: AdminAppointmentQuery = {}): Promise<AdminAppointment[]> => {
  await delay(150, 400);
  requireAdmin();

  const { status, date, doctor_id, q } = query;
  if (status && !STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ');
  if (date && !isRealDate(date)) throw new ApiError(400, 'Ngày không hợp lệ, định dạng đúng là YYYY-MM-DD');

  const kw = normalize((q ?? '').trim());
  return loadAppointments()
    .map(toAdminView)
    .filter((a) => {
      if (status && a.status !== status) return false;
      if (date && a.appointment_date !== date) return false;
      if (doctor_id && String(a.doctor.id) !== doctor_id) return false;
      if (!kw) return true;
      return normalize(`${a.patient.full_name ?? ''} ${a.patient.phone ?? ''} ${a.patient.patient_code}`).includes(kw);
    })
    .sort((a, b) => `${b.appointment_date} ${b.start_time}`.localeCompare(`${a.appointment_date} ${a.start_time}`));
};

// ================= API-26  PATCH /admin/appointments/:id/status =================
// PENDING -> CONFIRMED | REJECTED ; CONFIRMED -> CANCELLED. Từ chối / hủy giải phóng khung giờ
// (mockstore chỉ coi PENDING, CONFIRMED, COMPLETED là "giữ chỗ"). Lý do lưu ở cancel_reason.
const ADMIN_STATUSES: AppointmentStatus[] = ['CONFIRMED', 'REJECTED', 'CANCELLED'];
const TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['CANCELLED'],
};
const MAX_REASON = 255;

export const mockAdminUpdateStatus = async (
  id: string, status: AdminStatusAction, reason?: string
): Promise<AdminStatusResult> => {
  await delay();
  requireAdmin();

  if (!ADMIN_STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ', undefined, 'status');
  const reasonText = reason == null ? '' : String(reason).trim();
  if (reasonText.length > MAX_REASON) throw new ApiError(400, `Lý do tối đa ${MAX_REASON} ký tự`, undefined, 'reason');

  const found = findAppointment(id);
  if (!found) throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  if (!TRANSITIONS[found.status]?.includes(status)) {
    throw new ApiError(400, 'Chuyển trạng thái không hợp lệ', 'INVALID_STATUS_TRANSITION');
  }

  const updated = updateAppointment(id, {
    status,
    cancel_reason: reasonText || null,
    cancelled_at: status === 'CANCELLED' ? new Date().toISOString() : null,
  });
  return { message: 'Cập nhật trạng thái lịch hẹn thành công', appointment: toAdminView(updated!) };
};

// ================= API-27  POST /admin/appointments/:id/medical-record =================
// Chỉ lịch CONFIRMED. Tạo hồ sơ + đơn thuốc rồi đưa lịch sang COMPLETED (khung giờ vẫn "giữ chỗ").
const textOf = (v: unknown) => (v == null ? '' : String(v).trim());

export const mockAdminComplete = async (id: string, payload: CompletePayload): Promise<CompleteResult> => {
  await delay();
  requireAdmin();

  const diagnosis = textOf(payload?.diagnosis);
  if (!diagnosis) throw new ApiError(400, 'Vui lòng nhập kết luận', undefined, 'diagnosis');

  const rawItems = Array.isArray(payload?.prescriptions) ? payload.prescriptions : [];
  const items = rawItems.map((p) => {
    const medicine_name = textOf(p?.medicine_name);
    if (!medicine_name) throw new ApiError(400, 'Tên thuốc không được để trống', undefined, 'prescriptions');
    const days = p?.duration_days;
    if (days != null && (!Number.isInteger(days) || days <= 0)) {
      throw new ApiError(400, 'Số ngày dùng thuốc phải là số nguyên dương', undefined, 'prescriptions');
    }
    return {
      id: crypto.randomUUID(),
      medicine_name,
      dosage: textOf(p?.dosage),
      frequency: textOf(p?.frequency),
      duration_days: days ?? null,
      instructions: textOf(p?.instructions) || null,
    } as PrescriptionItem;
  });

  const found = findAppointment(id);
  if (!found) throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  if (found.status !== 'CONFIRMED') {
    throw new ApiError(400, 'Chỉ lịch hẹn đã xác nhận mới được hoàn tất', 'INVALID_STATUS_TRANSITION');
  }
  if (hasRecordForAppointment(id)) throw new ApiError(409, 'Lịch hẹn này đã có hồ sơ bệnh án');

  const doctor = getCatalogDoctors().find((d) => String(d.id) === String(found.doctor_id));
  const notes = textOf(payload?.notes) || null;
  const record = {
    id: crypto.randomUUID(),
    appointment_id: id,
    appointment_date: found.appointment_date,
    doctor: { id: found.doctor_id, full_name: doctor?.full_name ?? '', specialty: doctor?.specialty ?? '' },
    diagnosis,
    notes,
    created_at: new Date().toISOString(),
    prescriptions: items,
  };
  addCreatedRecord({ patient_id: found.patient_id, record });
  updateAppointment(id, { status: 'COMPLETED' });

  return {
    message: 'Hoàn tất lịch khám và lưu hồ sơ bệnh án thành công',
    record: { id: record.id, appointment_id: id, diagnosis, notes, prescriptions: items },
  };
};

// ================= API-30  GET /admin/appointments/:id/medical-record  (ĐỀ XUẤT) =================
// Xem lại hồ sơ đã ghi (chỉ đọc). Có cả hồ sơ mẫu của các lịch COMPLETED trong seed lẫn hồ sơ Admin vừa tạo ở API-27.
export const mockAdminGetRecord = async (appointmentId: string): Promise<MedicalRecord> => {
  await delay(150, 400);
  requireAdmin();

  const found = findAppointment(appointmentId);
  const record = found ? mockFindRecordByAppointment(appointmentId) : undefined;
  if (!found || !record) throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh án');
  return record;
};