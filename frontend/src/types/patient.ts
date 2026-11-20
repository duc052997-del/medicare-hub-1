// types/patient.ts
// UC012 (Admin quản lý bệnh nhân). Khớp hợp đồng API-28 (danh sách) và API-29 (chi tiết)
// trong "hop-dong-API-MediCare-Hub.xlsx" (cả hai đang ở trạng thái Draft).

import type { Appointment } from './index';
import type { MedicalRecordSummary } from './medical';
import type { Gender } from './profile';

// API-28: mỗi phần tử của "patients"
export interface PatientSummary {
  id: string;
  patient_code: string; // vd "BN012345"
  full_name: string | null; // bệnh nhân vừa đăng ký có thể chưa có họ tên
  phone: string | null;
  email: string;
  date_of_birth: string | null; // YYYY-MM-DD
  gender: Gender | null;
}

// API-29: "patient" = hồ sơ như API-13 + lịch hẹn (như API-09) + hồ sơ bệnh án (như API-11)
export interface PatientDetail extends Omit<PatientSummary, 'patient_code'> {
  patient_code?: string; // API-13 không có mã; nếu BE trả thì dùng, không thì lấy từ danh sách
  avatar_url: string | null;
  address: string | null;
  appointments: Appointment[];
  medical_records: MedicalRecordSummary[];
}
