// services/authService.ts
// API-01..04. Trang chỉ gọi authService, không biết đang dùng mock hay BE thật.
// Chuyển chế độ bằng VITE_USE_MOCK (xem config/env.ts).

import { env } from '../config/env';
import { ApiError } from './apierror';
import api from './api';
import { clearSession, handleUnauthorized, saveSession, saveUser } from './session';
import type { AuthUser, LoginResult, RegisterPayload, RegisterResult } from '../types';

const loadMock = () => import('./mocks/mockauth');

export const authService = {
  // API-02. Thành công thì tự lưu token + userInfo vào localStorage.
  async login(email: string, password: string): Promise<LoginResult> {
    let result: LoginResult;
    if (env.USE_MOCK) {
      result = await (await loadMock()).mockLogin(email, password);
    } else {
      const res = await api.post('/auth/login', { email, password });
      result = { message: res.data?.message, token: res.data?.token, user: res.data?.user };
    }
    saveSession(result.token, result.user);
    return result;
  },

  // API-01. Phải gửi đủ username + confirmPassword.
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    if (env.USE_MOCK) return (await loadMock()).mockRegister(payload);
    const res = await api.post('/auth/register', payload);
    return { message: res.data?.message, user: res.data?.user };
  },

  // API-03. 401 -> xóa phiên (api.ts lo với BE thật, ở đây lo với mock).
  async getMe(): Promise<AuthUser> {
    let user: AuthUser;
    if (env.USE_MOCK) {
      try {
        user = await (await loadMock()).mockGetMe();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) handleUnauthorized();
        throw err;
      }
    } else {
      const res = await api.get('/auth/me');
      user = res.data?.user;
    }
    saveUser(user);
    return user;
  },

  // API-04. Dù BE lỗi/mất mạng vẫn xóa phiên ở client, không ném lỗi.
  async logout(): Promise<void> {
    try {
      if (env.USE_MOCK) await (await loadMock()).mockLogout();
      else await api.post('/auth/logout');
    } catch (err) {
      console.error('Đăng xuất phía máy chủ thất bại', err);
    } finally {
      clearSession();
    }
  },
};
