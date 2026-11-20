// components/recordrow.tsx — 1 hàng = 1 hồ sơ bệnh án (1 lần khám đã hoàn tất).
// Cùng bố cục hàng lịch khám ở UC007: ảnh + chuyên khoa/nổi bật, tên bác sĩ cùng hàng với ngày khám,
// góc phải có nút "Xem chi tiết". API-11 chỉ trả ngày khám + chẩn đoán nên hàng chỉ hiện từng ấy.
import SafeImage from './safeimage';
import { formatDate } from '../utils/helpers';
import { recordStyles as s } from '../styles/records';
import type { Doctor } from '../types';
import type { MedicalRecordSummary } from '../types/medical';

interface RecordRowProps {
  record: MedicalRecordSummary;
  doctor?: Doctor; // thông tin giới thiệu (ảnh, mô tả) nếu tải được
  featured: boolean;
  onOpen: () => void;
}

export default function RecordRow({ record, doctor, featured, onOpen }: RecordRowProps) {
  return (
    <div className="mh-card" style={s.row}>
      <SafeImage
        src={doctor?.avatar_url ?? undefined}
        alt={record.doctor.full_name}
        style={s.avatarImg}
        fallback={<div style={s.avatar}>👨‍⚕️</div>}
      />

      <div style={s.info}>
        <div style={s.badgeRow}>
          <span style={s.badge}>{record.doctor.specialty}</span>
          {featured && <span style={s.featuredBadge}>⭐ Nổi bật</span>}
        </div>
        <div style={s.nameRow}>
          <h3 style={s.docName}>{record.doctor.full_name}</h3>
          <div style={s.meta}>
            <span>📅 {formatDate(record.appointment_date)}</span>
          </div>
        </div>
        <p style={s.bio}>{doctor?.bio || 'Chưa có mô tả.'}</p>
        <div style={s.line}><b>Chẩn đoán:</b> {record.diagnosis}</div>
      </div>

      <div style={s.aside}>
        <button className="mh-btn" onClick={onOpen} style={s.btnView}>Xem chi tiết</button>
      </div>
    </div>
  );
}