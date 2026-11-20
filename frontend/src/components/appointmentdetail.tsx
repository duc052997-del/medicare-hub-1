// components/appointmentdetail.tsx — UC011 (bệnh nhân): hộp thoại CHI TIẾT 1 lịch hẹn (API-20).
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AppointmentReschedule from './appointmentreschedule';
import { appointmentService } from '../services/appointmentservice';
import { ApiError, GENERIC_ERROR } from '../services/apierror';
import { useAppointmentDetail } from '../utils/useappointmentdetail';
import { formatDate } from '../utils/helpers';
import { formatDateTimeVN } from '../utils/schedule';
import { STATUS_COLOR, STATUS_LABEL } from '../utils/appointmentstatus';
import { CANCEL_STALE_CODES, getActionHints } from '../utils/appointmentrules';
import { detailStyles as s } from '../styles/appointmentdetail';
import type { Appointment } from '../types';

const MAX_REASON = 255;

type Mode = 'view' | 'reschedule' | 'cancel';
type Notice = { kind: 'success' | 'error'; text: string } | null;

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div style={s.sumRow}>
    <span style={s.sumLabel}>{label}</span>
    <span style={s.sumValue}>{value}</span>
  </div>
);

interface AppointmentDetailDialogProps {
  id: string;
  onClose: () => void;
  onChanged: (updated: Appointment) => void; // đổi lịch / hủy xong -> danh sách bên ngoài cập nhật đúng dòng đó
  onStale: () => void; // đóng sau khi phát hiện lịch đã đổi ở nơi khác -> danh sách bên ngoài tải lại
}

