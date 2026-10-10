// services/session.ts
// Nơi DUY NHẤT đọc/ghi token và thông tin đăng nhập trong localStorage.

import type { AuthUser } from '../types';

const TOKEN_KEY = 'token';
const USER_KEY = 'userInfo';

// App.tsx lắng nghe sự kiện này để đưa người dùng về trạng thái chưa đăng nhập
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const saveSession = (token: string, user: AuthUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const saveUser = (user: AuthUser) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Gọi khi BE (hoặc mock) trả 401 trên 1 phiên đang đăng nhập
export const handleUnauthorized = () => {
  if (!getToken()) return;
  clearSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
};
