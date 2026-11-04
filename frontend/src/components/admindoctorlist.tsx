// components/admindoctorlist.tsx — UC010: danh sách bác sĩ Admin trên trang Bác sĩ.
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import SafeImage from './safeimage';
import AdminDoctorForm from './admindoctorform';
import { ApiError } from '../services/apierror';
import { adminDoctorService } from '../services/admindoctorservice';
import { adminDoctorStyles as s } from '../styles/admindoctors';
import type { AdminDoctor } from '../types/admindoctor';

const ALL = 'Tất cả chuyên khoa';
const SPECIALTIES = [ALL, 'Nội tổng quát', 'Nhi khoa', 'Da liễu', 'Tim mạch', 'Tai Mũi Họng', 'Sản phụ khoa'];

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={s.inputGroup}>
    <label style={s.label}>{label}</label>
    {children}
  </div>
);

type ConfirmKind = 'deactivate' | 'delete' | 'hardDelete' | 'reactivate';

interface Props {
  isAdmin: boolean;
}

export default function AdminDoctorList({ isAdmin }: Props) {
  const [list, setList] = useState<AdminDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState(ALL);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [formId, setFormId] = useState<string | null | undefined>(undefined);
  const [confirm, setConfirm] = useState<{ id: string; kind: ConfirmKind; name: string } | null>(null);
  const [confirmError, setConfirmError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const openConfirm = (payload: { id: string; kind: ConfirmKind; name: string }) => {
    setConfirmError('');
    setConfirm(payload);
  };

  useEffect(() => {
    if (!isAdmin) {
      setList([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    adminDoctorService
      .list({ q, include_inactive: includeInactive })
      .then((data) => !cancelled && setList(data))
      .catch((err) => {
        if (cancelled) return;
        setList([]);
        setError(err instanceof ApiError && err.message ? err.message : 'Không thể tải danh sách bác sĩ.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isAdmin, q, includeInactive, retry]);

  const filtered = useMemo(() => {
    if (specialty === ALL) return list;
    return list.filter((d) => d.specialty === specialty);
  }, [list, specialty]);

  // Nổi bật luôn ở mục nổi bật (kể cả đã ngừng, khi bật "Hiện bác sĩ đã ngừng")
  const featuredList = filtered.filter((d) => d.is_featured);
  const otherList = filtered.filter((d) => !d.is_featured);

  const hasFilter = !!(q.trim() || specialty !== ALL || includeInactive);
  const resetFilters = () => {
    setQ('');
    setSpecialty(ALL);
    setIncludeInactive(false);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    setConfirmError('');
    try {
      let text = '';
      if (confirm.kind === 'reactivate') {
        const res = await adminDoctorService.reactivate(confirm.id);
        text = res.message || 'Đã kích hoạt lại bác sĩ';
      } else if (confirm.kind === 'hardDelete') {
        const res = await adminDoctorService.remove(confirm.id, { hard: true });
        text = res.message || 'Đã xóa triệt để bác sĩ';
      } else {
        const res = await adminDoctorService.remove(confirm.id);
        text =
          confirm.kind === 'deactivate'
            ? res.message || 'Đã ngừng hoạt động bác sĩ'
            : res.message || 'Đã ngừng hoạt động bác sĩ (xóa lần 1)';
      }
      // Thành công: cập nhật list tại chỗ (giữ thứ tự), ẩn khi ngừng nếu không tick "hiện đã ngừng"
      setConfirm(null);
      setConfirmError('');
      setNotice({ kind: 'ok', text });
      if (confirm.kind === 'hardDelete') {
        setList((prev) => prev.filter((d) => d.id !== confirm.id));
      } else if (confirm.kind === 'reactivate') {
        setList((prev) => prev.map((d) => (d.id === confirm.id ? { ...d, is_active: true } : d)));
      } else {
        // ngừng / xóa lần 1: soft — chỉ ẩn nếu không includeInactive
        setList((prev) => {
          const next = prev.map((d) => (d.id === confirm.id ? { ...d, is_active: false } : d));
          return includeInactive ? next : next.filter((d) => d.is_active);
        });
      }
    } catch (err) {
      // Lỗi: giữ khung mở, hiện chữ đỏ trong khung (không đẩy ra trang)
      setConfirmError(
        err instanceof ApiError && err.message ? err.message : 'Không thực hiện được thao tác.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <section style={s.listSection}>
        <div style={s.hintBox}>Chức năng quản lý bác sĩ chỉ dành cho tài khoản Admin.</div>
      </section>
    );
  }

  const renderCard = (d: AdminDoctor) => (
    <div key={d.id} className="mh-card" style={s.doctorCard}>
      <div style={s.cardTop}>
        <SafeImage
          src={d.avatar_url ?? undefined}
          alt={d.full_name}
          style={s.doctorImg}
          fallback={<div style={s.doctorAvatar}>👨‍⚕️</div>}
        />
        <div style={s.cardTitleBox}>
          <div style={s.badges}>
            <span style={s.badge}>{d.specialty}</span>
            {d.is_featured && <span style={s.badgeWarn}>⭐ Nổi bật</span>}
            {!d.is_active && <span style={s.badgeMuted}>Đã ngừng</span>}
          </div>
          <h3 style={s.docName}>{d.full_name}</h3>
        </div>
      </div>

      <p style={s.bio}>{d.bio || 'Chưa có mô tả.'}</p>

      <div style={s.infoBlock}>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Email</span>
          <span style={s.infoValue}>{d.email || '—'}</span>
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>SĐT</span>
          <span style={s.infoValue}>{d.phone || '—'}</span>
        </div>
      </div>

      {/* Cùng 1 hàng: Sửa | Ngừng/Kích hoạt | Xóa — không có Đặt lịch */}
      <div style={s.cardActions}>
        <button type="button" className="mh-btn" style={s.btnGhost} onClick={() => setFormId(d.id)}>
          Sửa
        </button>
        {d.is_active ? (
          <button
            type="button"
            className="mh-btn"
            style={s.btnWarn}
            onClick={() => openConfirm({ id: d.id, kind: 'deactivate', name: d.full_name })}
          >
            Ngừng hoạt động
          </button>
        ) : (
          <button
            type="button"
            className="mh-btn"
            style={s.btnPrimary}
            onClick={() => openConfirm({ id: d.id, kind: 'reactivate', name: d.full_name })}
          >
            Kích hoạt lại
          </button>
        )}
        <button
          type="button"
          className="mh-btn"
          style={s.btnDanger}
          onClick={() =>
            openConfirm({
              id: d.id,
              kind: d.is_active ? 'delete' : 'hardDelete',
              name: d.full_name,
            })
          }
        >
          Xóa
        </button>
      </div>
    </div>
  );

  const ready = !loading && !error;

  return (
    <>
      <section style={s.filterSection}>
        <div style={s.filterCard}>
          <div style={s.filterTopRow}>
            <Group label="🔍 Tìm kiếm">
              <input
                style={s.input}
                value={q}
                placeholder="Tên, email, SĐT..."
                onChange={(e) => setQ(e.target.value)}
              />
            </Group>
            <Group label="🩺 Chuyên khoa">
              <select style={s.select} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                {SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </Group>
            <div style={s.addBtnWrap}>
              <button type="button" className="mh-btn" style={s.btnPrimary} onClick={() => setFormId(null)}>
                + Thêm bác sĩ
              </button>
            </div>
          </div>

          <label style={s.checkBelowSearch}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Hiện cả bác sĩ đã ngừng hoạt động
          </label>

          {hasFilter && (
            <div style={s.resetWrap}>
              <button type="button" style={s.resetBtn} onClick={resetFilters}>
                🔄 Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </section>

      <section style={s.listSection}>
        {notice && (
          <div style={{ ...s.notice, ...(notice.kind === 'ok' ? s.noticeOk : s.noticeErr) }}>{notice.text}</div>
        )}
        {loading && <div style={s.summary}>Đang tải danh sách bác sĩ...</div>}
        {!loading && error && (
          <div style={{ ...s.hintBox, color: '#b91c1c', borderColor: '#fecaca' }}>
            <div style={{ marginBottom: 10 }}>{error}</div>
            <button type="button" className="mh-btn" style={s.btnGhost} onClick={() => setRetry((n) => n + 1)}>
              Thử lại
            </button>
          </div>
        )}
        {ready && (
          <div style={s.summary}>
            Hiển thị <b>{filtered.length}</b> bác sĩ
          </div>
        )}
        {ready && featuredList.length > 0 && (
          <>
            <h2 style={s.sectionTitle}>⭐ Bác sĩ nổi bật</h2>
            <div style={s.doctorGrid}>{featuredList.map(renderCard)}</div>
          </>
        )}
        {ready && otherList.length > 0 && (
          <>
            {featuredList.length > 0 && <h2 style={{ ...s.sectionTitle, marginTop: 40 }}>Các bác sĩ khác</h2>}
            <div style={s.doctorGrid}>{otherList.map(renderCard)}</div>
          </>
        )}
        {ready && filtered.length === 0 && (
          <div style={s.hintBox}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
            Không tìm thấy bác sĩ phù hợp
          </div>
        )}
      </section>

      {formId !== undefined && (
        <AdminDoctorForm
          doctorId={formId}
          onClose={() => setFormId(undefined)}
          onSaved={(message) => {
            setNotice({ kind: 'ok', text: message });
            setFormId(undefined);
            setRetry((n) => n + 1);
          }}
        />
      )}

      {confirm && (
        <div
          style={s.overlay}
          onClick={() => {
            if (!busy) {
              setConfirm(null);
              setConfirmError('');
            }
          }}
        >
          <div style={s.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.confirmTitle}>
              {confirm.kind === 'reactivate'
                ? 'Kích hoạt lại'
                : confirm.kind === 'hardDelete'
                  ? 'Xóa triệt để'
                  : confirm.kind === 'deactivate'
                    ? 'Ngừng hoạt động'
                    : 'Xóa bác sĩ'}
            </h2>
            <p style={s.confirmBody}>
              {confirm.kind === 'reactivate' && (
                <>
                  Kích hoạt lại <b>{confirm.name}</b>? Bác sĩ sẽ hiện lại danh sách công khai.
                </>
              )}
              {confirm.kind === 'deactivate' && (
                <>
                  Ngừng hoạt động <b>{confirm.name}</b>? Có thể kích hoạt lại sau.
                </>
              )}
              {confirm.kind === 'delete' && (
                <>
                  Xóa lần 1 <b>{confirm.name}</b> = ngừng hoạt động. Xóa lần 2 (khi đã ngừng) sẽ xóa triệt để.
                </>
              )}
              {confirm.kind === 'hardDelete' && (
                <>
                  Xóa triệt để <b>{confirm.name}</b>? Không thể hoàn tác.
                </>
              )}
            </p>
            {confirmError && <div style={{ ...s.notice, ...s.noticeErr, marginBottom: 0 }}>{confirmError}</div>}
            <div style={s.confirmFooter}>
              <button
                type="button"
                className="mh-btn"
                style={s.confirmBtnGhost}
                disabled={busy}
                onClick={() => {
                  setConfirm(null);
                  setConfirmError('');
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="mh-btn"
                style={
                  confirm.kind === 'reactivate'
                    ? s.confirmBtnPrimary
                    : confirm.kind === 'deactivate'
                      ? s.confirmBtnWarn
                      : s.confirmBtnDanger
                }
                disabled={busy}
                onClick={runConfirm}
              >
                {busy
                  ? 'Đang xử lý...'
                  : confirm.kind === 'reactivate'
                    ? 'Kích hoạt lại'
                    : confirm.kind === 'hardDelete'
                      ? 'Xóa triệt để'
                      : confirm.kind === 'deactivate'
                        ? 'Ngừng hoạt động'
                        : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
