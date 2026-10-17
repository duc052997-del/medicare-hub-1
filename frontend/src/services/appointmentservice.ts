// services/appointmentservice.ts
// API-09 (đặt lịch), API-10 (lịch sử đặt lịch của tôi), API-22 (hủy lịch hẹn).
// Trang chỉ gọi appointmentService, không biết đang dùng mock hay BE thật (VITE_USE_MOCK).
// Sprint 5 sẽ thêm xem chi tiết/đổi lịch (API-20, API-21) vào chính file này.

import { env } from '../config/env';
import api from './api';
import type { Appointment, AppointmentStatus, BookingPayload, BookingResult, CancelResult } from '../types';
const loadMock = () => import('./mocks/mockappointments');

export const appointmentService = {
  // API-09 POST /appointments  (Patient). Thành công -> status PENDING
  async book(payload: BookingPayload): Promise<BookingResult> {
    if (env.USE_MOCK) return (await loadMock()).mockBook(payload);
    const res = await api.post('/appointments', payload);
    return { message: res.data?.message ?? '', appointment: res.data?.appointment };
  },

  // API-10 GET /appointments/my  (Patient). status tùy chọn; chưa có lịch -> 200 với mảng rỗng
  // Response hợp đồng: { success, message, appointments: [...] }
  async getMyAppointments(status?: AppointmentStatus): Promise<Appointment[]> {
    if (env.USE_MOCK) return (await loadMock()).mockGetMy(status);
    const res = await api.get('/appointments/my', { params: status ? { status } : {} });
    return res.data?.appointments ?? [];
  },
 
  // API-22 PATCH /appointments/:id/cancel  (Patient). reason tùy chọn, <= 255 ký tự.
  // Thành công -> appointment với status CANCELLED, cancel_reason, cancelled_at
  async cancel(id: string, reason?: string): Promise<CancelResult> {
    const body = reason && reason.trim() ? { reason: reason.trim() } : {};
    if (env.USE_MOCK) return (await loadMock()).mockCancel(id, reason);
    const res = await api.patch(`/appointments/${id}/cancel`, body);
    return { message: res.data?.message ?? '', appointment: res.data?.appointment };
  },
};