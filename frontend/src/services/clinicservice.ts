// services/clinicService.ts  [FILE MỚI]
// Lấy thông tin giới thiệu phòng khám từ backend: GET /api/home (UC004)
// Backend trả về: { success, message, clinic: { id, name, description, hotline, address, email } }
// Không có dữ liệu -> backend trả 404 -> FE coi là "chưa có thông tin" (null), KHÔNG phải lỗi.

import { useEffect, useState } from 'react';
import api from './api';

export interface ClinicInfo {
  id: string | number;
  name: string | null;
  description: string | null;
  hotline: string | null;
  address: string | null;
  email: string | null;
  working_hours?: string | null; 
  workingHours?: string | null;
}

// Cache 1 lần gọi: Header, Footer, Home cùng dùng hook mà chỉ gọi API đúng 1 lần.
let cached: Promise<ClinicInfo | null> | null = null;

export const fetchClinicInfo = (): Promise<ClinicInfo | null> => {
  if (!cached) {
    cached = api
      .get('/home')
      .then((res) => (res.data?.clinic as ClinicInfo) ?? null)
      .catch((err) => {
        // 404 = chưa có dữ liệu (hợp lệ) -> giữ cache null.
        // Lỗi khác (mạng, 500) -> xoá cache để lần mount sau gọi lại.
        if (err?.response?.status !== 404) cached = null;
        return null;
      });
  }
  return cached;
};

// Hook dùng trong component: { clinic, loading }
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
    return () => { cancelled = true; };
  }, []);

  return { clinic, loading };
}

// Giá trị hiển thị: đang tải -> "...", thiếu dữ liệu -> "đang cập nhật"
export const displayInfo = (value: string | null | undefined, loading: boolean) =>
  value && value.trim() ? value : loading ? '...' : 'đang cập nhật';