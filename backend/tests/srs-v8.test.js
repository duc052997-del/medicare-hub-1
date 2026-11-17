/**
 * SRS v8 - các quy tắc BE phải tự kiểm tra (không dựa vào FE):
 * - UC006/UC011: ngày khám từ ngày mai đến ngày mai + 30, giờ khám >= 24 giờ.
 * - UC011: đổi lịch đưa lịch về PENDING.
 * - UC011 Admin: chỉ xác nhận khi chưa đến giờ khám; chỉ hoàn tất khi đã đến giờ;
 *   giới hạn độ dài bệnh án / đơn thuốc.
 * - UC002: sai email hoặc mật khẩu trả cùng một thông báo.
 * Thời gian cố định: 2026-11-17 10:00 giờ VN (03:00 UTC).
 */

jest.mock('../src/config/supabase.config', () => ({ from: jest.fn(), rpc: jest.fn() }));
jest.mock('../src/config/env.config', () => ({ env: { JWT_SECRET: 'test', JWT_EXPIRES_IN: '1h' } }));

const bcrypt = require('bcryptjs');
const supabase = require('../src/config/supabase.config');
const { isWithinBookingWindow } = require('../src/utils/schedule');
const { createAppointment, rescheduleAppointment } = require('../src/controllers/appointment.controller');
const {
  updateAppointmentStatus,
  completeAppointmentWithRecord,
} = require('../src/controllers/adminAppointment.controller');
const { login } = require('../src/controllers/auth.controller');

const APPT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

// Query giả lập chuỗi PostgREST; await trực tiếp cũng trả result.
const makeQuery = (result) => {
  const q = {};
  ['select', 'eq', 'neq', 'update', 'insert', 'order', 'or', 'in'].forEach((n) => {
    q[n] = jest.fn().mockReturnValue(q);
  });
  q.maybeSingle = jest.fn().mockResolvedValue(result);
  q.single = jest.fn().mockResolvedValue(result);
  q.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return q;
};
const ok = (data) => makeQuery({ data, error: null });

const queueTables = (map) => {
  const queues = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
  supabase.from.mockImplementation((table) => {
    if (!queues[table] || !queues[table].length) throw new Error(`Thiếu mock ${table}`);
    return queues[table].shift();
  });
};

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};
const body = (res) => res.json.mock.calls[0][0];

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-17T03:00:00Z'));
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('Cửa sổ đặt lịch (isWithinBookingWindow)', () => {
  test.each([
    ['2026-11-17', '15:00', false, 'hôm nay'],
    ['2026-11-18', '09:30', false, 'ngày mai nhưng chưa đủ 24 giờ'],
    ['2026-11-18', '10:00', true, 'đúng 24 giờ'],
    ['2026-12-18', '08:00', true, 'ngày cuối (ngày mai + 30)'],
    ['2026-12-19', '08:00', false, 'quá ngày mai + 30'],
  ])('%s %s -> %s (%s)', (date, time, expected) => {
    expect(isWithinBookingWindow(date, time)).toBe(expected);
  });
});

