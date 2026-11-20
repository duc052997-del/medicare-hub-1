// utils/usedoctordirectory.ts
// Lấy thông tin giới thiệu bác sĩ (ảnh, mô tả, nổi bật) từ API-07 + API-06, ghép theo id.
// Lỗi thì bỏ qua: thẻ vẫn hiện tên + chuyên khoa từ dữ liệu chính.
import { useEffect, useState } from 'react';
import { doctorService } from '../services/doctorservice';
import type { Doctor } from '../types';

export function useDoctorDirectory(enabled: boolean) {
  const [doctorMap, setDoctorMap] = useState<Record<string, Doctor>>({});
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([
      doctorService.getDoctors().catch(() => [] as Doctor[]),
      doctorService.getFeatured().catch(() => [] as Doctor[]),
    ]).then(([all, featured]) => {
      if (cancelled) return;
      setDoctorMap(Object.fromEntries([...all, ...featured].map((d) => [String(d.id), d])));
      setFeaturedIds(new Set(featured.map((d) => String(d.id))));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { doctorMap, featuredIds };
}