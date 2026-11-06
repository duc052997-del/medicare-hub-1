// services/patientservice.ts
// UC012 (Admin). API-28 GET /admin/patients?q=  : danh sách + tìm kiếm theo tên / mã bệnh nhân / SĐT.
//                API-29 GET /admin/patients/:id : hồ sơ chi tiết (thông tin + lịch hẹn + hồ sơ bệnh án).
// Chỉ ĐỌC (SRS: Admin xem, không sửa). Trang chỉ gọi patientService, không biết đang dùng mock hay BE thật (VITE_USE_MOCK).

import { env } from '../config/env';
import { ApiError } from './apierror';
import api from './api';
import type { PatientDetail, PatientSummary } from '../types/patient';

const loadMock = () => import('./mocks/mockpatients');

export const patientService = {
  // Admin. Không khớp -> 200 với "patients": [] (không phải 404). Response: { success, message, patients: [...] }
  async getPatients(q?: string): Promise<PatientSummary[]> {
    const keyword = q?.trim();
    if (env.USE_MOCK) return (await loadMock()).mockGetPatients(keyword);
    const res = await api.get('/admin/patients', { params: keyword ? { q: keyword } : {} });
    const patients = res.data?.patients ?? [];
    return patients.map((p: PatientSummary) => ({ ...p, email: p.email ?? '' }));
  },

  // Admin. Không tồn tại -> 404 "Không tìm thấy bệnh nhân". Response: { success, message, patient: {...} }
  async getPatient(id: string): Promise<PatientDetail> {
    if (env.USE_MOCK) return (await loadMock()).mockGetPatient(id);
    const res = await api.get(`/admin/patients/${id}`);
    const patient: PatientDetail | undefined = res.data?.patient;
    if (!patient) throw new ApiError(404, 'Không tìm thấy bệnh nhân');
    return {
      ...patient,
      email: patient.email ?? '',
      appointments: (patient.appointments ?? []).map((a) => ({
        ...a,
        start_time: String(a.start_time || '').slice(0, 5),
        end_time: String(a.end_time || '').slice(0, 5),
      })),
      medical_records: (patient.medical_records ?? []).map((r) => ({
        ...r,
        appointment_date: r.appointment_date || '',
      })),
    };
  },
};
