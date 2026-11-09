// services/adminappointmentservice.ts
// UC011 phía Admin: API-25 (danh sách mọi lịch hẹn), API-26 (đổi trạng thái), API-27 (hoàn tất lịch + hồ sơ bệnh án),
// API-30 (xem lại hồ sơ đã ghi; ĐỀ XUẤT, chưa có trong hợp đồng, xem docs).
// Trang chỉ gọi adminAppointmentService, không biết đang dùng mock hay BE thật (VITE_USE_MOCK).

import { env } from '../config/env';
import { ApiError } from './apierror';
import api from './api';
import type {
  AdminAppointment, AdminAppointmentQuery, AdminStatusAction, AdminStatusResult, CompletePayload, CompleteResult,
} from '../types/adminappointment';
import type { MedicalRecord } from '../types/medical';

const loadMock = () => import('./mocks/mockadminappointments');

export const adminAppointmentService = {
  // API-25 GET /admin/appointments  (Admin). Query tùy chọn: status, date, doctor_id, q.
  // Không có lịch -> 200 với mảng rỗng. Response: { success, message, appointments: [...] }
  async getAll(query: AdminAppointmentQuery = {}): Promise<AdminAppointment[]> {
    if (env.USE_MOCK) return (await loadMock()).mockAdminGetAll(query);
    const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
    const res = await api.get('/admin/appointments', { params });
    return res.data?.appointments ?? [];
  },

  // API-26 PATCH /admin/appointments/:id/status  (Admin). Body: { status, reason? } (reason <= 255 ký tự).
  // Hợp lệ: PENDING -> CONFIRMED | REJECTED ; CONFIRMED -> CANCELLED. Sai -> 400 INVALID_STATUS_TRANSITION.
  async updateStatus(id: string, status: AdminStatusAction, reason?: string): Promise<AdminStatusResult> {
    if (env.USE_MOCK) return (await loadMock()).mockAdminUpdateStatus(id, status, reason);
    const body = reason && reason.trim() ? { status, reason: reason.trim() } : { status };
    const res = await api.patch(`/admin/appointments/${id}/status`, body);
    return { message: res.data?.message ?? '', appointment: res.data?.appointment };
  },

  // API-27 POST /admin/appointments/:id/medical-record  (Admin). Chỉ lịch CONFIRMED. 201 -> lịch thành COMPLETED.
  // Lỗi: 400 INVALID_STATUS_TRANSITION, 409 "Lịch hẹn này đã có hồ sơ bệnh án", 404. Response: { success, message, record }
  async complete(id: string, payload: CompletePayload): Promise<CompleteResult> {
    if (env.USE_MOCK) return (await loadMock()).mockAdminComplete(id, payload);
    const res = await api.post(`/admin/appointments/${id}/medical-record`, payload);
    return { message: res.data?.message ?? '', record: res.data?.record };
  },

  // API-30 GET /admin/appointments/:id/medical-record  (Admin)  *** ĐỀ XUẤT, chờ BE làm và nhóm Agreed ***
  // Xem lại hồ sơ đã ghi ở API-27 (chỉ đọc). Response như API-12: { success, message, record }.
  // Lịch không tồn tại hoặc chưa có hồ sơ -> 404 "Không tìm thấy hồ sơ bệnh án"; 401 / 403.
  async getMedicalRecord(id: string): Promise<MedicalRecord> {
    if (env.USE_MOCK) return (await loadMock()).mockAdminGetRecord(id);
    const res = await api.get(`/admin/appointments/${id}/medical-record`);
    const record: MedicalRecord | undefined = res.data?.record;
    if (!record) throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh án');
    return { ...record, prescriptions: record.prescriptions ?? [] };
  },
};