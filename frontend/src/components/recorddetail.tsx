// components/recorddetail.tsx — Hộp thoại chi tiết hồ sơ (API-12): chẩn đoán, lời dặn, đơn thuốc.
// Mở ra là hiện ngay phần đã có từ danh sách (bác sĩ, ngày khám, chẩn đoán), rồi tải ghi chú + đơn thuốc.
// 404 (hồ sơ không còn / không thuộc về bệnh nhân) -> báo lỗi, đóng hộp thoại thì danh sách tải lại.
import { useCallback, useEffect, useRef, useState } from 'react';
import SafeImage from './safeimage';
import { medicalRecordService } from '../services/medicalrecordservice';
import { ApiError } from '../services/apierror';
import { formatDate } from '../utils/helpers';
import { formatDateTimeVN } from '../utils/schedule';
import { recordStyles as s } from '../styles/records';
import type { Doctor } from '../types';
import type { MedicalRecord, MedicalRecordSummary } from '../types/medical';

interface RecordDetailProps {
  summary: MedicalRecordSummary;
  doctor?: Doctor;
  featured: boolean;
  onClose: () => void;
  onStale: () => void; // gọi khi đóng sau lỗi 404: danh sách trên màn hình đã cũ
}

const Item = ({ label, value }: { label: string; value: string }) => (
  <div style={s.sumItem}>
    <span style={s.sumLabel}>{label}</span>
    <span style={s.sumValue}>{value}</span>
  </div>
);

export default function RecordDetail({ summary, doctor, featured, onClose, onStale }: RecordDetailProps) {
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const stale = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    medicalRecordService
      .getRecord(summary.id)
      .then((r) => !cancelled && setRecord(r))
      .catch((err) => {
        if (cancelled) return;
        const apiErr = err instanceof ApiError ? err : null;
        if (apiErr?.status === 404) stale.current = true;
        setError(apiErr?.message || 'Không thể tải chi tiết hồ sơ, vui lòng thử lại sau.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [summary.id, retry]);

  const close = useCallback(() => {
    if (stale.current) onStale();
    onClose();
  }, [onClose, onStale]);

  // Esc để đóng, khóa cuộn trang nền khi mở
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  const prescriptions = record?.prescriptions ?? [];

  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Chi tiết hồ sơ bệnh án" style={s.dialog}>
        <div style={s.dialogHead}>
          <SafeImage
            src={doctor?.avatar_url ?? undefined}
            alt={summary.doctor.full_name}
            style={s.avatarImg}
            fallback={<div style={s.avatar}>👨‍⚕️</div>}
          />
          <div>
            <div style={s.badgeRow}>
              <span style={s.badge}>{summary.doctor.specialty}</span>
              {featured && <span style={s.featuredBadge}>⭐ Nổi bật</span>}
            </div>
            <h2 style={s.dialogTitle}>{summary.doctor.full_name}</h2>
          </div>
          <button type="button" onClick={close} aria-label="Đóng" style={s.close}>×</button>
        </div>

        <div style={s.dialogBody}>
          <div style={s.sumGrid}>
            <Item label="Ngày khám" value={formatDate(summary.appointment_date)} />
            <Item label="Lập hồ sơ lúc" value={record ? formatDateTimeVN(record.created_at) || '—' : '...'} />
          </div>

          <div>
            <h3 style={s.sectionTitle}>Chẩn đoán</h3>
            <div style={s.textBox}>{summary.diagnosis}</div>
          </div>

          {loading && <div style={s.emptyRx}>Đang tải chi tiết hồ sơ...</div>}

          {!loading && error && (
            <div role="alert" style={s.errBox}>
              <div style={{ marginBottom: 10 }}>{error}</div>
              {!stale.current && (
                <button type="button" className="mh-btn" onClick={() => setRetry((n) => n + 1)} style={s.btnLine}>Thử lại</button>
              )}
            </div>
          )}

          {record && (
            <>
              <div>
                <h3 style={s.sectionTitle}>Ghi chú, lời dặn của bác sĩ</h3>
                <div style={s.textBox}>{record.notes?.trim() || 'Không có ghi chú.'}</div>
              </div>

              <div>
                <h3 style={s.sectionTitle}>Đơn thuốc</h3>
                {prescriptions.length === 0 ? (
                  <div style={s.emptyRx}>Lần khám này không kê đơn thuốc.</div>
                ) : (
                  <div style={s.tableWrap}>
                    <div style={{ ...s.tRow, ...s.tHead }}>
                      <span>Tên thuốc</span><span>Liều dùng</span><span>Tần suất</span><span>Số ngày</span><span>Hướng dẫn</span>
                    </div>
                    {prescriptions.map((p) => (
                      <div key={p.id} style={s.tRow}>
                        <span style={s.tName}>{p.medicine_name}</span>
                        <span>{p.dosage || '—'}</span>
                        <span>{p.frequency || '—'}</span>
                        <span>{p.duration_days ?? '—'}</span>
                        <span>{p.instructions?.trim() || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div style={s.dialogActions}>
            <button type="button" className="mh-btn" onClick={close} style={s.btnLine}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}