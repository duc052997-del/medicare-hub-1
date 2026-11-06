// services/mocks/mockpatients.ts
// Giả lập API-28 GET /admin/patients và API-29 GET /admin/patients/:id (UC012).
// Dữ liệu lấy từ: 3 bệnh nhân của seed.sql + tài khoản bị khóa + vài bệnh nhân mẫu thêm (để thử "Xem thêm"),
// cộng các tài khoản vừa đăng ký trong mock (localStorage mock_users) và hồ sơ đã sửa ở UC009 (mock_profiles).
// Lịch hẹn lấy từ mockstore, hồ sơ bệnh án lấy từ mockrecords nên khớp với những gì bệnh nhân thấy.
// Mã lỗi để Tester thử:
//   - 401: chưa đăng nhập / token sai (mockCurrentUser) | 403: tài khoản bệnh nhân gọi API admin
//   - API-29 id lạ: 404 "Không tìm thấy bệnh nhân"
//   - localStorage mock_error_500 = '1': trả 500 (thử màn hình "Lỗi tải dữ liệu")

import { ApiError } from '../apierror';
import type { Appointment } from '../../types';
import type { Gender, UserProfile } from '../../types/profile';
import type { PatientDetail, PatientSummary } from '../../types/patient';
import { MockUser, SEED_USERS } from './mockdata';
import { getCatalogDoctors } from './mockadmindoctors';
import { mockCurrentUser } from './mockauth';
import { loadAppointments } from './mockstore';
import { listRecordsByPatient } from './mockrecords';
import { delay, flag } from './mockutils';
import { normalize } from '../../utils/text';

const FORBIDDEN = 'Bạn không có quyền truy cập chức năng này';
const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';
const NOT_FOUND = 'Không tìm thấy bệnh nhân';

// verifyToken + requireRole('ADMIN') của BE: 401 nếu chưa đăng nhập/token sai, 403 nếu không phải admin
const requireAdmin = () => {
  if (flag('mock_error_500')) throw new ApiError(500, SERVER_ERROR);
  const user = mockCurrentUser();
  if (user.role !== 'ADMIN') throw new ApiError(403, FORBIDDEN);
  return user;
};

// ---------- "Bảng patients" ----------
interface PatientInfo {
  code: string;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  address: string | null;
}

const info = (
  code: string, full_name: string | null, phone: string | null, date_of_birth: string | null,
  gender: Gender | null, address: string | null
): PatientInfo => ({ code, full_name, phone, date_of_birth, gender, address });

// Giống phần patients của seed.sql (khóa = email)
const SEED_INFO: Record<string, PatientInfo> = {
  'patient1@medicare.test': info('BN000001', 'Nguyễn Văn An', '0911111111', '1995-03-12', 'MALE', 'Hà Nội'),
  'patient2@medicare.test': info('BN000002', 'Trần Thị Bình', '0922222222', '1990-07-25', 'FEMALE', 'Hà Nội'),
  'patient3@medicare.test': info('BN000003', 'Lê Hoàng Cường', '0933333333', '2000-11-02', 'MALE', 'Hà Nội'),
  // Tài khoản bị khóa, chưa nhập thông tin cá nhân (thử ô trống "—")
  'locked@medicare.test': info('BN000004', null, null, null, null, null),
};

// Bệnh nhân mẫu thêm (chưa có lịch/hồ sơ) để đủ trang thử "Xem thêm" và tìm kiếm
const EXTRA: { email: string; info: PatientInfo }[] = [
  { email: 'hoa.pham@medicare.test', info: info('BN000005', 'Phạm Thị Hoa', '0944000005', '1988-01-30', 'FEMALE', 'Hải Phòng') },
  { email: 'nam.do@medicare.test', info: info('BN000006', 'Đỗ Quốc Nam', '0955000006', '1979-09-09', 'MALE', 'Nam Định') },
  { email: 'lan.vu@medicare.test', info: info('BN000007', 'Vũ Ngọc Lan', '0966000007', '2005-05-20', 'FEMALE', 'Bắc Ninh') },
  { email: 'khoa.ly@medicare.test', info: info('BN000008', 'Lý Đăng Khoa', '0977000008', '1998-12-01', 'OTHER', 'Hà Nội') },
];

