// types/index.ts
// NGUỒN DUY NHẤT cho các kiểu dữ liệu FE dùng chung. Phải khớp "hop-dong-API-MediCare-Hub.xlsx".
// Đổi hợp đồng API -> sửa file này trước, TypeScript sẽ báo mọi chỗ cần sửa theo.

export type UserRole = 'PATIENT' | 'ADMIN';

// API-02, API-03
export interface AuthUser {
  id: string | number;
  email: string;
  username: string | null;
  role: UserRole;
}

// API-06, API-07
export interface Doctor {
  id: string | number;
  full_name: string;
  specialty: string;
  avatar_url: string | null;
  bio: string | null;
}

// API-08
export interface Slot {
  time: string; // "HH:mm"
  available: boolean;
}

export interface ScheduleResult {
  doctor: Pick<Doctor, 'id' | 'full_name' | 'specialty'>;
  date: string; // YYYY-MM-DD
  slots: Slot[];
}

// API-05
export interface ClinicInfo {
  id: string | number;
  name: string | null;
  description: string | null;
  hotline: string | null;
  address: string | null;
  email: string | null;
  working_hours?: string | null;
  workingHours?: string | null; // dự phòng nếu BE đổi tên field
}

// API-01
export interface RegisterPayload {
  email: string;
  username: string; // BE bắt buộc, <= 50 ký tự
  password: string;
  confirmPassword: string;
}

export interface RegisterResult {
  message: string;
  user: AuthUser & { created_at?: string };
}

// API-02
export interface LoginResult {
  message: string;
  token: string;
  user: AuthUser;
}

// Các hàm điều hướng dùng chung cho Header (App.tsx tạo 1 lần, truyền xuống các trang)
export interface NavHandlers {
  onHome: () => void;
  onDoctors: () => void;
  onSchedule: () => void;
  onContact: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
}

// ---------- Sprint 3: lịch hẹn (API-09, API-10, API-22) ----------
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

// Đối tượng 'appointment' dùng chung trong hợp đồng
export interface Appointment {
  id: string;
  doctor: Pick<Doctor, 'id' | 'full_name' | 'specialty'>;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  symptoms: string | null;
  status: AppointmentStatus;
  cancel_reason: string | null;
  cancelled_at: string | null; // ISO, có khi status = CANCELLED
  created_at: string;
}

// API-09 request. Hợp đồng: request snake_case; chuyên khoa chỉ là bộ lọc trên FE, không gửi
export interface BookingPayload {
  doctor_id: string | number;
  date: string; // YYYY-MM-DD, không ở quá khứ
  time: string; // HH:mm, phải là 1 slot trong lịch làm việc
  symptoms: string; // bắt buộc, <= 500 ký tự
}

export interface BookingResult {
  message: string;
  appointment: Appointment;
}

// API-22 response (hủy lịch): appointment trả về với status CANCELLED, cancel_reason, cancelled_at
export type CancelResult = BookingResult;