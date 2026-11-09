// services/mocks/mockrecordstore.ts
// "Bảng medical_records" do Admin tạo khi hoàn tất lịch (API-27). Lưu localStorage (khóa mock_created_records)
// để F5 không mất; nút MOCK MODE xóa mọi khóa bắt đầu bằng mock_ nên reset được.
// mockrecords.ts (UC008, bệnh nhân) đọc kho này để hồ sơ mới hiện ngay bên phía bệnh nhân.

import type { MedicalRecord } from '../../types/medical';

export interface CreatedRecordRow {
  patient_id: string; // mock không tách bảng patients nên dùng luôn users.id
  record: MedicalRecord;
}

const KEY = 'mock_created_records';
let memory: CreatedRecordRow[] = []; // dự phòng khi localStorage không dùng được

export const loadCreatedRecords = (): CreatedRecordRow[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CreatedRecordRow[]) : memory;
  } catch {
    return memory;
  }
};

export const addCreatedRecord = (row: CreatedRecordRow) => {
  memory = [...loadCreatedRecords(), row];
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* bỏ qua, đã có bản trong bộ nhớ */
  }
};

// Giống unique(appointment_id) của bảng medical_records: 1 lịch tối đa 1 hồ sơ
export const hasRecordForAppointment = (appointmentId: string) =>
  loadCreatedRecords().some((r) => r.record.appointment_id === appointmentId);
