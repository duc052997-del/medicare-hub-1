// services/clinicApi.ts
// API-05  GET /api/home. 404 = "chưa có dữ liệu" (hợp lệ) -> trả null, không phải lỗi.

import { env } from '../config/env';
import { ApiError } from './apierror';
import api from './api';
import type { ClinicInfo } from '../types';

export const clinicApi = {
  async getClinic(): Promise<ClinicInfo | null> {
    try {
      if (env.USE_MOCK) return await (await import('./mocks/mockclinic')).mockGetClinic();
      const res = await api.get('/home');
      return (res.data?.clinic as ClinicInfo) ?? null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
};