const extraUser = (n: number, email: string): MockUser => ({
  id: `00000000-0000-4000-8000-${String(300 + n).padStart(12, '0')}`,
  email,
  username: email.split('@')[0],
  password: '',
  role: 'PATIENT',
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
});

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

// Mã bệnh nhân của tài khoản đăng ký mới: "BN" + 6 số suy ra từ id (cố định mỗi lần gọi)
const codeFromId = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 1_000_000;
  return `BN${String(h).padStart(6, '0')}`;
};

interface Row {
  user: MockUser;
  info: PatientInfo;
}

const allPatients = (): Row[] => {
  const overrides = readJson<Record<string, Partial<UserProfile>>>('mock_profiles', {});
  const registered = readJson<MockUser[]>('mock_users', []);

  const seeded: Row[] = SEED_USERS.filter((u) => u.role === 'PATIENT' && SEED_INFO[u.email]).map((u) => ({
    user: u,
    info: SEED_INFO[u.email],
  }));
  const extra: Row[] = EXTRA.map((e, i) => ({ user: extraUser(i + 1, e.email), info: e.info }));
  const fresh: Row[] = registered
    .filter((u) => u.role === 'PATIENT')
    .map((u) => ({ user: u, info: info(codeFromId(u.id), u.username || null, null, null, null, null) }));

  // Hồ sơ người dùng tự sửa ở UC009 (mockprofile) ghi đè lên dữ liệu gốc
  return [...seeded, ...extra, ...fresh].map(({ user, info: base }) => {
    const o = overrides[user.id];
    if (!o) return { user, info: base };
    return {
      user: { ...user, email: o.email ?? user.email },
      info: {
        ...base,
        full_name: o.full_name ?? base.full_name,
        phone: o.phone ?? base.phone,
        date_of_birth: o.date_of_birth ?? base.date_of_birth,
        gender: o.gender ?? base.gender,
        address: o.address ?? base.address,
      },
    };
  });
};

const toSummary = ({ user, info: i }: Row): PatientSummary => ({
  id: user.id,
  patient_code: i.code,
  full_name: i.full_name,
  phone: i.phone,
  email: user.email,
  date_of_birth: i.date_of_birth,
  gender: i.gender,
});

const avatarOf = (id: string) => readJson<Record<string, Partial<UserProfile>>>('mock_profiles', {})[id]?.avatar_url ?? null;

// Hình dạng 'appointment' dùng chung của hợp đồng (API-09)
const appointmentsOf = (patientId: string): Appointment[] =>
  loadAppointments()
    .filter((a) => a.patient_id === patientId)
    .sort((a, b) => `${b.appointment_date} ${b.start_time}`.localeCompare(`${a.appointment_date} ${a.start_time}`))
    .map((a) => {
      const d = getCatalogDoctors().find((x) => String(x.id) === String(a.doctor_id));
      return {
        id: a.id,
        doctor: { id: a.doctor_id, full_name: d?.full_name ?? '', specialty: d?.specialty ?? '' },
        appointment_date: a.appointment_date,
        start_time: a.start_time,
        end_time: a.end_time,
        symptoms: a.symptoms,
        status: a.status,
        cancel_reason: a.cancel_reason,
        cancelled_at: a.cancelled_at ?? null,
        created_at: a.created_at,
      };
    });

// ================= API-28  GET /admin/patients =================
// q khớp gần đúng, không phân biệt hoa/thường và dấu, theo tên / mã bệnh nhân / số điện thoại.
export const mockGetPatients = async (q?: string): Promise<PatientSummary[]> => {
  await delay(150, 400);
  requireAdmin();

  const kw = normalize((q ?? '').trim());
  return allPatients()
    .map(toSummary)
    .filter((p) => !kw || normalize([p.full_name ?? '', p.patient_code, p.phone ?? ''].join(' ')).includes(kw))
    .sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, 'vi'));
};

// ================= API-29  GET /admin/patients/:id =================
export const mockGetPatient = async (id: string): Promise<PatientDetail> => {
  await delay(150, 400);
  requireAdmin();

  const row = allPatients().find((r) => r.user.id === id);
  if (!row) throw new ApiError(404, NOT_FOUND);

  return {
    ...toSummary(row),
    avatar_url: avatarOf(row.user.id),
    address: row.info.address,
    appointments: appointmentsOf(row.user.id),
    medical_records: listRecordsByPatient(row.user.id),
  };
};
