// config/env.ts
// Gom mọi biến môi trường của FE về 1 chỗ. Các file khác KHÔNG đọc import.meta.env trực tiếp.

const toBool = (value: unknown) => String(value ?? '').trim().toLowerCase() === 'true';

export const env = {
  // URL backend, đã gồm /api (khớp mục "Base URL" trong hợp đồng API)
  API_URL: (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000/api',

  // true = dùng dữ liệu giả trong services/mocks, không gọi backend
  USE_MOCK: toBool(import.meta.env.VITE_USE_MOCK),
} as const;