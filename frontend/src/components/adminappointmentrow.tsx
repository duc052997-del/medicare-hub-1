// components/adminappointmentrow.tsx — 1 hàng = 1 lịch hẹn ở màn hình quản lý của Admin (UC011).
import { formatDate } from '../utils/helpers';
import { formatDateTimeVN } from '../utils/schedule';
import {
  STATUS_COLOR, STATUS_LABEL,
  getActionBlockReason, getActionLabel, getAdminActions, isOpenStatus, isPastAppointment,
} from '../utils/adminappointment';
import { adminApptStyles as s, adminActionStyles as a2 } from '../styles/adminappointments';
import type { AdminAppointment, AdminRowAction } from '../types/adminappointment';

interface AdminAppointmentRowProps {
  appointment: AdminAppointment;
  onAction: (appointment: AdminAppointment, action: AdminRowAction) => void;
}

const buttonStyle = (action: AdminRowAction) =>
  action === 'CONFIRMED' ? a2.btnConfirm
  : action === 'COMPLETED' ? a2.btnComplete
  : action === 'RECORD' ? a2.btnRecord
  : a2.btnReject;

export default function AdminAppointmentRow({ appointment: a, onAction }: AdminAppointmentRowProps) {
  const c = STATUS_COLOR[a.status];
  const patientName = a.patient.full_name?.trim() || 'Chưa cập nhật họ tên';
  const reasonLabel = a.status === 'REJECTED' ? 'Lý do từ chối' : 'Lý do hủy';
  const overdue = isOpenStatus(a.status) && isPastAppointment(a); // lịch còn xử lý nhưng đã quá giờ khám
  const actions = getAdminActions(a);

  return (
    <div className="mh-card" style={s.row}>
      <div style={s.avatar}>{patientName.charAt(0).toUpperCase()}</div>

      <div style={s.info}>
        <div style={s.nameRow}>
          <h3 style={s.patientName}>{patientName}</h3>
          <span style={s.codeBadge}>{a.patient.patient_code}</span>
        </div>
        <div style={s.phone}>📞 {a.patient.phone || 'Chưa có số điện thoại'}</div>

        <div style={s.meta}>
          <span>📅 {formatDate(a.appointment_date)}</span>
          <span>🕒 {a.start_time} - {a.end_time}</span>
          {overdue && a.status === 'PENDING' && <span style={a2.pastTag}>Đã quá giờ khám</span>}
        </div>
        <div style={s.doctorLine}>
          🩺 <b>{a.doctor.full_name}</b> · {a.doctor.specialty}
        </div>

        <div style={s.line}><b>Triệu chứng:</b> {a.symptoms || 'Không có'}</div>
        {(a.status === 'CANCELLED' || a.status === 'REJECTED') && (
          <div style={s.line}><b>{reasonLabel}:</b> {a.cancel_reason || 'Không nêu lý do'}</div>
        )}

        <div style={s.times}>
          <span>Đặt lúc {formatDateTimeVN(a.created_at)}</span>
          {a.status === 'CANCELLED' && a.cancelled_at && (
            <span style={{ color: '#b91c1c' }}>Hủy lúc {formatDateTimeVN(a.cancelled_at)}</span>
          )}
        </div>
      </div>

      <div style={s.aside}>
        <span style={{ ...s.statusBadge, color: c.color, backgroundColor: c.bg }}>{STATUS_LABEL[a.status] ?? a.status}</span>
        {actions.length > 0 && (
          <div style={a2.actions}>
            {actions.map((action) => {
              const blocked = getActionBlockReason(a, action);
              return (
                <button
                  key={action}
                  type="button"
                  className="mh-btn"
                  disabled={!!blocked}
                  title={blocked ?? undefined}
                  onClick={() => onAction(a, action)}
                  style={{ ...buttonStyle(action), ...(blocked ? a2.btnDisabled : {}) }}
                >
                  {getActionLabel(action)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}