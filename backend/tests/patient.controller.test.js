/**
 * UC009 - API-13 (GET) + API-14 (PUT).
 * Unit test khong ket noi DB that: RPC transaction can test tren staging.
 * Duong dan dung hop dong /api/auth/profile; Patient / Admin dang nhap.
 */

jest.mock('../src/config/supabase.config', () => ({
  from: jest.fn(),
  rpc: jest.fn()
}));

const bcrypt = require('bcryptjs');
const supabase = require('../src/config/supabase.config');
const { getMyProfile, updateMyProfile } = require('../src/controllers/patient.controller');

const USER_ID = 'user-1';
const PASSWORD = 'MatkhauCu123';
const NEW_PASSWORD = 'MatkhauMoi456';

const patientRow = {
  id: 'patient-1',
  full_name: 'Nguyễn Văn A',
  avatar_url: null,
  phone: '0911111111',
  date_of_birth: '1995-03-12',
  gender: 'MALE',
  address: '123 Lê Lợi'
};

const makeQuery = (result) => {
  const q = {};
  ['select', 'eq', 'neq', 'update', 'insert'].forEach((name) => {
    q[name] = jest.fn().mockReturnValue(q);
  });
  q.maybeSingle = jest.fn().mockResolvedValue(result);
  q.single = jest.fn().mockResolvedValue(result);
  return q;
};

const ok = (data) => makeQuery({ data, error: null });
const dbError = (message) => makeQuery({ data: null, error: { message } });

const makeReq = (body = {}, role = 'PATIENT') => ({
  user: { id: USER_ID, role },
  body: {
    full_name: ' Nguyễn Văn A ',
    email: 'A@X.COM',
    password: PASSWORD,
    phone: '0911111111',
    date_of_birth: '1995-03-12',
    gender: 'MALE',
    ...body
  }
});

