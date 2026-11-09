// components/adminappointments.tsx — UC011 (Admin): quản lý toàn bộ lịch hẹn ở trang Lịch khám.
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AdminAppointmentRow from './adminappointmentrow';
import AdminStatusDialog from './adminstatusdialog';
import AdminCompleteDialog from './admincompletedialog';
import AdminRecordDialog from './adminrecorddialog';
import { useAdminAppointments } from '../utils/useadminappointments';
import {
  ACTION_META, EMPTY_FILTER, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER,
  countByStatus, filterAdminAppointments, hasActiveFilter, sortForAdmin,
} from '../utils/adminappointment';
import { adminApptStyles as s, adminActionStyles as a2 } from '../styles/adminappointments';
import type { AppointmentStatus, AuthUser } from '../types';
import type {
  AdminAppointment, AdminAppointmentFilter, AdminRowAction, AdminStatusAction, CompletePayload,
} from '../types/adminappointment';

const PAGE_SIZE = 8;
const NOTICE_MS = 6000; // thông báo tự tắt sau 6 giây

type Notice = { kind: 'success' | 'error'; text: string } | null;
type Pending = { appointment: AdminAppointment; action: AdminStatusAction } | null;

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={s.inputGroup}>
    <label style={s.label}>{label}</label>
    {children}
  </div>
);

const Hint = ({ children }: { children: ReactNode }) => <section style={s.listSection}>{children}</section>;

interface AdminAppointmentsProps {
  user?: AuthUser | null;
}

