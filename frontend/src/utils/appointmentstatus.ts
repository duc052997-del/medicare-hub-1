// utils/appointmentstatus.ts
// Nhãn + màu trạng thái lịch hẹn dùng chung cho màn hình chi tiết của bệnh nhân và màn hình quản lý của Admin.
import type { AppointmentStatus } from '../types';

export const STATUS_ORDER: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

export const STATUS_COLOR: Record<AppointmentStatus, { color: string; bg: string }> = {
  PENDING: { color: '#b45309', bg: '#fef3c7' },
  CONFIRMED: { color: '#1d4ed8', bg: '#dbeafe' },
  COMPLETED: { color: '#15803d', bg: '#dcfce7' },
  REJECTED: { color: '#b91c1c', bg: '#fee2e2' },
  CANCELLED: { color: '#475569', bg: '#e2e8f0' },
};