// services/mocks/mockData.ts
// Dữ liệu giả, lấy theo seed.sql (cùng email, mật khẩu, bác sĩ, lịch làm việc).
// Thêm vài ca đặc biệt (tài khoản bị khóa, bác sĩ đã vô hiệu hóa) để test các nhánh lỗi.

import type { ClinicInfo, Doctor, UserRole } from '../../types';

// Mật khẩu của TẤT CẢ tài khoản mock (giống seed.sql)
export const MOCK_PASSWORD = 'Test@12345';

// Token mock hết hạn sau 1 ngày (giống JWT_EXPIRES_IN mặc định của BE)
export const MOCK_TOKEN_TTL_SECONDS = 24 * 60 * 60;

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export interface MockUser {
  id: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

const user = (n: number, email: string, username: string, role: UserRole, is_active = true): MockUser => ({
  id: uid(n),
  email,
  username,
  password: MOCK_PASSWORD,
  role,
  is_active,
  created_at: '2026-09-01T00:00:00Z',
});

export const SEED_USERS: MockUser[] = [
  user(1, 'admin@medicare.test', 'admin', 'ADMIN'),
  user(2, 'patient1@medicare.test', 'patient1', 'PATIENT'),
  user(3, 'patient2@medicare.test', 'patient2', 'PATIENT'),
  user(4, 'patient3@medicare.test', 'patient3', 'PATIENT'),
  // Thêm để test luồng 403 "Tài khoản đã bị khóa"
  user(5, 'locked@medicare.test', 'locked', 'PATIENT', false),
];

export const MOCK_CLINIC: ClinicInfo = {
  id: uid(100),
  name: 'Phòng khám MediCare Hub',
  description: 'Phòng khám đa khoa (dữ liệu mẫu cho đồ án).',
  hotline: '0900000000',
  address: 'Hà Nội (địa chỉ mẫu)',
  email: 'contact@medicare.test',
  working_hours: 'Thứ 2 - Thứ 6: 08:00 - 17:00',
};

export interface MockDoctor extends Doctor {
  is_featured: boolean;
  is_active: boolean;
}

const doctor = (
  n: number,
  full_name: string,
  specialty: string,
  is_featured: boolean,
  is_active = true
): MockDoctor => ({
  id: uid(200 + n),
  full_name,
  specialty,
  avatar_url: null, // null -> SafeImage hiện icon dự phòng
  bio: `Bác sĩ chuyên khoa ${specialty} (dữ liệu mẫu).`,
  is_featured,
  is_active,
});

export const MOCK_DOCTORS: MockDoctor[] = [
  doctor(1, 'BS. Phạm Minh Đức', 'Tim mạch', true),
  doctor(2, 'BS. Hoàng Thu Hà', 'Nhi khoa', true),
  doctor(3, 'BS. Vũ Quang Huy', 'Da liễu', true),
  doctor(4, 'BS. Đặng Mai Lan', 'Nội tổng quát', false),
  doctor(5, 'BS. Bùi Anh Tuấn', 'Tim mạch', false),
  doctor(6, 'BS. Ngô Thanh Mai', 'Nhi khoa', false),
  // Đã vô hiệu hóa: KHÔNG được hiện ra ở bất kỳ danh sách nào
  doctor(7, 'BS. Lý Văn Nam', 'Tai Mũi Họng', true, false),
];

export interface MockScheduleBlock {
  doctor_id: string | number;
  day_of_week: number; // 0 = Chủ nhật ... 6 = Thứ bảy
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

// Như seed.sql: Thứ 2-6, sáng 08-12 và chiều 13-17, slot 30 phút
export const MOCK_SCHEDULES: MockScheduleBlock[] = MOCK_DOCTORS.filter((d) => d.is_active).flatMap((d) =>
  [1, 2, 3, 4, 5].flatMap((dow) => [
    { doctor_id: d.id, day_of_week: dow, start_time: '08:00', end_time: '12:00', slot_minutes: 30 },
    { doctor_id: d.id, day_of_week: dow, start_time: '13:00', end_time: '17:00', slot_minutes: 30 },
  ])
);