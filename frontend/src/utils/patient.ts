// utils/patient.ts
// UC012: hàm THUẦN cho trang Bệnh nhân (nhãn, tuổi, trạng thái lịch).
// Tái dùng: formatDate (helpers), GENDER_OPTIONS (profileform/UC009), todayVN (schedule).
import { formatDate } from './helpers';
import { GENDER_OPTIONS } from './profileform';
import { todayVN } from './schedule';
import type { AppointmentStatus } from '../types';
import type { Gender } from '../types/profile';

export const DASH = '—';

export const orDash = (v?: string | null) => (v && v.trim() ? v.trim() : DASH);

/** Bệnh nhân mới có thể chưa có họ tên → hiện email */
export const patientName = (p: { full_name: string | null; email: string }) => p.full_name?.trim() || p.email;

export const initialOf = (p: { full_name: string | null; email: string }) => patientName(p).charAt(0).toUpperCase();

export const genderLabel = (g: Gender | null | undefined) => GENDER_OPTIONS.find((o) => o.value === g)?.label ?? DASH;

/** Tuổi theo ngày hôm nay (giờ VN); ngày sinh sai/ở tương lai → null */
export const calcAge = (dob: string | null | undefined): number | null => {
  if (!dob) return null;
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = todayVN().split('-').map(Number);
  if ([y, m, d].some(Number.isNaN)) return null;
  const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  return age >= 0 ? age : null;
};

/** "1995-03-12" → "12/03/1995 (31 tuổi)" */
export const dobLabel = (dob: string | null | undefined) => {
  if (!dob) return DASH;
  const age = calcAge(dob);
  return `${formatDate(dob)}${age === null ? '' : ` (${age} tuổi)`}`;
};

/**
 * Nhãn/màu trạng thái lịch hẹn — cùng bảng với appointmenthistory / bookingmodal (UC007).
 * Giữ tại đây để UC012 không phụ thuộc file UC011; không sửa UC007 trừ khi sau này gom chung.
 */
export const APPT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

export const APPT_STATUS_COLOR: Record<AppointmentStatus, { color: string; bg: string }> = {
  PENDING: { color: '#b45309', bg: '#fef3c7' },
  CONFIRMED: { color: '#1d4ed8', bg: '#dbeafe' },
  COMPLETED: { color: '#15803d', bg: '#dcfce7' },
  REJECTED: { color: '#b91c1c', bg: '#fee2e2' },
  CANCELLED: { color: '#475569', bg: '#e2e8f0' },
};
