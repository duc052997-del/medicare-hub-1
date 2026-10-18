// services/mocks/mockappointments.ts
// Giả lập API-09 (đặt lịch), API-10 (lịch sử của tôi), API-22 (hủy lịch): đúng thứ tự kiểm tra,
// mã lỗi và thông báo trong hợp đồng. Chống trùng giờ theo unique index của schema.sql (xem mockstore.ts).

import { ApiError } from '../apierror';
import type { Appointment, AppointmentStatus, BookingPayload, BookingResult, CancelResult } from '../../types';
import { MOCK_DOCTORS } from './mockdata';
import { mockCurrentUser } from './mockauth';
import { getDaySlots } from './mockdoctors';
import {
  MockAppointment, addAppointment, findAppointment, isSlotTaken, listByPatient, patientHasSlot, updateAppointment,
} from './mockstore';
import { delay, flag } from './mockutils';
import {
  isRealDate, isSlotBookable, maxBookingDate, timeNowVN, todayVN,
} from '../../utils/schedule';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_SYMPTOMS = 500;
const MAX_CANCEL_REASON = 255;
const FORBIDDEN = 'Bạn không có quyền truy cập chức năng này';
const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';
const STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED'];

// Tester bật localStorage mock_error_500 = '1' để thử nhánh lỗi 500
const maybeFail = () => {
  if (flag('mock_error_500')) throw new ApiError(500, SERVER_ERROR);
};

// verifyToken + requireRole('PATIENT') của BE: 401 nếu chưa đăng nhập/token sai, 403 nếu không phải bệnh nhân
const requirePatient = () => {
  const user = mockCurrentUser();
  if (user.role !== 'PATIENT') throw new ApiError(403, FORBIDDEN);
  return user;
};

const toPublic = (a: MockAppointment): Appointment => {
  const d = MOCK_DOCTORS.find((x) => String(x.id) === String(a.doctor_id));
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
  };
};

const text = (v: unknown) => (v == null ? '' : String(v).trim());

// ================= API-09  POST /appointments =================
export const mockBook = async (payload: BookingPayload): Promise<BookingResult> => {
  await delay();
  maybeFail();
  const user = requirePatient();

  const f = {
    doctor_id: text(payload?.doctor_id),
    date: text(payload?.date),
    time: text(payload?.time),
    symptoms: text(payload?.symptoms),
  };

  // Thiếu trường nào báo đúng trường đó (field) để FE tô đỏ ô nhập
  const missing = (Object.keys(f) as (keyof typeof f)[]).find((k) => !f[k]);
  if (missing) throw new ApiError(400, 'Vui lòng nhập đầy đủ thông tin đặt lịch', undefined, missing);
  if (f.symptoms.length > MAX_SYMPTOMS) {
    throw new ApiError(400, `Triệu chứng tối đa ${MAX_SYMPTOMS} ký tự`, undefined, 'symptoms');
  }
  if (!isRealDate(f.date) || !TIME_REGEX.test(f.time)) throw new ApiError(400, 'Ngày giờ không hợp lệ');
  if (f.date < todayVN() || (f.date === todayVN() && f.time <= timeNowVN())) {
    throw new ApiError(400, 'Không thể đặt lịch trong quá khứ');
  }
  // Luật mới UC006: chỉ đặt trong vòng 30 ngày kể từ ngày mai, và trước giờ khám ít nhất 24 giờ.
  if (f.date > maxBookingDate()) {
    throw new ApiError(400, 'Chỉ được đặt lịch trong vòng 30 ngày kể từ ngày mai', undefined, 'date');
  }
  if (!isSlotBookable(f.date, f.time)) {
    throw new ApiError(400, 'Vui lòng đặt lịch trước giờ khám ít nhất 24 giờ', undefined, 'time');
  }

  const doctor = MOCK_DOCTORS.find((d) => String(d.id) === f.doctor_id && d.is_active);
  if (!doctor) throw new ApiError(404, 'Không tìm thấy bác sĩ');

  const slot = getDaySlots(doctor.id, f.date).find((s) => s.start === f.time);
  if (!slot) throw new ApiError(400, 'Khung giờ này bác sĩ không làm việc', 'SLOT_NOT_IN_SCHEDULE');

  // SRS luồng 6a: trùng giờ -> 409 SLOT_TAKEN (BE bắt lỗi 23505 của unique index)
  if (isSlotTaken(doctor.id, f.date, f.time)) {
    throw new ApiError(409, 'Khung giờ đã có người đặt, vui lòng chọn khung giờ khác', 'SLOT_TAKEN');
  }
  if (patientHasSlot(user.id, f.date, f.time)) {
    throw new ApiError(409, 'Bạn đã có lịch khám khác vào khung giờ này, vui lòng chọn khung giờ khác', 'SLOT_TAKEN');
  }

  const created: MockAppointment = {
    id: crypto.randomUUID(),
    patient_id: user.id,
    doctor_id: doctor.id,
    appointment_date: f.date,
    start_time: slot.start,
    end_time: slot.end,
    symptoms: f.symptoms,
    status: 'PENDING', // "Chờ xác nhận"
    cancel_reason: null,
    cancelled_at: null,
    created_at: new Date().toISOString(),
  };
  addAppointment(created);

  return { message: 'Đặt lịch thành công, vui lòng chờ xác nhận', appointment: toPublic(created) };
};

// ================= API-10  GET /appointments/my =================
// Chỉ trả lịch của chính người đăng nhập, sắp theo ngày giảm dần; chưa có lịch -> mảng rỗng (200).
export const mockGetMy = async (status?: string): Promise<Appointment[]> => {
  await delay(150, 400);
  maybeFail();
  const user = requirePatient();

  if (status && !STATUSES.includes(status as AppointmentStatus)) throw new ApiError(400, 'Trạng thái không hợp lệ');

  return listByPatient(user.id)
    .filter((a) => !status || a.status === status)
    .sort((a, b) => `${b.appointment_date} ${b.start_time}`.localeCompare(`${a.appointment_date} ${a.start_time}`))
    .map(toPublic);
};

// ================= API-22  PATCH /appointments/:id/cancel =================
// Hủy = đổi status thành CANCELLED (không xóa dòng) khi lịch ở trạng thái PENDING (chưa xác nhận).
export const mockCancel = async (id: string, reason?: string): Promise<CancelResult> => {
  await delay();
  maybeFail();
  const user = requirePatient();

  const reasonText = text(reason);
  if (reasonText.length > MAX_CANCEL_REASON) {
    throw new ApiError(400, `Lý do hủy tối đa ${MAX_CANCEL_REASON} ký tự`, undefined, 'reason');
  }

  // Lịch của người khác cũng trả 404 để không lộ sự tồn tại của lịch
  const found = findAppointment(id);
  if (!found || found.patient_id !== user.id) throw new ApiError(404, 'Không tìm thấy lịch hẹn');

  if (found.status === 'CANCELLED') {
    throw new ApiError(409, 'Lịch hẹn này đã được hủy trước đó', 'ALREADY_CANCELLED');
  }
  
  // Chỉ cho phép hủy khi lịch hẹn đang ở trạng thái PENDING (chưa xác nhận)
  if (found.status !== 'PENDING') {
    throw new ApiError(400, 'Chỉ có thể hủy lịch hẹn khi chưa xác nhận', 'CANNOT_CANCEL');
  }

  const updated = updateAppointment(id, {
    status: 'CANCELLED',
    cancel_reason: reasonText || null,
    cancelled_at: new Date().toISOString(),
  });

  return { message: 'Hủy lịch hẹn thành công', appointment: toPublic(updated!) };
};