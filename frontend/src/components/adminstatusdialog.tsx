// components/adminstatusdialog.tsx — UC011 (Admin): hộp thoại xác nhận / từ chối / hủy 1 lịch hẹn (API-26).
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, GENERIC_ERROR } from '../services/apierror';
import { formatDate } from '../utils/helpers';
import { ACTION_META, MAX_REASON } from '../utils/adminappointment';
import { adminActionStyles as s } from '../styles/adminappointments';
import type { AdminAppointment, AdminStatusAction } from '../types/adminappointment';

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div style={s.sumRow}>
    <span style={s.sumLabel}>{label}</span>
    <span style={s.sumValue}>{value}</span>
  </div>
);

interface AdminStatusDialogProps {
  appointment: AdminAppointment;
  action: AdminStatusAction;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>; // ném ApiError nếu thất bại; thành công thì nơi gọi đóng hộp thoại
  onStale: () => void; // gọi khi đóng sau lỗi "lịch đã đổi": danh sách trên màn hình đã cũ
}

export default function AdminStatusDialog({ appointment: a, action, onClose, onSubmit, onStale }: AdminStatusDialogProps) {
  const meta = ACTION_META[action];
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);

  const close = useCallback(() => {
    if (submitting) return;
    if (stale) onStale();
    onClose();
  }, [submitting, stale, onStale, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const confirm = async () => {
    if (reason.length > MAX_REASON) {
      setError(`Lý do tối đa ${MAX_REASON} ký tự`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(reason.trim());
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setError(apiErr?.message || GENERIC_ERROR);
      if (apiErr?.status === 404 || apiErr?.code === 'INVALID_STATUS_TRANSITION') setStale(true);
      setSubmitting(false);
    }
  };

  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label={meta.title} style={s.dialog}>
        <h2 style={s.dialogTitle}>{meta.title}</h2>
        <p style={s.dialogText}>{meta.question}</p>

        <div style={s.summary}>
          <Row label="Bệnh nhân" value={<b>{a.patient.full_name || 'Chưa cập nhật họ tên'}</b>} />
          <Row label="Bác sĩ" value={`${a.doctor.full_name} (${a.doctor.specialty})`} />
          <Row label="Ngày khám" value={formatDate(a.appointment_date)} />
          <Row label="Giờ khám" value={`${a.start_time} - ${a.end_time}`} />
        </div>
        <p style={s.dialogHint}>{meta.hint}</p>

        {meta.reasonLabel && !stale && (
          <>
            <label style={s.label}>{meta.reasonLabel}</label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder={meta.reasonPlaceholder}
              rows={3}
              disabled={submitting}
              style={s.textarea}
            />
            <div style={s.counter}>{reason.length}/{MAX_REASON} ký tự</div>
          </>
        )}

        {error && <div role="alert" style={{ ...s.notice, ...s.noticeError, marginTop: 10, marginBottom: 0 }}>{error}</div>}

        <div style={s.dialogActions}>
          <button type="button" className="mh-btn" onClick={close} disabled={submitting} style={s.btnLine}>
            {stale ? 'Đóng' : 'Quay lại'}
          </button>
          {!stale && (
            <button
              type="button"
              className="mh-btn"
              onClick={confirm}
              disabled={submitting}
              style={{ ...(meta.danger ? s.btnDanger : s.btnPrimary), opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? meta.busyText : meta.submitText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}