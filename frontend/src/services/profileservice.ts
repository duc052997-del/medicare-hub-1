// services/profileservice.ts
// UC009 / API-13, API-14: GET|PUT /api/auth/profile (Patient + Admin).
// Trang chỉ gọi profileService; mock hoặc BE thật theo VITE_USE_MOCK.

import { env } from '../config/env';
import api from './api';
import type { ProfilePayload, ProfileResult, UserProfile } from '../types/profile';

const loadMock = () => import('./mocks/mockprofile');

// BE GET trả "profile"; PUT trả "patient" (hợp đồng API-14 + patient.controller.js)
const pickProfile = (data: { profile?: UserProfile; patient?: UserProfile } | null | undefined): UserProfile => {
  const p = data?.profile ?? data?.patient;
  if (!p) throw new Error('Phản hồi hồ sơ không hợp lệ');
  return p;
};

export const profileService = {
  // API-13 GET /api/auth/profile
  async getProfile(): Promise<UserProfile> {
    if (env.USE_MOCK) return (await loadMock()).mockGetProfile();
    const res = await api.get('/auth/profile');
    return pickProfile(res.data);
  },

  // API-14 PUT /api/auth/profile
  async update(payload: ProfilePayload): Promise<ProfileResult> {
    if (env.USE_MOCK) return (await loadMock()).mockUpdateProfile(payload);
    const res = await api.put('/auth/profile', payload);
    return {
      message: res.data?.message ?? '',
      profile: pickProfile(res.data),
    };
  },
};
