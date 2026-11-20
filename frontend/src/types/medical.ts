// types/medical.ts
// UC008: hồ sơ bệnh án + đơn thuốc. Khớp hợp đồng API-11 (danh sách) và API-12 (chi tiết)
// trong "hop-dong-API-MediCare-Hub.xlsx" (cả hai đang ở trạng thái Draft).

import type { Doctor } from './index';

// 1 dòng thuốc trong đơn (bảng prescription_items) - API-12
export interface PrescriptionItem {
  id: string;
  medicine_name: string;
  dosage: string; // liều dùng, vd "1 viên"
  frequency: string; // tần suất, vd "1 lần/ngày"
  duration_days: number | null; // số ngày dùng
  instructions: string | null; // hướng dẫn, vd "Uống sau ăn"
}

// API-11: mỗi phần tử của "records" (danh sách, CHƯA có đơn thuốc, ghi chú, giờ khám)
export interface MedicalRecordSummary {
  id: string;
  appointment_id: string;
  appointment_date: string; // YYYY-MM-DD
  doctor: Pick<Doctor, 'id' | 'full_name' | 'specialty'>;
  diagnosis: string; // kết luận / chẩn đoán
}

// API-12: "record" (chi tiết = danh sách + ghi chú + thời gian lập + đơn thuốc)
export interface MedicalRecord extends MedicalRecordSummary {
  notes: string | null; // ghi chú, lời dặn của bác sĩ
  created_at: string; // ISO
  prescriptions: PrescriptionItem[]; // có thể rỗng (không kê đơn)
}