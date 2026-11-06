// services/mocks/mockrecordstore.ts
// UC011: "bảng medical_records" do Admin tạo khi hoàn tất lịch (API-27).
// Lưu localStorage (mock_created_records) để F5 không mất; reset mock_* thì xóa được.
// mockrecords.ts đọc kho này (allRows) — UC008 bệnh nhân + UC012 Admin xem bệnh nhân.

import type { MedicalRecord } from '../../types/medical';

export interface CreatedRecordRow {
  patient_id: string;
  record: MedicalRecord;
}

const KEY = 'mock_created_records';
let memory: CreatedRecordRow[] = [];

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
    /* đã có memory */
  }
};

/** Unique(appointment_id): 1 lịch tối đa 1 hồ sơ */
export const hasRecordForAppointment = (appointmentId: string) =>
  loadCreatedRecords().some((r) => r.record.appointment_id === appointmentId);