describe('UC006 - BE chặn giờ ngoài cửa sổ', () => {
  test('đặt lịch hôm nay -> 400 OUT_OF_BOOKING_WINDOW, không truy vấn DB', async () => {
    const res = makeRes();
    await createAppointment(
      { user: { id: 'u1', role: 'PATIENT' }, body: { doctor_id: DOCTOR_ID, date: '2026-11-17', time: '15:00', symptoms: 'ho' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(body(res).code).toBe('OUT_OF_BOOKING_WINDOW');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('UC011 - đổi lịch', () => {
  const ownAppt = {
    id: APPT_ID, patient_id: 'p1', status: 'CONFIRMED', appointment_date: '2026-11-20',
    start_time: '09:00:00', end_time: '09:30:00', doctor: { id: DOCTOR_ID, full_name: 'BS A', specialty: 'Nhi' },
  };

  test('giờ mới chưa đủ 24 giờ -> 400, không cập nhật', async () => {
    const res = makeRes();
    await rescheduleAppointment({ user: { id: 'u1' }, params: { id: APPT_ID }, body: { date: '2026-11-18', time: '08:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(body(res).code).toBe('OUT_OF_BOOKING_WINDOW');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('lịch CONFIRMED đổi giờ thành công -> trạng thái về PENDING', async () => {
    const update = ok({ ...ownAppt, appointment_date: '2026-11-25', start_time: '10:00:00', end_time: '10:30:00', status: 'PENDING' });
    queueTables({
      patients: [ok({ id: 'p1' })],
      appointments: [ok(ownAppt), update],
      doctor_schedules: [ok([{ start_time: '08:00:00', end_time: '12:00:00', slot_minutes: 30 }])],
    });
    const res = makeRes();
    await rescheduleAppointment({ user: { id: 'u1' }, params: { id: APPT_ID }, body: { date: '2026-11-25', time: '10:00' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING', appointment_date: '2026-11-25' }));
    expect(body(res).appointment.status).toBe('PENDING');
  });
});

describe('UC011 Admin - xác nhận theo giờ khám', () => {
  test('xác nhận lịch đã qua giờ -> 400 APPOINTMENT_TIME_PASSED', async () => {
    queueTables({ appointments: [ok({ id: APPT_ID, status: 'PENDING', appointment_date: '2026-11-17', start_time: '09:00:00' })] });
    const res = makeRes();
    await updateAppointmentStatus({ params: { id: APPT_ID }, body: { status: 'CONFIRMED' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(body(res).code).toBe('APPOINTMENT_TIME_PASSED');
  });

  test('từ chối lịch đã qua giờ vẫn được phép', async () => {
    const update = ok({ id: APPT_ID, status: 'REJECTED', start_time: '09:00:00', end_time: '09:30:00' });
    queueTables({ appointments: [ok({ id: APPT_ID, status: 'PENDING', appointment_date: '2026-11-17', start_time: '09:00:00' }), update] });
    const res = makeRes();
    await updateAppointmentStatus({ params: { id: APPT_ID }, body: { status: 'REJECTED' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('xác nhận lịch chưa đến giờ -> 200', async () => {
    const update = ok({ id: APPT_ID, status: 'CONFIRMED', start_time: '09:00:00', end_time: '09:30:00' });
    queueTables({ appointments: [ok({ id: APPT_ID, status: 'PENDING', appointment_date: '2026-11-19', start_time: '09:00:00' }), update] });
    const res = makeRes();
    await updateAppointmentStatus({ params: { id: APPT_ID }, body: { status: 'CONFIRMED' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('UC011 Admin - hoàn tất khám', () => {
  const req = (b) => ({ params: { id: APPT_ID }, body: { diagnosis: 'Cảm cúm', ...b } });

  test('chưa đến giờ khám -> 400 NOT_STARTED, không gọi RPC', async () => {
    queueTables({ appointments: [ok({ id: APPT_ID, appointment_date: '2026-11-17', start_time: '11:00:00' })] });
    const res = makeRes();
    await completeAppointmentWithRecord(req(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(body(res).code).toBe('NOT_STARTED');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test.each([
    ['kết luận quá 1000 ký tự', { diagnosis: 'a'.repeat(1001) }, 'diagnosis'],
    ['ghi chú quá 2000 ký tự', { notes: 'a'.repeat(2001) }, 'notes'],
    ['quá 20 dòng thuốc', { prescriptions: Array.from({ length: 21 }, () => ({ medicine_name: 'X' })) }, 'prescriptions'],
    ['số ngày ngoài 1-365', { prescriptions: [{ medicine_name: 'X', duration_days: 400 }] }, 'prescriptions'],
    ['dòng có dữ liệu nhưng thiếu tên thuốc', { prescriptions: [{ dosage: '1 viên' }] }, 'prescriptions'],
  ])('%s -> 400', async (_, b, field) => {
    const res = makeRes();
    await completeAppointmentWithRecord(req(b), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(body(res).field).toBe(field);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('đã đến giờ, dữ liệu hợp lệ -> gọi RPC, bỏ qua dòng thuốc trống', async () => {
    queueTables({ appointments: [ok({ id: APPT_ID, appointment_date: '2026-11-17', start_time: '09:00:00' })] });
    supabase.rpc.mockResolvedValue({ data: { id: 'r1' }, error: null });
    const res = makeRes();
    await completeAppointmentWithRecord(req({ prescriptions: [{ medicine_name: 'Paracetamol', duration_days: 3 }, { medicine_name: '' }] }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(supabase.rpc.mock.calls[0][1].p_prescriptions).toHaveLength(1);
  });
});

describe('UC002 - thông báo sai thông tin đăng nhập dùng chung', () => {
  test('email chưa đăng ký và sai mật khẩu trả cùng thông báo, không có field', async () => {
    jest.useRealTimers();
    const hash = await bcrypt.hash('DungMatKhau1', 4);
    queueTables({ users: [ok(null), ok({ id: 'u1', email: 'a@x.com', password_hash: hash, role: 'PATIENT', is_active: true })] });

    const r1 = makeRes();
    await login({ body: { email: 'khongco@x.com', password: 'abcdefgh' } }, r1);
    const r2 = makeRes();
    await login({ body: { email: 'a@x.com', password: 'SaiMatKhau1' } }, r2);

    expect(r1.status).toHaveBeenCalledWith(401);
    expect(r2.status).toHaveBeenCalledWith(401);
    expect(body(r1).message).toBe('Email hoặc mật khẩu không đúng');
    expect(body(r2)).toEqual(body(r1));
    expect(body(r1).field).toBeUndefined();
  });
});
