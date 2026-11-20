// utils/useadminrecord.ts
// UC011 (Admin): tải hồ sơ bệnh án đã ghi của 1 lịch hẹn Hoàn tất để XEM (API-30, đề xuất). Chỉ đọc, không có hàm sửa.
import { useCallback, useEffect, useState } from 'react';
import { adminAppointmentService } from '../services/adminappointmentservice';
import { ApiError } from '../services/apierror';
import type { MedicalRecord } from '../types/medical';

const LOAD_ERROR = 'Không thể tải hồ sơ bệnh án, vui lòng thử lại sau.';

export function useAdminRecord(appointmentId: string) {
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false); // 404: lịch không có hồ sơ (không thử lại được)
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setNotFound(false);
    adminAppointmentService
      .getMedicalRecord(appointmentId)
      .then((r) => !cancelled && setRecord(r))
      .catch((err) => {
        if (cancelled) return;
        const apiErr = err instanceof ApiError ? err : null;
        setNotFound(apiErr?.status === 404);
        setError(apiErr?.message || LOAD_ERROR);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [appointmentId, retry]);

  const reload = useCallback(() => setRetry((n) => n + 1), []);

  return { record, loading, error, notFound, reload };
}