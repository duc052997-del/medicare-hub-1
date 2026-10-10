// services/api.ts
// File chứa code gọi API từ backend gửi sang. Các service khác (authService, patientService...)
// nên import instance "api" này để dùng chung base URL + token.

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động gắn token vào header nếu đã đăng nhập
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
