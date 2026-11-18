// services/admindoctorservice.ts — UC010 Admin quản lý bác sĩ (API-15 … API-19).
// Tách khỏi doctorService (API-06/07/08 trang công khai).

import { env } from '../config/env';
import api from './api';
import type { AdminDoctor, AdminDoctorListParams, AdminDoctorPayload } from '../types/admindoctor';

const loadMock = () => import('./mocks/mockadmindoctors');

export const adminDoctorService = {
  /** API-15 GET /admin/doctors */
  async list(params: AdminDoctorListParams = {}): Promise<AdminDoctor[]> {
    if (env.USE_MOCK) return (await loadMock()).mockList(params);
    const res = await api.get('/admin/doctors', {
      params: {
        ...(params.q?.trim() ? { q: params.q.trim() } : {}),
        ...(params.include_inactive ? { include_inactive: 'true' } : {}),
      },
    });
    return res.data?.doctors ?? [];
  },

  /** API-16 GET /admin/doctors/:id */
  async detail(id: string): Promise<AdminDoctor> {
    if (env.USE_MOCK) return (await loadMock()).mockDetail(id);
    const res = await api.get(`/admin/doctors/${id}`);
    return res.data.doctor;
  },

  /** API-17 POST /admin/doctors */
  async create(payload: AdminDoctorPayload): Promise<{ message: string; doctor: AdminDoctor }> {
    if (env.USE_MOCK) return (await loadMock()).mockCreate(payload);
    const res = await api.post('/admin/doctors', payload);
    return { message: res.data?.message || 'Thêm bác sĩ thành công', doctor: res.data.doctor };
  },

  /** API-18 PUT /admin/doctors/:id */
  async update(id: string, payload: AdminDoctorPayload): Promise<{ message: string; doctor: AdminDoctor }> {
    if (env.USE_MOCK) return (await loadMock()).mockUpdate(id, payload);
    const res = await api.put(`/admin/doctors/${id}`, payload);
    return { message: res.data?.message || 'Cập nhật bác sĩ thành công', doctor: res.data.doctor };
  },

  /** API-19: ngừng hoạt động bác sĩ (soft delete). SRS v8: không có xóa vĩnh viễn. */
  async remove(id: string): Promise<{ message: string }> {
    if (env.USE_MOCK) return (await loadMock()).mockRemove(id);
    const res = await api.delete(`/admin/doctors/${id}`);
    return { message: res.data?.message || 'Xóa bác sĩ thành công' };
  },

  /** Bật lại bác sĩ đã ngừng (mock: is_active=true; BE: cập nhật nếu hỗ trợ) */
  async reactivate(id: string): Promise<{ message: string; doctor?: AdminDoctor }> {
    if (env.USE_MOCK) return (await loadMock()).mockReactivate(id);
    // Thử endpoint mở rộng; fallback thông báo nếu BE chưa có
    try {
      const res = await api.post(`/admin/doctors/${id}/reactivate`);
      return { message: res.data?.message || 'Đã kích hoạt lại bác sĩ', doctor: res.data?.doctor };
    } catch {
      const res = await api.patch(`/admin/doctors/${id}`, { is_active: true });
      return { message: res.data?.message || 'Đã kích hoạt lại bác sĩ', doctor: res.data?.doctor };
    }
  },
};
