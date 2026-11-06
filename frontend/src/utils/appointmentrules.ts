// utils/appointmentrules.ts
// UC011 phía BỆNH NHÂN: quy tắc "lịch nào được hủy / đổi" (phần THUẦN, không React, không gọi API).
// BE thật tự tính can_cancel, can_reschedule (API-20); file này là bản FE để mock trả đúng cờ và để hiện gợi ý.
import type { AppointmentStatus } from '../types';

// TP ghi hủy lịch phải trước giờ khám >= 2 giờ; Lệch #13 đề xuất cùng quy tắc cho đổi lịch (cần nhóm chốt)
export const RESCHEDULE_MIN_HOURS = 2;

// Mã lỗi coi như "lịch trên màn hình đã cũ" sau khi hủy thất bại (hợp đồng: CANCEL_NOT_ALLOWED)
export const CANCEL_STALE_CODES = ['ALREADY_CANCELLED', 'CANNOT_CANCEL', 'CANCEL_NOT_ALLOWED', 'CANCEL_TOO_LATE'];

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Số giờ từ bây giờ đến giờ bắt đầu khám (giờ Việt Nam); âm = đã qua
export const hoursUntil = (day: string, time: string) => {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return (Date.UTC(y, m - 1, d, h, mi) - (Date.now() + VN_OFFSET_MS)) / 3_600_000;
};

interface RuleInput {
  status: AppointmentStatus;
  appointment_date: string;
  start_time: string;
}

// Giữ đúng hành vi UC007/API-22 đang chạy: bệnh nhân chỉ tự hủy được lịch "Chờ xác nhận"
export const canCancelAppointment = (a: Pick<RuleInput, 'status'>) => a.status === 'PENDING';

// API-21: chỉ lịch Chờ xác nhận / Đã xác nhận, và còn >= RESCHEDULE_MIN_HOURS giờ mới đổi được
export const canRescheduleAppointment = (a: RuleInput) =>
  (a.status === 'PENDING' || a.status === 'CONFIRMED') && hoursUntil(a.appointment_date, a.start_time) >= RESCHEDULE_MIN_HOURS;

// Gợi ý vì sao một nút không hiện, để bệnh nhân không bị "mất nút" mà không hiểu lý do
export const getActionHints = (a: RuleInput & { can_cancel: boolean; can_reschedule: boolean }): string[] => {
  const hints: string[] = [];
  const open = a.status === 'PENDING' || a.status === 'CONFIRMED';
  if (open && !a.can_reschedule) {
    hints.push(`Không thể đổi lịch vì còn dưới ${RESCHEDULE_MIN_HOURS} giờ đến giờ khám hoặc đã quá giờ khám.`);
  }
  if (a.status === 'CONFIRMED' && !a.can_cancel) {
    hints.push('Lịch đã được xác nhận nên không thể tự hủy trên hệ thống, vui lòng liên hệ phòng khám nếu cần hủy.');
  }
  return hints;
};