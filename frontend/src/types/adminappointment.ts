// types/adminappointment.ts
// UC011 phía Admin / API-25 (GET /admin/appointments). API-26 (đổi trạng thái) và API-27 (hoàn tất + hồ sơ bệnh án) 
import type { Appointment, AppointmentStatus } from './index';
import type { PrescriptionItem } from './medical';

// Thông tin bệnh nhân kèm theo mỗi lịch hẹn (chỉ API admin mới có)
export interface AppointmentPatient {
  id: string;
  patient_code: string; // BN012345
  full_name: string | null;
  phone: string | null;
}

// API-25: mỗi phần tử của "appointments" = đối tượng appointment dùng chung + patient
export interface AdminAppointment extends Appointment {
  patient: AppointmentPatient;
}

// Query của API-25 (tất cả tùy chọn)
export interface AdminAppointmentQuery {
  status?: AppointmentStatus;
  date?: string; // YYYY-MM-DD
  doctor_id?: string;
  q?: string; // tên / SĐT bệnh nhân
}

// Bộ lọc phía client trên màn hình (lọc thêm được theo chuyên khoa, triệu chứng...)
export interface AdminAppointmentFilter {
  keyword: string;
  status: AppointmentStatus | '';
  doctorId: string;
  date: string;
}

// ---------- Giai đoạn 2: API-26 PATCH /admin/appointments/:id/status ----------
// Admin chỉ được đặt 1 trong 3 trạng thái này (COMPLETED chỉ đi qua API-27 ở Giai đoạn 3)
export type AdminStatusAction = 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export interface AdminStatusResult {
  message: string;
  appointment: AdminAppointment;
}

// ---------- Giai đoạn 3: API-27 POST /admin/appointments/:id/medical-record ----------
// Hoàn tất lịch khám = lưu hồ sơ bệnh án (+ đơn thuốc) và đưa lịch sang COMPLETED trong 1 lần gọi.
// Nút ở hàng: 3 hành động đổi trạng thái (API-26) + "Hoàn tất" (API-27, có form riêng)
// + "Bệnh án" (lịch đã Hoàn tất: xem lại hồ sơ đã ghi, chỉ đọc, API-30 đề xuất)
export type AdminRowAction = AdminStatusAction | 'COMPLETED' | 'RECORD';

// 1 dòng thuốc gửi lên. Ô không điền thì BỎ KHÓA (không gửi chuỗi rỗng)
export interface PrescriptionInput {
  medicine_name: string; // bắt buộc
  dosage?: string;
  frequency?: string;
  duration_days?: number;
  instructions?: string;
}

export interface CompletePayload {
  diagnosis: string; // bắt buộc (kết luận)
  notes?: string;
  prescriptions: PrescriptionInput[]; // có thể rỗng = không kê đơn
}

// Response hợp đồng: "record" gồm id, appointment_id, diagnosis, notes, prescriptions
export interface CompletedRecord {
  id: string;
  appointment_id: string;
  diagnosis: string;
  notes: string | null;
  prescriptions: PrescriptionItem[];
}

export interface CompleteResult {
  message: string;
  record: CompletedRecord;
}

// ---------- Form hoàn tất (chỉ dùng ở FE) ----------
export interface RxFormItem {
  key: string; // khóa React, không gửi lên BE
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: string; // giữ dạng chuỗi trong ô nhập, đổi sang số khi gửi
  instructions: string;
}

export type RxField = Exclude<keyof RxFormItem, 'key'>;

export interface CompleteForm {
  diagnosis: string;
  notes: string;
  items: RxFormItem[];
}

export interface CompleteErrors {
  diagnosis?: string;
  notes?: string;
  items: Record<string, Partial<Record<RxField, string>>>; // theo key của dòng thuốc
}