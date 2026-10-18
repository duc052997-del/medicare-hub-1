// services/mocks/mockstore.ts
// "Bảng appointments" của mock. Lưu localStorage (khóa mock_appointments) để F5 không mất;
// nút MOCK MODE xóa mọi khóa bắt đầu bằng mock_ nên reset được.
// Lần đầu tự nạp lịch mẫu: 3 lịch đúng như seed.sql + 2 lịch ở tương lai (1 chờ xác nhận, 1 đã hủy)
// để thử UC007 (nút Hủy, hiển thị thời gian hủy) mà không phải đặt lịch trước.

import type { AppointmentStatus } from '../../types';
import { addDays, todayVN } from '../../utils/schedule';
import { MOCK_DOCTORS, SEED_USERS } from './mockdata';

export interface MockAppointment {
  id: string;
  patient_id: string; // mock không tách bảng patients nên dùng luôn users.id
  doctor_id: string | number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  symptoms: string | null;
  status: AppointmentStatus;
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
}

const KEY = 'mock_appointments';

const userId = (email: string) => SEED_USERS.find((u) => u.email === email)!.id;
const doctorId = (name: string) => MOCK_DOCTORS.find((d) => d.full_name === name)!.id;

// Ngày làm việc (Thứ 2-6) đầu tiên cách hôm nay ít nhất `minDays` ngày
const nextWeekday = (minDays: number) => {
  let day = addDays(todayVN(), minDays);
  for (let i = 0; i < 7; i++) {
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    if (dow >= 1 && dow <= 5) break;
    day = addDays(day, 1);
  }
  return day;
};

const seedRow = (
  n: number, patientEmail: string, doctorName: string, date: string, start: string, end: string,
  symptoms: string, status: AppointmentStatus,
  extra: Partial<Pick<MockAppointment, 'cancel_reason' | 'cancelled_at' | 'created_at'>> = {}
): MockAppointment => ({
  id: `00000000-0000-4000-8000-${String(900 + n).padStart(12, '0')}`,
  patient_id: userId(patientEmail),
  doctor_id: doctorId(doctorName),
  appointment_date: date,
  start_time: start,
  end_time: end,
  symptoms,
  status,
  cancel_reason: extra.cancel_reason ?? null,
  cancelled_at: extra.cancelled_at ?? null,
  created_at: extra.created_at ?? '2026-10-06T02:00:00Z',
});

const buildSeed = (): MockAppointment[] => [
  // Cùng dữ liệu với phần "lịch hẹn mẫu" của seed.sql
  seedRow(1, 'patient1@medicare.test', 'BS. Phạm Minh Đức', '2026-10-12', '09:00', '09:30', 'Đau tức ngực nhẹ', 'CONFIRMED'),
  seedRow(2, 'patient2@medicare.test', 'BS. Hoàng Thu Hà', '2026-10-13', '10:00', '10:30', 'Sốt, ho', 'PENDING'),
  seedRow(3, 'patient1@medicare.test', 'BS. Vũ Quang Huy', '2026-09-20', '14:00', '14:30', 'Nổi mẩn đỏ', 'COMPLETED'),
  // Thêm cho UC007: lịch tương lai còn hủy được + lịch đã hủy (có thời gian hủy, lý do)
  seedRow(4, 'patient1@medicare.test', 'BS. Đặng Mai Lan', nextWeekday(5), '08:30', '09:00', 'Đau đầu, mệt mỏi kéo dài', 'PENDING',
    { created_at: new Date().toISOString() }),
  seedRow(5, 'patient1@medicare.test', 'BS. Bùi Anh Tuấn', nextWeekday(8), '15:00', '15:30', 'Hồi hộp, khó thở khi leo cầu thang', 'CANCELLED',
    { cancel_reason: 'Bận việc đột xuất', cancelled_at: new Date().toISOString(), created_at: new Date().toISOString() }),
];

let memory: MockAppointment[] | null = null; // dự phòng khi localStorage không dùng được

export const loadAppointments = (): MockAppointment[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as MockAppointment[];
    const seed = buildSeed();
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return (memory ??= buildSeed());
  }
};

const save = (list: MockAppointment[]) => {
  memory = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* bỏ qua, đã có bản trong bộ nhớ */
  }
};

// Giống unique index của schema.sql: chỉ lịch PENDING / CONFIRMED / COMPLETED mới "giữ chỗ"
// (REJECTED, CANCELLED giải phóng khung giờ).
const HOLDING: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED'];
const holds = (a: MockAppointment) => HOLDING.includes(a.status);

// appointments_no_double_booking: 1 bác sĩ, 1 ngày, 1 giờ bắt đầu chỉ có 1 lịch còn hiệu lực
export const isSlotTaken = (doctor: string | number, date: string, time: string) =>
  loadAppointments().some(
    (a) => holds(a) && String(a.doctor_id) === String(doctor) && a.appointment_date === date && a.start_time === time
  );

// appointments_patient_no_overlap: 1 bệnh nhân không có 2 lịch cùng giờ
export const patientHasSlot = (patient: string, date: string, time: string) =>
  loadAppointments().some((a) => holds(a) && a.patient_id === patient && a.appointment_date === date && a.start_time === time);

export const addAppointment = (a: MockAppointment) => save([...loadAppointments(), a]);

export const listByPatient = (patient: string) => loadAppointments().filter((a) => a.patient_id === patient);

export const findAppointment = (id: string) => loadAppointments().find((a) => a.id === id);

// Cập nhật 1 lịch (hủy, sau này: xác nhận/từ chối/hoàn tất ở Sprint 5). Trả về bản đã cập nhật.
export const updateAppointment = (id: string, patch: Partial<MockAppointment>) => {
  let updated: MockAppointment | undefined;
  save(loadAppointments().map((a) => (a.id === id ? (updated = { ...a, ...patch }) : a)));
  return updated;
};