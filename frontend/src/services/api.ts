// services/api.ts
// Axios instance dùng chung (CHỈ dùng khi gọi BE thật; mock không đi qua đây).
// Các service (authService, doctorService, clinicApi...) import "api" này.

import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { ApiError, GENERIC_ERROR } from './apierror';
import { getToken, handleUnauthorized } from './session';

const api = axios.create({
  baseURL: env.API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Tự động gắn token vào header nếu đã đăng nhập
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Chuẩn hóa mọi lỗi thành ApiError + xử lý 401 chung (xóa token, báo cho App)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string; field?: string }>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;

    if (status === 401) handleUnauthorized();

    const fallback =
      status === 0 ? 'Không kết nối được tới máy chủ, vui lòng kiểm tra mạng và thử lại' : GENERIC_ERROR;

    return Promise.reject(new ApiError(status, body?.message || fallback, body?.code, body?.field));
  }
);

export default api;
