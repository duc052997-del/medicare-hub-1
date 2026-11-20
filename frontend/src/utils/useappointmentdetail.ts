// utils/useappointmentdetail.ts
// UC011 (bệnh nhân): tải chi tiết 1 lịch hẹn (API-20). Component chỉ việc hiển thị.
// reload() gọi lại sau khi đổi lịch / hủy để lấy lại trạng thái và cờ can_cancel, can_reschedule mới nhất từ BE.
import { useCallback, useEffect, useState } from 'react';
import { appointmentService } from '../services/appointmentservice';
import { ApiError } from '../services/apierror';
import type { AppointmentDetail } from '../types/appointmentdetail';

const LOAD_ERROR = 'Không thể tải chi tiết lịch hẹn, vui lòng thử lại sau.';

export function useAppointmentDetail(id: string) {
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false); // 404: lịch không còn / không thuộc về bệnh nhân
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    appointmentService
      .getDetail(id)
      .then((d) => !cancelled && setDetail(d))
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
  }, [id, retry]);

  const reload = useCallback(() => setRetry((n) => n + 1), []);

  return { detail, loading, error, notFound, reload };
}