describe('UC009 - profile + doi email/mat khau', () => {
  let res;
  let userRow;
  let reads;

  const setup = ({ users = [], patients = [] } = {}) => {
    const queues = { users: [...users], patients: [...patients] };
    supabase.from.mockImplementation((table) => {
      if (!queues[table] || !queues[table].length) {
        throw new Error(`Thiếu mock ${table}`);
      }
      reads.push(table);
      return queues[table].shift();
    });
  };

  const setupSuccess = (profile = {}) => {
    const patientQ = ok(patientRow);
    setup({ users: [ok(userRow)], patients: [patientQ] });
    const merged = { ...patientRow, email: 'a@x.com', ...profile };
    supabase.rpc.mockResolvedValue({ data: merged, error: null });
    return patientQ;
  };

  const expected = (status, fields = {}) => {
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json.mock.calls[0][0]).toMatchObject(fields);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    reads = [];
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    userRow = {
      id: USER_ID,
      email: 'a@x.com',
      password_hash: bcrypt.hashSync(PASSWORD, 4),
      role: 'PATIENT',
      is_active: true
    };
  });

  afterEach(() => jest.restoreAllMocks());

  describe('GET /api/auth/profile', () => {
    test('GET01 - lấy profile 200, không lộ mật khẩu', async () => {
      setup({ users: [ok(userRow)], patients: [ok(patientRow)] });
      await getMyProfile(makeReq(), res);
      expected(200, {
        success: true,
        profile: { id: 'patient-1', email: 'a@x.com', full_name: 'Nguyễn Văn A' }
      });
      expect(res.json.mock.calls[0][0].profile.password_hash).toBeUndefined();
      expect(reads).toEqual(['users', 'patients']);
    });

    test('GET02 - trường chưa nhập trả null', async () => {
      setup({ users: [ok(userRow)], patients: [ok({ id: 'patient-1' })] });
      await getMyProfile(makeReq(), res);
      expected(200);
      expect(res.json.mock.calls[0][0].profile.phone).toBeNull();
    });

    test('GET03 - Admin có hồ sơ gắn tài khoản được đọc hồ sơ chính mình', async () => {
      setup({ users: [ok({ ...userRow, role: 'ADMIN' })], patients: [ok(patientRow)] });
      await getMyProfile(makeReq({}, 'ADMIN'), res);
      expected(200, { profile: { id: 'patient-1' } });
    });

    test('GET08 - Admin không có hồ sơ bệnh nhân -> 404, không tự tạo', async () => {
      setup({ users: [ok({ ...userRow, role: 'ADMIN' })], patients: [ok(null)] });
      await getMyProfile(makeReq({}, 'ADMIN'), res);
      expected(404);
    });

    test('GET04 - JWT Patient nhưng DB là Admin -> 403', async () => {
      setup({ users: [ok({ ...userRow, role: 'ADMIN' })] });
      await getMyProfile(makeReq(), res);
      expected(403);
    });

    test('GET05 - tài khoản khóa -> 401', async () => {
      setup({ users: [ok({ ...userRow, is_active: false })] });
      await getMyProfile(makeReq(), res);
      expected(401);
    });

    test('GET06 - thiếu hồ sơ -> 404', async () => {
      setup({ users: [ok(userRow)], patients: [ok(null)] });
      await getMyProfile(makeReq(), res);
      expected(404);
    });

    test('GET07 - DB lỗi -> 500', async () => {
      setup({ users: [dbError('db unavailable')] });
      await getMyProfile(makeReq(), res);
      expected(500);
    });
  });

  describe('PUT /api/auth/profile - validate', () => {
    const cases = [
      ['thiếu full_name', { full_name: undefined }, 'full_name'],
      ['full_name rỗng', { full_name: ' ' }, 'full_name'],
      ['full_name > 100', { full_name: 'x'.repeat(101) }, 'full_name'],
      ['phone kiểu số', { phone: 911111111 }, 'phone'],
      ['phone không hợp lệ', { phone: '0123' }, 'phone'],
      ['ngày sinh sai kiểu', { date_of_birth: 123 }, 'date_of_birth'],
      ['ngày sinh tương lai', { date_of_birth: '2999-12-01' }, 'date_of_birth'],
      ['ngày sinh không tồn tại', { date_of_birth: '2024-02-30' }, 'date_of_birth'],
      ['gender kiểu số', { gender: 1 }, 'gender'],
      ['gender sai', { gender: 'X' }, 'gender'],
      ['email sai', { email: 'bad-email' }, 'email'],
      ['không có email', { email: undefined }, 'email'],
      ['không có mật khẩu hiện tại', { password: undefined }, 'password'],
      ['mật khẩu hiện tại rỗng', { password: '' }, 'password'],
      ['mật khẩu mới quá ngắn', { new_password: '1234567' }, 'new_password'],
      ['mật khẩu mới giống cũ', { new_password: PASSWORD }, 'new_password'],
      ['mật khẩu mới quá 72 byte', { new_password: 'X'.repeat(73) }, 'new_password'],
      ['mật khẩu mới Unicode quá 72 byte', { new_password: 'ộ'.repeat(37) }, 'new_password'],
      ['mật khẩu mới rỗng', { new_password: '' }, 'new_password'],
      ['xác nhận mật khẩu mới không khớp', { new_password: NEW_PASSWORD, confirm_password: 'wrong' }, 'confirm_password'],
      ['xác nhận mật khẩu nhưng không đổi', { confirm_password: 'dang-nhap' }, 'confirm_password'],
      ['avatar sai định dạng', { avatar_url: 'https://abc/a.jpg' }, 'avatar_url'],
      ['avatar quá dài', { avatar_url: 'data:image/png;base64,' + 'A'.repeat(700000) }, 'avatar_url'],
      ['địa chỉ quá dài', { address: 'A'.repeat(256) }, 'address'],
      ['không cho đổi role', { role: 'ADMIN' }, 'role'],
      ['không cho đổi user_id', { user_id: 'other-user' }, 'role'],
      ['không cho gửi hash trực tiếp', { password_hash: 'hash' }, 'role'],
      ['không cho đổi active', { is_active: true }, 'role'],
      ['không cho đổi id', { id: USER_ID }, 'role']
    ];
    test.each(cases)('%s -> 400 / %s', async (_title, data, field) => {
      await updateMyProfile(makeReq(data), res);
      expected(400, { field });
      expect(supabase.from).not.toHaveBeenCalled();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/auth/profile - thanh cong', () => {
    test('PUT01 - cập nhật dữ liệu trong đúng 1 RPC transaction', async () => {
      setupSuccess();
      await updateMyProfile(makeReq(), res);
      expected(200, { patient: { id: 'patient-1', email: 'a@x.com' } });
      expect(reads).toEqual(['users', 'patients']);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenCalledWith('uc009_update_patient_profile',
        expect.objectContaining({
          p_user_id: USER_ID,
          p_expected_password_hash: userRow.password_hash,
          p_email: 'a@x.com',
          p_new_password_hash: null,
          p_full_name: 'Nguyễn Văn A'
        }));
    });

    test('PUT02 - đổi email, normalize chữ thường và trả email mới', async () => {
      setupSuccess({ email: 'moi@example.com' });
      await updateMyProfile(makeReq({ email: ' MOI@Example.COM ' }), res);
      expected(200, { patient: { email: 'moi@example.com' } });
      expect(supabase.rpc.mock.calls[0][1].p_email).toBe('moi@example.com');
    });

    test('PUT03 - đổi mật khẩu, hash mới bằng bcrypt, không trả hash', async () => {
      setupSuccess();
      await updateMyProfile(makeReq({
        new_password: NEW_PASSWORD,
        confirm_password: NEW_PASSWORD
      }), res);
      expected(200);
      const args = supabase.rpc.mock.calls[0][1];
      expect(args.p_new_password_hash).not.toBe(NEW_PASSWORD);
      expect(await bcrypt.compare(NEW_PASSWORD, args.p_new_password_hash)).toBe(true);
      expect(res.json.mock.calls[0][0].patient.password_hash).toBeUndefined();
    });

    test('PUT04 - đổi cả email + password trong cùng 1 RPC', async () => {
      setupSuccess({ email: 'new@example.com' });
      await updateMyProfile(makeReq({
        email: 'new@example.com',
        new_password: NEW_PASSWORD,
        confirm_password: NEW_PASSWORD
      }), res);
      expected(200, { patient: { email: 'new@example.com' } });
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc.mock.calls[0][1].p_new_password_hash).toBeTruthy();
    });

    test('PUT05 - giữ address, avatar khi không gửi', async () => {
      setupSuccess();
      await updateMyProfile(makeReq(), res);
      const args = supabase.rpc.mock.calls[0][1];
      expect(args.p_address).toBe('123 Lê Lợi');
      expect(args.p_avatar_url).toBeNull();
    });

    test('PUT06 - xóa địa chỉ khi truyền null', async () => {
      setupSuccess({ address: null });
      await updateMyProfile(makeReq({ address: null }), res);
      expected(200);
      expect(supabase.rpc.mock.calls[0][1].p_address).toBeNull();
    });

    test('PUT18 - cho phép phone, date_of_birth, gender = null', async () => {
      setupSuccess({ phone: null, date_of_birth: null, gender: null });
      await updateMyProfile(makeReq({ phone: null, date_of_birth: null, gender: null }), res);
      expected(200);
      const args = supabase.rpc.mock.calls[0][1];
      expect(args.p_phone).toBeNull();
      expect(args.p_date_of_birth).toBeNull();
      expect(args.p_gender).toBeNull();
    });

    test('PUT19 - bỏ qua trường tùy chọn thì giữ nguyên giá trị', async () => {
      setupSuccess();
      await updateMyProfile(makeReq({ phone: undefined, date_of_birth: undefined, gender: undefined }), res);
      expected(200);
      const args = supabase.rpc.mock.calls[0][1];
      expect(args.p_phone).toBe(patientRow.phone);
      expect(args.p_date_of_birth).toBe(patientRow.date_of_birth);
      expect(args.p_gender).toBe(patientRow.gender);
    });

    test('PUT20 - confirm_password chỉ kiểm tra nếu FE gửi', async () => {
      setupSuccess();
      await updateMyProfile(makeReq({ new_password: NEW_PASSWORD }), res);
      expected(200);
      expect(await bcrypt.compare(NEW_PASSWORD, supabase.rpc.mock.calls[0][1].p_new_password_hash)).toBe(true);
    });

    test('PUT21 - Admin chỉ được cập nhật hồ sơ gắn với chính JWT của mình', async () => {
      setup({ users: [ok({ ...userRow, role: 'ADMIN' })], patients: [ok(patientRow)] });
      supabase.rpc.mockResolvedValue({ data: { ...patientRow, email: 'a@x.com' }, error: null });
      await updateMyProfile(makeReq({}, 'ADMIN'), res);
      expected(200);
      expect(supabase.rpc.mock.calls[0][1].p_user_id).toBe(USER_ID);
    });

    test('PUT22 - Admin không có hồ sơ -> 404, không được tạo', async () => {
      setup({ users: [ok({ ...userRow, role: 'ADMIN' })], patients: [ok(null)] });
      await updateMyProfile(makeReq({}, 'ADMIN'), res);
      expected(404);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    test('PUT07 - password mới null: không đổi', async () => {
      setupSuccess();
      await updateMyProfile(makeReq({ new_password: null }), res);
      expected(200);
      expect(supabase.rpc.mock.calls[0][1].p_new_password_hash).toBeNull();
    });
  });

  describe('PUT /api/auth/profile - loi va phan quyen', () => {
    test('PUT08 - mật khẩu sai -> 400 WRONG_PASSWORD, không gọi RPC', async () => {
      setup({ users: [ok(userRow)] });
      await updateMyProfile(makeReq({ password: 'sai-mat-khau' }), res);
      expected(400, { field: 'password', code: 'WRONG_PASSWORD' });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    test('PUT09 - email trùng (unique index 23505) -> 409 EMAIL_TAKEN', async () => {
      setupSuccess();
      supabase.rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
      await updateMyProfile(makeReq({ email: 'occupied@example.com' }), res);
      expected(409, { field: 'email', code: 'EMAIL_TAKEN' });
    });

    test('PUT10 - role JWT ADMIN nhưng DB PATIENT -> 403, không RPC', async () => {
      setup({ users: [ok(userRow)] });
      await updateMyProfile(makeReq({}, 'ADMIN'), res);
      expected(403);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    test('PUT11 - role trong DB khác JWT -> 403', async () => {
      setup({ users: [ok({ ...userRow, role: 'ADMIN' })] });
      await updateMyProfile(makeReq(), res);
      expected(403);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    test('PUT12 - user khóa -> 401', async () => {
      setup({ users: [ok({ ...userRow, is_active: false })] });
      await updateMyProfile(makeReq(), res);
      expected(401);
    });

    test('PUT13 - thiếu hồ sơ -> 404, không RPC', async () => {
      setup({ users: [ok(userRow)], patients: [ok(null)] });
      await updateMyProfile(makeReq(), res);
      expected(404);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    test('PUT14 - RPC báo hồ sơ bị xóa đồng thời -> 404', async () => {
      setupSuccess();
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'UC009_PATIENT_NOT_FOUND' } });
      await updateMyProfile(makeReq(), res);
      expected(404);
    });

    test('PUT15 - RPC phát hiện password thay đổi đồng thời -> 409', async () => {
      setupSuccess();
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'UC009_AUTH_STALE' } });
      await updateMyProfile(makeReq(), res);
      expected(409, { code: 'PROFILE_CONFLICT' });
    });

    test('PUT16 - lỗi database trong RPC -> 500; DB rollback transaction', async () => {
      setupSuccess();
      supabase.rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'failed' } });
      await updateMyProfile(makeReq({ email: 'new@example.com' }), res);
      expected(500);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      // Rollback la thuoc tinh cua transaction SQL, test that tren DB staging.
    });

    test('PUT17 - Supabase RPC tra data rong -> 500', async () => {
      setupSuccess();
      supabase.rpc.mockResolvedValue({ data: null, error: null });
      await updateMyProfile(makeReq(), res);
      expected(500);
    });
  });
});
