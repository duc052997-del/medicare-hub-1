// services/mocks/mockappointments.ts
// Giả lập API-09 (đặt lịch), API-10 (lịch sử của tôi), API-20 (chi tiết), API-21 (đổi lịch), API-22 (hủy lịch): đúng thứ tự kiểm tra,
// mã lỗi và thông báo trong hợp đồng. Chống trùng giờ theo unique index của schema.sql (xem mockstore.ts).
import { ApiError } from '../apierror';
import type { Appointment, AppointmentStatus, BookingPayload, BookingResult, CancelResult } from '../../types';
import { getCatalogDoctors } from './mockadmindoctors';
import { mockCurrentUser } from './mockauth';
import { getDaySlots } from './mockdoctors';
import {
  MockAppointment, addAppointment, findAppointment, isSlotTaken, listByPatient, patientHasSlot, updateAppointment,
} from './mockstore';
import { delay, flag } from './mockutils';
import type { AppointmentDetail, ReschedulePayload, RescheduleResult } from '../../types/appointmentdetail';
import { canCancelAppointment, canRescheduleAppointment } from '../../utils/appointmentrules';
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

  const doctor = getCatalogDoctors().find((d) => String(d.id) === f.doctor_id && d.is_active);
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
    throw new ApiError(400, 'Chỉ có thể hủy lịch hẹn khi chưa xác nhận', 'CANCEL_NOT_ALLOWED');
  }

  const updated = updateAppointment(id, {
    status: 'CANCELLED',
    cancel_reason: reasonText || null,
    cancelled_at: new Date().toISOString(),
  });

  return { message: 'Hủy lịch hẹn thành công', appointment: toPublic(updated!) };
};

// ================= API-20  GET /appointments/:id =================
// Lịch của người khác cũng trả 404 để không lộ sự tồn tại. can_cancel / can_reschedule tính theo utils/appointmentrules.ts.
export const mockGetDetail = async (id: string): Promise<AppointmentDetail> => {
  await delay(150, 400);
  maybeFail();
  const user = requirePatient();

  const found = findAppointment(id);
  if (!found || found.patient_id !== user.id) throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  return { ...toPublic(found), can_cancel: canCancelAppointment(found), can_reschedule: canRescheduleAppointment(found) };
};

// ================= API-21  PATCH /appointments/:id/reschedule =================
// Giữ nguyên bác sĩ và trạng thái, chỉ đổi ngày/giờ. Khung giờ mới phải theo cùng luật đặt lịch UC006 (30 ngày, trước 24 giờ),
// nằm trong lịch làm việc, chưa ai đặt (unique index, bỏ qua chính lịch này vì giờ cũ khác giờ mới).
export const mockReschedule = async (id: string, payload: ReschedulePayload): Promise<RescheduleResult> => {
  await delay();
  maybeFail();
  const user = requirePatient();

  const date = text(payload?.date);
  const time = text(payload?.time);
  if (!date || !time || !isRealDate(date) || !TIME_REGEX.test(time)) throw new ApiError(400, 'Ngày giờ không hợp lệ');

  const found = findAppointment(id);
  if (!found || found.patient_id !== user.id) throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  if (!canRescheduleAppointment(found)) throw new ApiError(400, 'Lịch hẹn không thể đổi', 'RESCHEDULE_NOT_ALLOWED');

  if (date < todayVN() || (date === todayVN() && time <= timeNowVN())) {
    throw new ApiError(400, 'Không thể đặt lịch trong quá khứ');
  }
  if (date > maxBookingDate()) {
    throw new ApiError(400, 'Chỉ được đặt lịch trong vòng 30 ngày kể từ ngày mai', undefined, 'date');
  }
  if (!isSlotBookable(date, time)) {
    throw new ApiError(400, 'Vui lòng đặt lịch trước giờ khám ít nhất 24 giờ', undefined, 'time');
  }
  if (date === found.appointment_date && time === found.start_time) {
    throw new ApiError(400, 'Vui lòng chọn khung giờ khác với lịch hiện tại', undefined, 'time');
  }

  const slot = getDaySlots(found.doctor_id, date).find((s) => s.start === time);
  if (!slot) throw new ApiError(400, 'Khung giờ này bác sĩ không làm việc', 'SLOT_NOT_IN_SCHEDULE');

  if (isSlotTaken(found.doctor_id, date, time)) {
    throw new ApiError(409, 'Khung giờ không khả dụng, vui lòng chọn lại', 'SLOT_TAKEN');
  }
  if (patientHasSlot(user.id, date, time)) {
    throw new ApiError(409, 'Bạn đã có lịch khám khác vào khung giờ này, vui lòng chọn khung giờ khác', 'SLOT_TAKEN');
  }

  const updated = updateAppointment(id, { appointment_date: date, start_time: slot.start, end_time: slot.end });
  return { message: 'Đổi lịch hẹn thành công', appointment: toPublic(updated!) };
};