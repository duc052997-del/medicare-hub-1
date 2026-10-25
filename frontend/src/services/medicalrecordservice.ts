// services/medicalrecordservice.ts
// API-11 GET /medical-records       : danh sách hồ sơ bệnh án của CHÍNH bệnh nhân đăng nhập.
// API-12 GET /medical-records/:id   : chi tiết 1 hồ sơ (kèm ghi chú + đơn thuốc).
// Trang chỉ gọi medicalRecordService, không biết đang dùng mock hay BE thật (VITE_USE_MOCK).

import { env } from '../config/env';
import { ApiError } from './apierror';
import api from './api';
import type { MedicalRecord, MedicalRecordSummary } from '../types/medical';

const loadMock = () => import('./mocks/mockrecords');

export const medicalRecordService = {
  // Patient. Chưa có hồ sơ -> 200 với "records": []. Response: { success, message, records: [...] }
  async getMyRecords(): Promise<MedicalRecordSummary[]> {
    if (env.USE_MOCK) return (await loadMock()).mockGetMyRecords();
    const res = await api.get('/medical-records');
    return res.data?.records ?? [];
  },

  // Patient. Hồ sơ không tồn tại HOẶC của bệnh nhân khác -> 404 "Không tìm thấy hồ sơ bệnh án".
  // Response: { success, message, record: {...} }
  async getRecord(id: string): Promise<MedicalRecord> {
    if (env.USE_MOCK) return (await loadMock()).mockGetRecord(id);
    const res = await api.get(`/medical-records/${id}`);
    const record: MedicalRecord | undefined = res.data?.record;
    if (!record) throw new ApiError(404, 'Không tìm thấy hồ sơ bệnh án');
    return { ...record, prescriptions: record.prescriptions ?? [] };
  },
};