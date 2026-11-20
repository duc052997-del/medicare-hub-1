// components/adminrecorddialog.tsx — UC011 (Admin): khung XEM hồ sơ bệnh án đã ghi sau buổi khám (CHỈ ĐỌC, không sửa).
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAdminRecord } from '../utils/useadminrecord';
import { formatDate } from '../utils/helpers';
import { formatDateTimeVN } from '../utils/schedule';
import { recordStyles as s } from '../styles/records';
import type { AdminAppointment } from '../types/adminappointment';

const Item = ({ label, value }: { label: string; value: ReactNode }) => (
  <div style={s.sumItem}>
    <span style={s.sumLabel}>{label}</span>
    <span style={s.sumValue}>{value}</span>
  </div>
);

interface AdminRecordDialogProps {
  appointment: AdminAppointment;
  onClose: () => void;
}

export default function AdminRecordDialog({ appointment: a, onClose }: AdminRecordDialogProps) {
  const { record, loading, error, notFound, reload } = useAdminRecord(a.id);
  const patientName = a.patient.full_name?.trim() || 'Chưa cập nhật họ tên';
  const prescriptions = record?.prescriptions ?? [];

  // Esc để đóng, khóa cuộn trang nền khi mở
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Hồ sơ bệnh án" style={s.dialog}>
        <div style={s.dialogHead}>
          <div style={{ ...s.avatar, fontSize: 28, fontWeight: 700, color: '#2563eb' }}>{patientName.charAt(0).toUpperCase()}</div>
          <div>
            <div style={s.badgeRow}>
              <span style={s.badge}>{a.patient.patient_code}</span>
              <span style={s.featuredBadge}>Chỉ xem</span>
            </div>
            <h2 style={s.dialogTitle}>Hồ sơ bệnh án · {patientName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" style={s.close}>×</button>
        </div>

        <div style={s.dialogBody}>
          <div style={s.sumGrid}>
            <Item label="Ngày khám" value={formatDate(a.appointment_date)} />
            <Item label="Giờ khám" value={`${a.start_time} - ${a.end_time}`} />
            <Item label="Bác sĩ" value={`${a.doctor.full_name} (${a.doctor.specialty})`} />
            <Item label="Số điện thoại" value={a.patient.phone || 'Chưa có'} />
            <Item label="Lập hồ sơ lúc" value={record ? formatDateTimeVN(record.created_at) || '—' : '...'} />
          </div>

          <div>
            <h3 style={s.sectionTitle}>Triệu chứng bệnh nhân khai</h3>
            <div style={s.textBox}>{a.symptoms || 'Không có'}</div>
          </div>

          {loading && <div style={s.emptyRx}>Đang tải hồ sơ bệnh án...</div>}

          {!loading && error && (
            <div role="alert" style={s.errBox}>
              <div style={{ marginBottom: notFound ? 0 : 10 }}>{error}</div>
              {!notFound && <button type="button" className="mh-btn" onClick={reload} style={s.btnLine}>Thử lại</button>}
            </div>
          )}

          {record && (
            <>
              <div>
                <h3 style={s.sectionTitle}>Kết luận / chẩn đoán</h3>
                <div style={s.textBox}>{record.diagnosis}</div>
              </div>

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
            <button type="button" className="mh-btn" onClick={onClose} style={s.btnLine}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}