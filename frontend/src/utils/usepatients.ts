// utils/usepatients.ts
// UC012: trạng thái + hành động của danh sách bệnh nhân (tải, tìm kiếm có trễ, thử lại).
// Component chỉ việc hiển thị. Tìm kiếm gọi API-28 với ?q= (SRS bước 5: hệ thống cập nhật danh sách theo điều kiện tìm).
import { useCallback, useEffect, useState } from 'react';
import { patientService } from '../services/patientservice';
import { ApiError } from '../services/apierror';
import type { PatientSummary } from '../types/patient';

const SEARCH_DELAY_MS = 350; // chờ người dùng gõ xong mới gọi API
const LOAD_ERROR = 'Lỗi tải dữ liệu, vui lòng thử lại sau.'; // SRS: màn hình "Lỗi tải dữ liệu"

export function usePatients(enabled: boolean) {
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null); // tổng số bệnh nhân (lần tải không lọc gần nhất)
  const [loading, setLoading] = useState(true); // true từ đầu để tránh nháy "rỗng" trước khi API trả về
  const [loaded, setLoaded] = useState(false); // đã có ít nhất 1 lần tải thành công
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setList([]);
      setTotal(null);
      setLoaded(false);
      setError('');
      setLoading(false);
      return;
    }

    const q = keyword.trim();
    let cancelled = false;
    setLoading(true);
    setError('');

    const timer = setTimeout(
      () => {
        patientService
          .getPatients(q)
          .then((data) => {
            if (cancelled) return;
            setList(data);
            setLoaded(true);
            if (!q) setTotal(data.length);
          })
          .catch((err) => {
            if (cancelled) return;
            setError(err instanceof ApiError && err.message ? err.message : LOAD_ERROR);
          })
          .finally(() => !cancelled && setLoading(false));
      },
      q && loaded ? SEARCH_DELAY_MS : 0 // tải lần đầu / thử lại / xóa từ khóa thì gọi ngay
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // loaded cố ý không nằm trong deps: chỉ dùng để chọn độ trễ, không được kích hoạt tải lại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, keyword, retry]);

  const reload = useCallback(() => setRetry((n) => n + 1), []);
  const clearKeyword = useCallback(() => setKeyword(''), []);

  return { keyword, setKeyword, clearKeyword, list, total, loading, loaded, error, reload };
}
