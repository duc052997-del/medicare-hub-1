// components/patientdetail.tsx — UC012: hộp thoại hồ sơ chi tiết bệnh nhân (API-29), CHỈ XEM (SRS: không sửa).
// Mở ra là hiện ngay phần đã có từ danh sách (tên, mã, SĐT...), rồi tải thêm địa chỉ + lịch hẹn + hồ sơ bệnh án.
// 404 (bệnh nhân không còn) -> báo lỗi, đóng hộp thoại thì danh sách tải lại.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SafeImage from './safeimage';
import { patientService } from '../services/patientservice';
import { ApiError } from '../services/apierror';
import { formatDate } from '../utils/helpers';
import { formatDateTimeVN } from '../utils/schedule';
import { APPT_STATUS_COLOR, APPT_STATUS_LABEL, dobLabel, genderLabel, initialOf, orDash, patientName } from '../utils/patient';
import { patientStyles as s } from '../styles/patients';
import type { PatientDetail as PatientDetailData, PatientSummary } from '../types/patient';

interface PatientDetailProps {
  summary: PatientSummary;
  onClose: () => void;
  onStale: () => void; // gọi khi đóng sau lỗi 404: danh sách trên màn hình đã cũ
}

const Item = ({ label, value, wide }: { label: string; value: string; wide?: boolean }) => (
  <div style={{ ...s.sumItem, ...(wide ? s.sumItemWide : {}) }}>
    <span style={s.sumLabel}>{label}</span>
    <span style={s.sumValue}>{value}</span>
  </div>
);

export default function PatientDetail({ summary, onClose, onStale }: PatientDetailProps) {
  const [detail, setDetail] = useState<PatientDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const stale = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    patientService
      .getPatient(summary.id)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => {
        if (cancelled) return;
        const apiErr = err instanceof ApiError ? err : null;
        if (apiErr?.status === 404) stale.current = true;
        setError(apiErr?.message || 'Lỗi tải dữ liệu, vui lòng thử lại sau.');
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

  // Mới nhất lên trên (BE đã sắp xếp, sắp lại ở đây để không phụ thuộc thứ tự BE)
  const appointments = useMemo(
    () => [...(detail?.appointments ?? [])].sort((a, b) => `${b.appointment_date} ${b.start_time}`.localeCompare(`${a.appointment_date} ${a.start_time}`)),
    [detail]
  );
  const records = useMemo(
    () => [...(detail?.medical_records ?? [])].sort((a, b) => (b.appointment_date || '').localeCompare(a.appointment_date || '')),
    [detail]
  );

  // Thông tin cá nhân: ưu tiên bản chi tiết (mới nhất), chưa tải xong thì dùng bản từ danh sách
  const p = detail ?? summary;
  const hasName = !!p.full_name?.trim();

  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Hồ sơ chi tiết bệnh nhân" style={s.dialog}>
        <div style={s.dialogHead}>
          <SafeImage
            src={detail?.avatar_url ?? undefined}
            alt={patientName(p)}
            style={s.headAvatarImg}
            fallback={<div style={s.headAvatar}>{initialOf(p)}</div>}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ ...s.badgeRow, marginBottom: 4 }}>
              <span style={s.badgeCode}>{summary.patient_code}</span>
            </div>
            <h2 style={{ ...s.dialogTitle, ...(hasName ? {} : s.muted) }}>{hasName ? patientName(p) : 'Chưa cập nhật họ tên'}</h2>
          </div>
          <button type="button" onClick={close} aria-label="Đóng" style={s.close}>×</button>
        </div>

        <div style={s.dialogBody}>
          {/* Thông tin cá nhân */}
          <div>
            <h3 style={s.sectionTitle}>Thông tin cá nhân</h3>
            <div style={s.sumGrid}>
              <Item label="Mã bệnh nhân" value={summary.patient_code} />
              <Item label="Họ và tên" value={orDash(p.full_name)} />
              <Item label="Ngày sinh" value={dobLabel(p.date_of_birth)} />
              <Item label="Giới tính" value={genderLabel(p.gender)} />
              <Item label="Số điện thoại" value={orDash(p.phone)} />
              <Item label="Email" value={p.email} />
              <Item label="Địa chỉ" value={detail ? orDash(detail.address) : '...'} wide />
            </div>
          </div>

          {loading && <div style={s.emptyBox}>Đang tải lịch hẹn và hồ sơ bệnh án...</div>}

          {!loading && error && (
            <div role="alert" style={s.errBox}>
              <div style={{ marginBottom: stale.current ? 0 : 10 }}>{error}</div>
              {!stale.current && (
                <button type="button" className="mh-btn" onClick={() => setRetry((n) => n + 1)} style={s.btnLine}>Thử lại</button>
              )}
            </div>
          )}

          {detail && (
            <>
              {/* Lịch hẹn */}
              <div>
                <h3 style={s.sectionTitle}>
                  Lịch hẹn <span style={s.countBadge}>{appointments.length}</span>
                </h3>
                {appointments.length === 0 ? (
                  <div style={s.emptyBox}>Bệnh nhân chưa có lịch hẹn nào.</div>
                ) : (
                  <div style={s.list}>
                    {appointments.map((a) => {
                      const c = APPT_STATUS_COLOR[a.status] ?? APPT_STATUS_COLOR.PENDING;
                      return (
                        <div key={a.id} style={s.item}>
                          <div style={s.itemMain}>
                            <div style={s.itemHead}>
                              <span>📅 {formatDate(a.appointment_date)}</span>
                              <span>🕒 {a.start_time} - {a.end_time}</span>
                            </div>
                            <div style={s.itemSub}>{a.doctor.full_name} · {a.doctor.specialty}</div>
                            <div style={s.line}><b>Triệu chứng:</b> {a.symptoms || 'Không có'}</div>
                            {a.status === 'CANCELLED' && (
                              <div style={s.line}>
                                <b>Lý do hủy:</b> {a.cancel_reason || 'Không nêu lý do'}
                                {a.cancelled_at ? ` (${formatDateTimeVN(a.cancelled_at)})` : ''}
                              </div>
                            )}
                          </div>
                          <span style={{ ...s.statusBadge, color: c.color, backgroundColor: c.bg }}>
                            {APPT_STATUS_LABEL[a.status] ?? a.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hồ sơ bệnh án */}
              <div>
                <h3 style={s.sectionTitle}>
                  Hồ sơ bệnh án <span style={s.countBadge}>{records.length}</span>
                </h3>
                {records.length === 0 ? (
                  <div style={s.emptyBox}>Bệnh nhân chưa có hồ sơ bệnh án.</div>
                ) : (
                  <div style={s.list}>
                    {records.map((r) => (
                      <div key={r.id} style={s.item}>
                        <div style={s.itemMain}>
                          <div style={s.itemHead}>
                            <span>📅 {formatDate(r.appointment_date)}</span>
                          </div>
                          <div style={s.itemSub}>{r.doctor.full_name} · {r.doctor.specialty}</div>
                          <div style={s.line}><b>Chẩn đoán:</b> {r.diagnosis}</div>
                        </div>
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