export default function AdminAppointments({ user }: AdminAppointmentsProps) {
  const isAdmin = user?.role === 'ADMIN';
  const { list, doctors, loading, error, reload, changeStatus, completeAppointment } = useAdminAppointments(isAdmin, user?.id);

  const [filter, setFilter] = useState<AdminAppointmentFilter>(EMPTY_FILTER);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const change = <K extends keyof AdminAppointmentFilter>(key: K, value: AdminAppointmentFilter[K]) =>
    setFilter((f) => ({ ...f, [key]: value }));

  // Đổi bộ lọc thì quay về trang đầu
  useEffect(() => setVisible(PAGE_SIZE), [filter]);

  // Hộp thoại xác nhận / từ chối / hủy và thông báo kết quả
  const [pending, setPending] = useState<Pending>(null);
  const [completing, setCompleting] = useState<AdminAppointment | null>(null); // lịch đang nhập hồ sơ hoàn tất
  const [viewing, setViewing] = useState<AdminAppointment | null>(null); // lịch đang xem bệnh án (chỉ đọc)
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  // "Hoàn tất" mở form riêng (API-27); "Bệnh án" mở khung xem hồ sơ; 3 hành động còn lại dùng chung hộp thoại xác nhận (API-26)
  const openAction = (appointment: AdminAppointment, action: AdminRowAction) => {
    setNotice(null);
    if (action === 'COMPLETED') setCompleting(appointment);
    else if (action === 'RECORD') setViewing(appointment);
    else setPending({ appointment, action });
  };

  // Thành công thì đóng hộp thoại + báo; lỗi thì ném tiếp để hộp thoại tự hiện (không đóng)
  const submitAction = async (reason: string) => {
    if (!pending) return;
    const { appointment, action } = pending;
    const message = await changeStatus(appointment.id, action, reason);
    setPending(null);
    setNotice({
      kind: 'success',
      text: `${message || 'Cập nhật trạng thái lịch hẹn thành công'} (${ACTION_META[action].label}: ${appointment.patient.full_name || appointment.patient.patient_code}).`,
    });
  };

  // Thành công thì đóng form + báo; lỗi thì ném tiếp để form tự hiện (không đóng)
  const submitComplete = async (payload: CompletePayload) => {
    if (!completing) return;
    const appointment = completing;
    const message = await completeAppointment(appointment.id, payload);
    setCompleting(null);
    setNotice({
      kind: 'success',
      text: `${message || 'Hoàn tất lịch khám và lưu hồ sơ bệnh án thành công'} (${appointment.patient.full_name || appointment.patient.patient_code}). Bấm "Bệnh án" ở lịch này để xem lại hồ sơ.`,
    });
  };

  const counts = useMemo(() => countByStatus(list), [list]);
  const filtered = useMemo(() => sortForAdmin(filterAdminAppointments(list, filter)), [list, filter]);
  const filtering = hasActiveFilter(filter);

  if (!isAdmin) {
    return <Hint><div style={s.hintBox}>Trang quản lý lịch hẹn chỉ dành cho tài khoản quản trị viên.</div></Hint>;
  }
  if (loading) return <Hint><div style={s.hintBox}>Đang tải danh sách lịch hẹn...</div></Hint>;
  if (error) {
    return (
      <Hint>
        <div style={{ ...s.hintBox, color: '#b91c1c', borderColor: '#fecaca' }}>
          <div style={{ marginBottom: 10 }}>{error}</div>
          <button className="mh-btn" onClick={reload} style={s.btnLine}>Thử lại</button>
        </div>
      </Hint>
    );
  }
  if (list.length === 0) {
    return (
      <Hint>
        <div style={s.hintBox}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🗓️</div>
          <div>Chưa có lịch hẹn nào</div>
        </div>
      </Hint>
    );
  }

  const shown = filtered.slice(0, visible);
  const toggleStatus = (st: AppointmentStatus) => change('status', filter.status === st ? '' : st);

  return (
    <>
      <section style={s.filterSection}>
        <div style={s.filterCard}>
          <div style={s.filterGrid}>
            <Group label="🔍 Tìm kiếm lịch hẹn">
              <input
                type="text"
                value={filter.keyword}
                onChange={(e) => change('keyword', e.target.value)}
                placeholder="Tên, mã, SĐT bệnh nhân, bác sĩ..."
                style={s.input}
              />
            </Group>
            <Group label="📌 Trạng thái">
              <select value={filter.status} onChange={(e) => change('status', e.target.value as AppointmentStatus | '')} style={s.select}>
                <option value="">Tất cả trạng thái ({list.length})</option>
                {STATUS_ORDER.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]} ({counts[st]})</option>)}
              </select>
            </Group>
            <Group label="🩺 Bác sĩ">
              <select value={filter.doctorId} onChange={(e) => change('doctorId', e.target.value)} style={s.select}>
                <option value="">Tất cả bác sĩ</option>
                {doctors.map((d) => <option key={d.id} value={String(d.id)}>{d.full_name} ({d.specialty})</option>)}
              </select>
            </Group>
            <Group label="📅 Ngày khám">
              <input type="date" value={filter.date} onChange={(e) => change('date', e.target.value)} style={s.input} />
            </Group>
          </div>

          {filtering && (
            <div style={s.resetWrap}>
              <button onClick={() => setFilter(EMPTY_FILTER)} style={s.resetBtn}>🔄 Xóa bộ lọc</button>
            </div>
          )}
        </div>
      </section>

      <section style={s.listSection}>
        {/* Thống kê theo trạng thái: bấm để lọc, bấm lại để bỏ lọc */}
        <div style={s.statsGrid}>
          {STATUS_ORDER.map((st) => {
            const active = filter.status === st;
            return (
              <button
                key={st}
                type="button"
                className="mh-card"
                aria-pressed={active}
                onClick={() => toggleStatus(st)}
                style={{ ...s.statTile, ...(active ? { borderColor: STATUS_COLOR[st].color, backgroundColor: STATUS_COLOR[st].bg } : {}) }}
              >
                <span style={{ ...s.statValue, color: STATUS_COLOR[st].color }}>{counts[st]}</span>
                <span style={s.statLabel}>{STATUS_LABEL[st]}</span>
              </button>
            );
          })}
        </div>

        <div style={s.titleRow}>
          <div style={s.resultSummary}>
            {filtering ? <>Tìm thấy <b>{filtered.length}</b> / {list.length} lịch hẹn</> : <>Tổng cộng <b>{list.length}</b> lịch hẹn</>}
          </div>
          <button className="mh-btn" onClick={reload} style={s.btnLine}>🔄 Làm mới</button>
        </div>

        {notice && (
          <div role="alert" style={{ ...a2.notice, ...(notice.kind === 'success' ? a2.noticeOk : a2.noticeError) }}>
            {notice.text}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={s.hintBox}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
            <div style={{ marginBottom: 12 }}>Không có lịch hẹn nào phù hợp với bộ lọc.</div>
            <button onClick={() => setFilter(EMPTY_FILTER)} style={s.btnLine}>Xóa bộ lọc</button>
          </div>
        ) : (
          <>
            <div style={s.rows}>
              {shown.map((a) => <AdminAppointmentRow key={a.id} appointment={a} onAction={openAction} />)}
            </div>
            {filtered.length > visible && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button className="mh-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)} style={s.btnLine}>
                  Xem thêm ({filtered.length - visible})
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {pending && (
        <AdminStatusDialog
          appointment={pending.appointment}
          action={pending.action}
          onClose={() => setPending(null)}
          onSubmit={submitAction}
          onStale={reload}
        />
      )}

      {completing && (
        <AdminCompleteDialog
          appointment={completing}
          onClose={() => setCompleting(null)}
          onSubmit={submitComplete}
          onStale={reload}
        />
      )}

      {viewing && <AdminRecordDialog appointment={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}