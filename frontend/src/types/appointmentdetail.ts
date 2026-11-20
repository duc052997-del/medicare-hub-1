// types/appointmentdetail.ts
// UC011 phía BỆNH NHÂN: API-20 (chi tiết lịch hẹn) và API-21 (đổi lịch).
import type { Appointment } from './index';

// API-20: đối tượng appointment dùng chung + 2 cờ do BE tính (trạng thái + điều kiện thời hạn)
export interface AppointmentDetail extends Appointment {
  can_cancel: boolean;
  can_reschedule: boolean;
}

// API-21 request: chỉ đổi ngày/giờ, KHÔNG đổi bác sĩ
export interface ReschedulePayload {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export interface RescheduleResult {
  message: string;
  appointment: Appointment;
}