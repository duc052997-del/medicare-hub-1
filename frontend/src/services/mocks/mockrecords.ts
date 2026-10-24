// services/mocks/mockrecords.ts
// Giả lập API-11 GET /medical-records và API-12 GET /medical-records/:id (đúng hình dạng hợp đồng):
//   - API-11 chỉ trả: id, appointment_id, appointment_date, doctor, diagnosis
//   - API-12 trả thêm: notes, created_at, prescriptions[{id, medicine_name, dosage, frequency, duration_days, instructions}]
// Dữ liệu mẫu cố định (không ghi), đủ các ca để Tester thử:
//   - patient1: 4 hồ sơ (1 hồ sơ KHÔNG kê đơn, 1 hồ sơ gắn với lịch COMPLETED trong mockstore)
//   - patient2: 1 hồ sơ  | patient3: chưa có hồ sơ (thử trạng thái rỗng)
//   - admin: 403 | chưa đăng nhập / token sai: 401 (mockCurrentUser)
//   - API-12 của hồ sơ người khác hoặc id lạ: 404 (không lộ sự tồn tại)
//   - localStorage mock_error_500 = '1': trả 500

import { ApiError } from '../apierror';
import type { MedicalRecord, MedicalRecordSummary, PrescriptionItem } from '../../types/medical';
import { MOCK_DOCTORS, SEED_USERS } from './mockdata';
import { mockCurrentUser } from './mockauth';
import { delay, flag } from './mockutils';

const FORBIDDEN = 'Bạn không có quyền truy cập chức năng này';
const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';
const NOT_FOUND = 'Không tìm thấy hồ sơ bệnh án';

const userId = (email: string) => SEED_USERS.find((u) => u.email === email)!.id;
const doctorOf = (name: string) => {
  const d = MOCK_DOCTORS.find((x) => x.full_name === name)!;
  return { id: d.id, full_name: d.full_name, specialty: d.specialty };
};
const apptId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const rx = (
  rec: number, i: number, medicine_name: string, dosage: string, frequency: string,
  days: number | null, instructions: string | null = null
): PrescriptionItem => ({
  id: `00000000-0000-4000-8001-${String(rec * 10 + i).padStart(12, '0')}`,
  medicine_name,
  dosage,
  frequency,
  duration_days: days,
  instructions,
});

interface Row {
  patient_id: string;
  record: MedicalRecord;
}

const row = (
  n: number, email: string, doctorName: string, appt: number, date: string,
  diagnosis: string, notes: string | null, created_at: string, prescriptions: PrescriptionItem[]
): Row => ({
  patient_id: userId(email),
  record: {
    id: `00000000-0000-4000-8002-${String(n).padStart(12, '0')}`,
    appointment_id: apptId(appt),
    appointment_date: date,
    doctor: doctorOf(doctorName),
    diagnosis,
    notes,
    created_at,
    prescriptions,
  },
});

const ROWS: Row[] = [
  // Gắn với lịch mẫu 903 (COMPLETED) trong mockstore: patient1 - BS. Vũ Quang Huy - 20/09/2026
  row(1, 'patient1@medicare.test', 'BS. Vũ Quang Huy', 903, '2026-09-20',
    'Viêm da dị ứng (eczema) thể nhẹ',
    'Tránh tiếp xúc hóa chất, giữ ẩm da. Tái khám sau 2 tuần nếu không đỡ.',
    '2026-09-20T08:10:00Z',
    [
      rx(1, 1, 'Cetirizine 10mg', '1 viên', '1 lần/ngày, buổi tối', 7, 'Uống sau ăn'),
      rx(1, 2, 'Kem Hydrocortisone 1%', 'Bôi lớp mỏng vùng da tổn thương', '2 lần/ngày', 5, 'Tránh bôi vào mắt và niêm mạc'),
      rx(1, 3, 'Kem dưỡng ẩm', 'Bôi toàn thân', '2 lần/ngày', 30),
    ]),
  row(2, 'patient1@medicare.test', 'BS. Phạm Minh Đức', 910, '2026-08-14',
    'Tăng huyết áp độ 1',
    'Giảm muối, tập thể dục 30 phút mỗi ngày, theo dõi huyết áp tại nhà.',
    '2026-08-14T03:00:00Z',
    [rx(2, 1, 'Amlodipine 5mg', '1 viên', '1 lần/ngày, buổi sáng', 30, 'Uống đều mỗi ngày, không tự ý ngưng thuốc')]),
  row(3, 'patient1@medicare.test', 'BS. Đặng Mai Lan', 911, '2026-07-02',
    'Cảm cúm thông thường',
    'Uống nhiều nước, nghỉ ngơi.',
    '2026-07-02T02:20:00Z',
    [
      rx(3, 1, 'Paracetamol 500mg', '1 viên', 'Khi sốt trên 38,5°C, cách nhau ít nhất 6 giờ', 3, 'Không quá 4 viên mỗi ngày'),
      rx(3, 2, 'Vitamin C 500mg', '1 viên', '1 lần/ngày', 5, 'Uống sau ăn sáng'),
    ]),
  // Hồ sơ KHÔNG kê đơn thuốc, không có ghi chú (thử nhánh "không kê đơn")
  row(4, 'patient1@medicare.test', 'BS. Bùi Anh Tuấn', 912, '2026-06-10',
    'Khám tim mạch định kỳ, chưa phát hiện bất thường',
    null,
    '2026-06-10T08:40:00Z',
    []),
  row(5, 'patient2@medicare.test', 'BS. Hoàng Thu Hà', 913, '2026-09-15',
    'Viêm họng cấp',
    'Súc họng nước muối ấm, hạn chế đồ lạnh.',
    '2026-09-15T03:30:00Z',
    [
      rx(5, 1, 'Amoxicillin 500mg', '1 viên', '3 lần/ngày', 5, 'Uống sau ăn, uống đủ liều'),
      rx(5, 2, 'Siro ho thảo dược', '5ml', '3 lần/ngày', 5),
    ]),
];

// verifyToken + requireRole('PATIENT') của BE: 401 nếu chưa đăng nhập/token sai, 403 nếu không phải bệnh nhân
const requirePatient = () => {
  if (flag('mock_error_500')) throw new ApiError(500, SERVER_ERROR);
  const user = mockCurrentUser();
  if (user.role !== 'PATIENT') throw new ApiError(403, FORBIDDEN);
  return user;
};

const toSummary = ({ id, appointment_id, appointment_date, doctor, diagnosis }: MedicalRecord): MedicalRecordSummary => ({
  id, appointment_id, appointment_date, doctor, diagnosis,
});

// ================= API-11  GET /medical-records =================
// Chỉ trả hồ sơ của chính người đăng nhập, ngày khám giảm dần; chưa có hồ sơ -> mảng rỗng (200).
export const mockGetMyRecords = async (): Promise<MedicalRecordSummary[]> => {
  await delay(150, 400);
  const user = requirePatient();
  return ROWS.filter((r) => r.patient_id === user.id)
    .map((r) => r.record)
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
    .map(toSummary);
};

// ================= API-12  GET /medical-records/:id =================
// Hồ sơ của người khác cũng trả 404 để không lộ sự tồn tại.
export const mockGetRecord = async (id: string): Promise<MedicalRecord> => {
  await delay(150, 400);
  const user = requirePatient();
  const found = ROWS.find((r) => r.record.id === id);
  if (!found || found.patient_id !== user.id) throw new ApiError(404, NOT_FOUND);
  return found.record;
};