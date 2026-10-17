// components/appointmenthistory.tsx — UC007: Lịch sử đặt lịch của bệnh nhân (trang Lịch khám).
// Bố cục giống trang Bác sĩ: thẻ bộ lọc nổi lên dải banner, bên dưới là danh sách.
// Gọi API-10 GET /appointments/my MỘT lần, lọc phía client (tìm kiếm, trạng thái, ngày khám).
// Lịch PENDING còn trước giờ khám >= 2 giờ có nút "Hủy lịch" (API-22).
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import SafeImage from './safeimage';
import { appointmentService } from '../services/appointmentservice';
import { doctorService } from '../services/doctorservice';
import { ApiError } from '../services/apierror';
import { formatDate } from '../utils/helpers';
import { CANCEL_MIN_HOURS, formatDateTimeVN, isCancelWindowOpen } from '../utils/schedule';
import { inner } from '../styles/layout';
import type { Appointment, AppointmentStatus, AuthUser, Doctor } from '../types';

const PAGE_SIZE = 6;
const MAX_REASON = 255;
// Sau các mã lỗi này dữ liệu trên màn hình đã cũ -> tải lại danh sách khi đóng hộp thoại
const STALE_CODES = ['ALREADY_CANCELLED', 'CANNOT_CANCEL', 'CANCEL_TOO_LATE'];

const STATUS_ORDER: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

const STATUS_COLOR: Record<AppointmentStatus, { color: string; bg: string }> = {
  PENDING: { color: '#b45309', bg: '#fef3c7' },
  CONFIRMED: { color: '#1d4ed8', bg: '#dbeafe' },
  COMPLETED: { color: '#15803d', bg: '#dcfce7' },
  REJECTED: { color: '#b91c1c', bg: '#fee2e2' },
  CANCELLED: { color: '#475569', bg: '#e2e8f0' },
};

// Bỏ dấu + chữ thường để gõ "tim mach" vẫn khớp "Tim mạch", "duc" khớp "Đức"
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    {children}
  </div>
);

type Notice = { kind: 'success' | 'error'; text: string } | null;

interface AppointmentHistoryProps {
  user?: AuthUser | null;
  onLogin: () => void;
  onBooking: () => void;
  // Tăng giá trị này (vd. sau khi đặt lịch xong) để tải lại danh sách
  refreshKey?: number;
}

