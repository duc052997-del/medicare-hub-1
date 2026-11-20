// components/patientrow.tsx — UC012: 1 hàng = 1 bệnh nhân trong danh sách (API-28).
// Cùng bố cục hàng của Lịch khám / Hồ sơ bệnh án: ảnh đại diện + huy hiệu, tên cùng hàng với thông tin liên hệ,
// góc phải có nút "Xem hồ sơ". API-28 không trả ảnh đại diện nên hiện chữ cái đầu của tên.
import { dobLabel, genderLabel, initialOf, orDash, patientName } from '../utils/patient';
import { patientStyles as s } from '../styles/patients';
import type { PatientSummary } from '../types/patient';

interface PatientRowProps {
  patient: PatientSummary;
  onOpen: () => void;
}

export default function PatientRow({ patient, onOpen }: PatientRowProps) {
  const hasName = !!patient.full_name?.trim();

  return (
    <div className="mh-card" style={s.row}>
      <div style={s.avatar} aria-hidden="true">{initialOf(patient)}</div>

      <div style={s.info}>
        <div style={s.badgeRow}>
          <span style={s.badgeCode}>{patient.patient_code}</span>
          {patient.gender && <span style={s.badgeGender}>{genderLabel(patient.gender)}</span>}
        </div>

        <div style={s.nameRow}>
          <h3 style={{ ...s.name, ...(hasName ? {} : s.muted) }}>{hasName ? patientName(patient) : 'Chưa cập nhật họ tên'}</h3>
          <div style={s.meta}>
            <span>📞 {orDash(patient.phone)}</span>
          </div>
        </div>

        <div style={s.line}><b>Email:</b> {patient.email}</div>
        <div style={s.line}><b>Ngày sinh:</b> {dobLabel(patient.date_of_birth)}</div>
      </div>

      <div style={s.aside}>
        <button type="button" className="mh-btn" onClick={onOpen} style={s.btnView}>Xem hồ sơ</button>
      </div>
    </div>
  );
}