export default function AppointmentDetailDialog({ id, onClose, onChanged, onStale }: AppointmentDetailDialogProps) {
  const { detail, loading, error, notFound, reload } = useAppointmentDetail(id);
  const [mode, setMode] = useState<Mode>('view');
  const [notice, setNotice] = useState<Notice>(null);
  const [staleFlag, setStaleFlag] = useState(false);

  // Hủy lịch
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const stale = staleFlag || notFound;
  const close = useCallback(() => {
    if (cancelling) return;
    if (stale) onStale();
    onClose();
  }, [cancelling, stale, onStale, onClose]);

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

  const confirmCancel = async () => {
    if (!detail) return;
    if (reason.length > MAX_REASON) {
      setCancelError(`Lý do hủy tối đa ${MAX_REASON} ký tự`);
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      const result = await appointmentService.cancel(detail.id, reason);
      onChanged(result.appointment);
      setNotice({ kind: 'success', text: result.message || 'Hủy lịch hẹn thành công' });
      setMode('view');
      setReason('');
      reload();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setCancelError(apiErr?.message || GENERIC_ERROR);
      if ((apiErr?.code && CANCEL_STALE_CODES.includes(apiErr.code)) || apiErr?.status === 404) setStaleFlag(true);
    } finally {
      setCancelling(false);
    }
  };

  const c = detail ? STATUS_COLOR[detail.status] : null;
  const hints = detail ? getActionHints(detail) : [];

  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && mode === 'view' && close()}>
      <div role="dialog" aria-modal="true" aria-label="Chi tiết lịch hẹn" style={s.dialog}>
        <div style={s.head}>
          <h2 style={s.title}>Chi tiết lịch hẹn</h2>
          {detail && c && <span style={{ ...s.statusBadge, color: c.color, backgroundColor: c.bg }}>{STATUS_LABEL[detail.status]}</span>}
          <button type="button" onClick={close} aria-label="Đóng" style={s.close}>×</button>
        </div>

        <div style={s.body}>
          {loading && !detail && <div style={s.note}>Đang tải chi tiết lịch hẹn...</div>}

          {!loading && error && !detail && (
            <div role="alert" style={{ ...s.notice, ...s.noticeError, textAlign: 'center' }}>
              <div style={{ marginBottom: 10 }}>{error}</div>
              {!notFound && <button type="button" className="mh-btn" onClick={reload} style={s.btnLine}>Thử lại</button>}
            </div>
          )}

          {detail && (
            <>
              {notice && <div role="alert" style={{ ...s.notice, ...(notice.kind === 'success' ? s.noticeOk : s.noticeError) }}>{notice.text}</div>}

              {mode === 'view' && (
                <>
                  <div style={s.summary}>
                    <Row label="Bác sĩ" value={<b>{detail.doctor.full_name}</b>} />
                    <Row label="Chuyên khoa" value={detail.doctor.specialty} />
                    <Row label="Ngày khám" value={formatDate(detail.appointment_date)} />
                    <Row label="Giờ khám" value={`${detail.start_time} - ${detail.end_time}`} />
                    <Row label="Triệu chứng" value={detail.symptoms || 'Không có'} />
                    {(detail.status === 'CANCELLED' || detail.status === 'REJECTED') && (
                      <Row label={detail.status === 'REJECTED' ? 'Lý do từ chối' : 'Lý do hủy'} value={detail.cancel_reason || 'Không nêu lý do'} />
                    )}
                    <Row label="Đặt lúc" value={formatDateTimeVN(detail.created_at)} />
                    {detail.status === 'CANCELLED' && detail.cancelled_at && <Row label="Hủy lúc" value={formatDateTimeVN(detail.cancelled_at)} />}
                  </div>

                  {hints.map((h) => <div key={h} style={s.hint}>{h}</div>)}

                  <div style={s.actions}>
                    {detail.can_cancel && (
                      <button type="button" className="mh-btn" onClick={() => { setNotice(null); setCancelError(''); setMode('cancel'); }} style={s.btnDangerLine}>Hủy lịch</button>
                    )}
                    {detail.can_reschedule && (
                      <button type="button" className="mh-btn" onClick={() => { setNotice(null); setMode('reschedule'); }} style={s.btnPrimary}>Đổi lịch</button>
                    )}
                    <button type="button" className="mh-btn" onClick={close} style={s.btnLine}>Đóng</button>
                  </div>
                </>
              )}

              {mode === 'reschedule' && (
                <AppointmentReschedule
                  appointment={detail}
                  onBack={() => (stale ? close() : setMode('view'))}
                  onStale={() => setStaleFlag(true)}
                  onDone={(updated, message) => {
                    onChanged(updated);
                    setNotice({ kind: 'success', text: message });
                    setMode('view');
                    reload();
                  }}
                />
              )}

              {mode === 'cancel' && (
                <>
                  <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                    Bạn có chắc chắn muốn hủy lịch khám với <b>{detail.doctor.full_name}</b> vào{' '}
                    <b>{detail.start_time} ngày {formatDate(detail.appointment_date)}</b>? Lịch đã hủy không thể khôi phục.
                  </p>
                  <div style={s.group}>
                    <label style={s.label}>Lý do hủy (không bắt buộc)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => { setReason(e.target.value); setCancelError(''); }}
                      placeholder="Ví dụ: Bận việc đột xuất"
                      rows={3}
                      disabled={cancelling || staleFlag}
                      style={{ ...s.input, resize: 'vertical' }}
                    />
                    <span style={s.counter}>{reason.length}/{MAX_REASON} ký tự</span>
                  </div>
                  {cancelError && <div role="alert" style={{ ...s.notice, ...s.noticeError }}>{cancelError}</div>}
                  <div style={s.actions}>
                    <button type="button" className="mh-btn" onClick={() => (staleFlag ? close() : setMode('view'))} disabled={cancelling} style={s.btnLine}>
                      {staleFlag ? 'Đóng' : 'Quay lại'}
                    </button>
                    {!staleFlag && (
                      <button type="button" className="mh-btn" onClick={confirmCancel} disabled={cancelling} style={{ ...s.btnDanger, opacity: cancelling ? 0.6 : 1 }}>
                        {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}