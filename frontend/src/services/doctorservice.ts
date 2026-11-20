// services/doctorService.ts
// API-06 (featured), API-07 (danh sách), API-08 (lịch trống).

import { env } from '../config/env';
import api from './api';
import type { Doctor, ScheduleResult } from '../types';

const loadMock = () => import('./mocks/mockdoctors');

export const doctorService = {
  async getFeatured(): Promise<Doctor[]> {
    if (env.USE_MOCK) return (await loadMock()).mockGetFeatured();
    const res = await api.get('/doctors/featured');
    return res.data?.doctors ?? [];
  },

  async getDoctors(specialty?: string): Promise<Doctor[]> {
    if (env.USE_MOCK) return (await loadMock()).mockGetDoctors(specialty);
    const res = await api.get('/doctors', { params: specialty ? { specialty } : {} });
    return res.data?.doctors ?? [];
  },

  // date: YYYY-MM-DD; bỏ trống = hôm nay (giờ VN)
  async getSchedule(doctorId: string | number, date?: string): Promise<ScheduleResult> {
    if (env.USE_MOCK) return (await loadMock()).mockGetSchedule(doctorId, date);
    const res = await api.get(`/doctors/${doctorId}/schedule`, { params: date ? { date } : {} });
    return {
      doctor: res.data?.doctor,
      date: res.data?.date,
      slots: res.data?.slots ?? [],
    };
  },
};
