// services/clinicservice.ts
// Gộp clinicapi.ts + clinicservice.ts cũ: API-05 GET /api/home và hook useClinicInfo
// cho Header, Footer, Home. Mock hoặc BE thật chọn theo env.USE_MOCK.

import { useEffect, useState } from 'react';
import { env } from '../config/env';
import { ApiError } from './apierror';
import api from './api';
import type { ClinicInfo } from '../types';

export type { ClinicInfo };

// 404 = "chưa có dữ liệu" (hợp lệ) -> trả null, không phải lỗi
const getClinic = async (): Promise<ClinicInfo | null> => {
  try {
    if (env.USE_MOCK) return await (await import('./mocks/mockclinic')).mockGetClinic();
    const res = await api.get('/home');
    return (res.data?.clinic as ClinicInfo) ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
};

// Cache 1 lần gọi: Header, Footer, Home cùng dùng hook mà chỉ gọi đúng 1 lần.
let cached: Promise<ClinicInfo | null> | null = null;

export const fetchClinicInfo = (): Promise<ClinicInfo | null> => {
  // Lỗi mạng/500 -> xóa cache để lần mount sau gọi lại
  cached ??= getClinic().catch(() => {
    cached = null;
    return null;
  });
  return cached;
};

export function useClinicInfo() {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchClinicInfo().then((c) => {
      if (cancelled) return;
      setClinic(c);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { clinic, loading };
}

// Đang tải -> "...", thiếu dữ liệu -> "đang cập nhật"
export const displayInfo = (value: string | null | undefined, loading: boolean) =>
  value && value.trim() ? value : loading ? '...' : 'đang cập nhật';