export default function AppointmentHistory({ user, onLogin, onBooking, refreshKey = 0 }: AppointmentHistoryProps) {
  const isPatient = user?.role === 'PATIENT';

  const [list, setList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [date, setDate] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [doctorMap, setDoctorMap] = useState<Record<string, Doctor>>({});
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());

  // Hủy lịch
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [needReload, setNeedReload] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Tải danh sách (API-10). Đổi tài khoản / đặt lịch mới / bấm "Thử lại" thì tải lại.
  useEffect(() => {
    if (!isPatient) {
      setList([]);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    appointmentService
      .getMyAppointments()
      .then((data) => !cancelled && setList(data))
      .catch((err) => {
        if (cancelled) return;
        setList([]);
        setError(err instanceof ApiError && err.message ? err.message : 'Không thể tải lịch sử đặt lịch, vui lòng thử lại sau.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isPatient, user?.id, refreshKey, retry]);

  // Thông tin giới thiệu bác sĩ (ảnh, mô tả, nổi bật) lấy từ API-07 + API-06, ghép theo id.
  // Lỗi thì bỏ qua: thẻ vẫn hiện tên + chuyên khoa từ lịch hẹn.
  useEffect(() => {
    if (!isPatient) return;
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
  }, [isPatient, retry]);

  // Đổi bộ lọc thì quay về trang đầu
  useEffect(() => setVisible(PAGE_SIZE), [keyword, status, date]);

  const counts = useMemo(() => {
    const c = {} as Record<AppointmentStatus, number>;
    STATUS_ORDER.forEach((s) => (c[s] = list.filter((a) => a.status === s).length));
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    const kw = normalize(keyword.trim());
    return list
      .filter((a) => {
        if (status && a.status !== status) return false;
        if (date && a.appointment_date !== date) return false;
        if (kw) {
          const haystack = normalize(
            [
              a.doctor.full_name, a.doctor.specialty, a.symptoms ?? '', a.cancel_reason ?? '',
              STATUS_LABEL[a.status] ?? '', formatDate(a.appointment_date), a.start_time, a.end_time,
            ].join(' ')
          );
          if (!haystack.includes(kw)) return false;
        }
        return true;
      })
      .sort((a, b) => `${b.appointment_date} ${b.start_time}`.localeCompare(`${a.appointment_date} ${a.start_time}`));
  }, [list, keyword, status, date]);

  const hasFilter = !!(keyword || status || date);
  const resetFilters = () => {
    setKeyword('');
    setStatus('');
    setDate('');
  };

  // Chỉ lịch "Chờ xác nhận" 
  const canCancel = (a: Appointment) => a.status === 'PENDING';

  const openCancel = (a: Appointment) => {
    setCancelTarget(a);
    setReason('');
    setCancelError('');
    setNotice(null);
  };

  const closeCancel = () => {
    if (cancelling) return;
    setCancelTarget(null);
    if (needReload) {
      setNeedReload(false);
      setRetry((n) => n + 1);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    if (reason.length > MAX_REASON) {
      setCancelError(`Lý do hủy tối đa ${MAX_REASON} ký tự`);
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      const result = await appointmentService.cancel(cancelTarget.id, reason);
      // Thay đúng dòng vừa hủy bằng dữ liệu server trả về (status, cancel_reason, cancelled_at)
      setList((prev) => prev.map((a) => (a.id === cancelTarget.id ? result.appointment : a)));
      setNotice({ kind: 'success', text: result.message || 'Hủy lịch hẹn thành công' });
      setCancelTarget(null);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setCancelError(apiErr?.message || 'Đã có lỗi xảy ra, vui lòng thử lại sau');
      if (apiErr?.code && STALE_CODES.includes(apiErr.code)) setNeedReload(true);
      if (apiErr?.status === 404) setNeedReload(true);
    } finally {
      setCancelling(false);
    }
  };

  // ---------- Chưa đăng nhập / không phải bệnh nhân ----------
  if (!user) {
    return (
      <section style={styles.listSection}>
        <div style={styles.hintBox}>
          Vui lòng <span style={styles.link} onClick={onLogin}>đăng nhập</span> để xem lịch sử đặt lịch của bạn.
        </div>
      </section>
    );
  }
  if (!isPatient) {
    return (
      <section style={styles.listSection}>
        <div style={styles.hintBox}>Lịch sử đặt lịch chỉ dành cho tài khoản bệnh nhân.</div>
      </section>
    );
  }

  // ---------- Đang tải / lỗi ----------
  if (loading) {
    return (
      <section style={styles.listSection}>
        <div style={styles.hintBox}>Đang tải lịch sử đặt lịch...</div>
      </section>
    );
  }
  if (error) {
    return (
      <section style={styles.listSection}>
        <div style={{ ...styles.hintBox, color: '#b91c1c', borderColor: '#fecaca' }}>
          <div style={{ marginBottom: 10 }}>{error}</div>
          <button className="mh-btn" onClick={() => setRetry((n) => n + 1)} style={styles.btnLine}>Thử lại</button>
        </div>
      </section>
    );
  }

  // ---------- Chưa từng đặt lịch (SRS UC007 luồng 3a) ----------
  if (list.length === 0) {
    return (
      <section style={styles.listSection}>
        <div style={styles.hintBox}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🗓️</div>
          <div style={{ marginBottom: 12 }}>Chưa có lịch sử đặt lịch</div>
          <button className="mh-btn" onClick={onBooking} style={styles.btnPrimary}>Đặt lịch ngay</button>
        </div>
      </section>
    );
  }

  const shown = filtered.slice(0, visible);

  return (
    <>
      {/* Bộ lọc (nổi lên dải banner như trang Bác sĩ) */}
      <section style={styles.filterSection}>
        <div style={styles.filterCard}>
          <div style={styles.filterGrid}>
            <Group label="🔍 Tìm kiếm lịch khám">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tên bác sĩ, chuyên khoa, triệu chứng..."
                style={styles.input}
              />
            </Group>
            <Group label="📌 Trạng thái">
              <select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')} style={styles.select}>
                <option value="">Tất cả trạng thái ({list.length})</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]} ({counts[s]})</option>
                ))}
              </select>
            </Group>
            <Group label="📅 Ngày khám">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.input} />
            </Group>
          </div>

          {hasFilter && (
            <div style={styles.resetWrap}>
              <button onClick={resetFilters} style={styles.resetBtn}>🔄 Xóa bộ lọc</button>
            </div>
          )}
        </div>
      </section>

      <section style={styles.listSection}>
        <div style={styles.titleRow}>
          <div style={styles.resultSummary}>
            {hasFilter ? (
              <>Tìm thấy <b>{filtered.length}</b> / {list.length} lịch khám</>
            ) : (
              <>Tổng cộng <b>{list.length}</b> lịch khám</>
            )}
          </div>
          <button className="mh-btn" onClick={onBooking} style={styles.btnPrimary}>Đặt lịch ngay</button>
        </div>

        {notice && (
          <div
            role="alert"
            style={{ ...styles.notice, ...(notice.kind === 'success' ? styles.noticeOk : styles.noticeError) }}
          >
            {notice.text}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={styles.hintBox}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
            <div style={{ marginBottom: 12 }}>Không có lịch khám nào phù hợp với bộ lọc.</div>
            <button onClick={resetFilters} style={styles.btnLine}>Xóa bộ lọc</button>
          </div>
        ) : (
          <>
            {/* Mỗi hàng = 1 lịch khám cụ thể */}
            <div style={styles.rows}>
              {shown.map((a) => {
                const c = STATUS_COLOR[a.status] ?? STATUS_COLOR.PENDING;
                const cancellable = canCancel(a);
                const info = doctorMap[String(a.doctor.id)];
                const featured = featuredIds.has(String(a.doctor.id));
                return (
                  <div key={a.id} className="mh-card" style={styles.row}>
                    <SafeImage
                      src={info?.avatar_url ?? undefined}
                      alt={a.doctor.full_name}
                      style={styles.avatarImg}
                      fallback={<div style={styles.avatar}>👨‍⚕️</div>}
                    />

                    <div style={styles.info}>
                      <div style={styles.badgeRow}>
                        <span style={styles.badge}>{a.doctor.specialty}</span>
                        {featured && <span style={styles.featuredBadge}>⭐ Nổi bật</span>}
                      </div>
                      {/* Tên bác sĩ + ngày + giờ khám cùng 1 hàng */}
                      <div style={styles.nameRow}>
                        <h3 style={styles.docName}>{a.doctor.full_name}</h3>
                        <div style={styles.meta}>
                          <span>📅 {formatDate(a.appointment_date)}</span>
                          <span>🕒 {a.start_time} - {a.end_time}</span>
                        </div>
                      </div>
                      <p style={styles.bio}>{info?.bio || 'Chưa có mô tả.'}</p>

                      <div style={styles.line}><b>Triệu chứng:</b> {a.symptoms || 'Không có'}</div>
                      {a.status === 'CANCELLED' && (
                        <div style={styles.line}><b>Lý do hủy:</b> {a.cancel_reason || 'Không nêu lý do'}</div>
                      )}

                      <div style={styles.times}>
                        <span>Đặt lúc {formatDateTimeVN(a.created_at)}</span>
                        {a.status === 'CANCELLED' && a.cancelled_at && (
                          <span style={{ color: '#b91c1c' }}>Hủy lúc {formatDateTimeVN(a.cancelled_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Góc phải: trạng thái, bên dưới là nút hủy (chỉ khi chưa được xác nhận) */}
                    <div style={styles.aside}>
                      <span style={{ ...styles.statusBadge, color: c.color, backgroundColor: c.bg }}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                      {cancellable && (
                        <button className="mh-btn" onClick={() => openCancel(a)} style={styles.btnCancel}>Hủy lịch</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length > visible && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button className="mh-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)} style={styles.btnLine}>
                  Xem thêm ({filtered.length - visible})
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Hộp thoại xác nhận hủy */}
      {cancelTarget && (
        <div style={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && closeCancel()}>
          <div role="dialog" aria-modal="true" aria-label="Xác nhận hủy lịch" style={styles.dialog}>
            <h2 style={styles.dialogTitle}>Xác nhận hủy lịch hẹn</h2>
            <p style={styles.dialogText}>
              Bạn có chắc chắn muốn hủy lịch khám với <b>{cancelTarget.doctor.full_name}</b> vào{' '}
              <b>{cancelTarget.start_time} ngày {formatDate(cancelTarget.appointment_date)}</b>?
            </p>
            <p style={styles.dialogHint}>Lịch hẹn đang ở trạng thái chờ xác nhận sẽ được hủy.</p>

            <label style={styles.label}>Lý do hủy (không bắt buộc)</label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setCancelError(''); }}
              placeholder="Ví dụ: Bận việc đột xuất"
              rows={3}
              style={{ ...styles.input, resize: 'vertical', marginTop: 6 }}
              disabled={cancelling}
            />
            <div style={styles.counter}>{reason.length}/{MAX_REASON} ký tự</div>

            {cancelError && <div role="alert" style={{ ...styles.notice, ...styles.noticeError, marginTop: 10, marginBottom: 0 }}>{cancelError}</div>}

            <div style={styles.dialogActions}>
              <button type="button" className="mh-btn" onClick={closeCancel} disabled={cancelling} style={styles.btnLine}>Quay lại</button>
              <button
                type="button"
                className="mh-btn"
                onClick={confirmCancel}
                disabled={cancelling}
                style={{ ...styles.btnDanger, opacity: cancelling ? 0.6 : 1, cursor: cancelling ? 'not-allowed' : 'pointer' }}
              >
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const field: CSSProperties = { padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' };
const tag: CSSProperties = { fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6 };
const btn: CSSProperties = { fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' };

const styles: Record<string, CSSProperties> = {
  hintBox: { padding: '36px 20px', textAlign: 'center', fontSize: 14, color: '#64748b', backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16 },
  link: { color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' },

  // Bộ lọc: cùng kiểu trang Bác sĩ
  filterSection: { ...inner, padding: '0 24px', marginTop: -28, position: 'relative', zIndex: 2 },
  filterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 10px 25px rgba(15,23,42,.08)', border: '1px solid #dbeafe' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  input: field,
  select: { ...field, backgroundColor: '#fff' },
  resetWrap: { marginTop: 16, textAlign: 'right' },
  resetBtn: { background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' },

  // Danh sách
  listSection: { ...inner, padding: '40px 24px 36px' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 },
  resultSummary: { fontSize: 15, color: '#64748b' },
  rows: { display: 'flex', flexDirection: 'column', gap: 16 },

  row: { display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 16, padding: 22, border: '1px solid #dbeafe', boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(15,23,42,.03)', textAlign: 'left' },
  avatar: { width: 72, height: 72, borderRadius: '50%', flexShrink: 0, backgroundColor: '#e0efff', border: '3px solid #dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 32 },
  info: { flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  avatarImg: { width: 72, height: 72, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '3px solid #dbeafe' },
  badge: { ...tag, backgroundColor: '#eff6ff', color: '#2563eb' },
  featuredBadge: { ...tag, backgroundColor: '#fef3c7', color: '#b45309' },
  bio: { fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  docName: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, overflowWrap: 'anywhere' },
  nameRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 4 },
  meta: { display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14, color: '#334155', fontWeight: 600 },
  line: { fontSize: 13, color: '#475569', lineHeight: 1.5, overflowWrap: 'anywhere' },
  times: { display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginTop: 4, paddingTop: 8, borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8' },

  aside: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 20, marginLeft: 'auto', flexShrink: 0 },
  statusBadge: { padding: '4.5px 13.5px', fontSize: 13.5, fontWeight: 700, borderRadius: 999, whiteSpace: 'nowrap' }, // 0,75 lần bản trước (6px 18px, 18px)

  notice: { padding: '12px 14px', marginBottom: 16, borderRadius: 8, fontSize: 14 },
  noticeOk: { color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' },
  noticeError: { color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' },

  btnPrimary: { ...btn, padding: '10px 26px', color: '#fff', border: 'none', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnLine: { ...btn, padding: '10px 22px', color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb' },
  btnCancel: { ...btn, padding: '7.5px 18px', fontSize: 15, color: '#dc2626', backgroundColor: '#fff', border: '1.5px solid #dc2626' }, // 0,75 lần bản trước (10px 24px, 20px)
  btnDanger: { ...btn, padding: '10px 22px', color: '#fff', backgroundColor: '#dc2626', border: 'none' },

  // Hộp thoại hủy lịch
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.5)', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' },
  dialog: { width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', padding: 28, backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,.3)', boxSizing: 'border-box' },
  dialogTitle: { margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: '#0f172a' },
  dialogText: { margin: '0 0 6px', fontSize: 14, color: '#334155', lineHeight: 1.6 },
  dialogHint: { margin: '0 0 16px', fontSize: 12, color: '#64748b' },
  counter: { marginTop: 4, fontSize: 12, color: '#64748b', textAlign: 'right' },
  dialogActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
};