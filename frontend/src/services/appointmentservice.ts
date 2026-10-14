// services/appointmentservice.ts
// API-09 (đặt lịch), API-10 (lịch sử đặt lịch của tôi).
// Trang chỉ gọi appointmentService, không biết đang dùng mock hay BE thật (VITE_USE_MOCK).
// Sprint 5 sẽ thêm xem chi tiết/đổi lịch (API-20, API-21) vào chính file này.

import { env } from '../config/env';
import api from './api';
import type { BookingPayload, BookingResult } from '../types';
const loadMock = () => import('./mocks/mockappointments');

export const appointmentService = {
  // API-09 POST /appointments  (Patient). Thành công -> status PENDING
  async book(payload: BookingPayload): Promise<BookingResult> {
    if (env.USE_MOCK) return (await loadMock()).mockBook(payload);
    const res = await api.post('/appointments', payload);
    return { message: res.data?.message ?? '', appointment: res.data?.appointment };
  },

  // API-10 GET /appointments/my  (Patient). status tùy chọn; chưa có lịch -> 200 với mảng rỗng
  

  // API-22 PATCH /appointments/:id/cancel  (Patient). reason tùy chọn, <= 255 ký tự
}