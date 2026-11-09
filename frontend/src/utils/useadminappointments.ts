// utils/useadminappointments.ts
// UC011 (Admin): trạng thái dữ liệu của màn hình quản lý lịch hẹn (tải danh sách lịch + danh sách bác sĩ cho bộ lọc).
// Component chỉ việc hiển thị. changeStatus (API-26) cập nhật đúng 1 dòng trong danh sách, không tải lại cả danh sách.
// completeAppointment (API-27) lưu hồ sơ bệnh án rồi đưa đúng dòng đó sang Hoàn tất.
import { useCallback, useEffect, useState } from 'react';
import { adminAppointmentService } from '../services/adminappointmentservice';
import { doctorService } from '../services/doctorservice';
import { ApiError } from '../services/apierror';
import type { Doctor } from '../types';
import type { AdminAppointment, AdminStatusAction, CompletePayload } from '../types/adminappointment';

const LOAD_ERROR = 'Không thể tải danh sách lịch hẹn, vui lòng thử lại sau.';

export function useAdminAppointments(enabled: boolean, userId?: string | number) {
  const [list, setList] = useState<AdminAppointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  // true từ đầu để tránh nháy "chưa có lịch" trước khi API trả về
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  // Danh sách lịch hẹn (API-25). Đổi tài khoản / bấm "Thử lại" thì tải lại.
  useEffect(() => {
    if (!enabled) {
      setList([]);
      setError('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    adminAppointmentService
      .getAll()
      .then((data) => !cancelled && setList(data))
      .catch((err) => {
        if (cancelled) return;
        setList([]);
        setError(err instanceof ApiError && err.message ? err.message : LOAD_ERROR);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, retry]);

  // Danh sách bác sĩ (API-07) cho ô lọc; lỗi thì bỏ qua, ô lọc chỉ còn "Tất cả bác sĩ"
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    doctorService
      .getDoctors()
      .then((d) => !cancelled && setDoctors(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const reload = useCallback(() => setRetry((n) => n + 1), []);

  // API-26: đổi trạng thái 1 lịch. Thành công -> thay đúng dòng đó bằng dữ liệu server trả về, trả về message.
  // Lỗi thì ném ApiError cho nơi gọi (hộp thoại) hiển thị. Giữ lại thông tin bệnh nhân nếu BE không trả kèm.
  const changeStatus = useCallback(async (id: string, status: AdminStatusAction, reason?: string) => {
    const result = await adminAppointmentService.updateStatus(id, status, reason);
    setList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...result.appointment, patient: result.appointment?.patient ?? a.patient } : a))
    );
    return result.message;
  }, []);

  // API-27: hoàn tất lịch + lưu hồ sơ bệnh án. Response chỉ có "record" (không có appointment) nên FE tự đưa dòng sang COMPLETED.
  const completeAppointment = useCallback(async (id: string, payload: CompletePayload) => {
    const result = await adminAppointmentService.complete(id, payload);
    setList((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'COMPLETED', cancel_reason: null, cancelled_at: null } : a)));
    return result.message;
  }, []);

  return { list, doctors, loading, error, reload, changeStatus, completeAppointment };
}