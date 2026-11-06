// services/appointmentservice.ts
// API-09 (đặt lịch), API-10 (lịch sử đặt lịch của tôi), API-20 (chi tiết), API-21 (đổi lịch), API-22 (hủy lịch hẹn).
// Trang chỉ gọi appointmentService, không biết đang dùng mock hay BE thật (VITE_USE_MOCK).
// API-20, API-21 (UC011 phía bệnh nhân) được thêm vào chính file này.

import { env } from '../config/env';
import { ApiError } from './apierror';
import api from './api';
import type { Appointment, AppointmentStatus, BookingPayload, BookingResult, CancelResult } from '../types';
import type { AppointmentDetail, ReschedulePayload, RescheduleResult } from '../types/appointmentdetail';
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

  // API-20 GET /appointments/:id  (Patient). Kèm can_cancel, can_reschedule do BE tính.
  // Lịch không tồn tại HOẶC của bệnh nhân khác -> 404 "Không tìm thấy lịch hẹn". Response: { success, message, appointment }
  async getDetail(id: string): Promise<AppointmentDetail> {
    if (env.USE_MOCK) return (await loadMock()).mockGetDetail(id);
    const res = await api.get(`/appointments/${id}`);
    const a = res.data?.appointment;
    if (!a) throw new ApiError(404, 'Không tìm thấy lịch hẹn');
    return { ...a, can_cancel: !!a.can_cancel, can_reschedule: !!a.can_reschedule };
  },

  // API-21 PATCH /appointments/:id/reschedule  (Patient). Body { date, time }; chỉ đổi giờ, giữ nguyên bác sĩ.
  // Lỗi: 400 "Ngày giờ không hợp lệ" / RESCHEDULE_NOT_ALLOWED, 409 SLOT_TAKEN, 404.
  async reschedule(id: string, payload: ReschedulePayload): Promise<RescheduleResult> {
    if (env.USE_MOCK) return (await loadMock()).mockReschedule(id, payload);
    const res = await api.patch(`/appointments/${id}/reschedule`, payload);
    return { message: res.data?.message ?? '', appointment: res.data?.appointment };
  },
};