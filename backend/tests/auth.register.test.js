
/**
 * Unit Test UC001 - Dang ky tai khoan
 * Project: MediCare-Hub
 * Framework: Jest
 *
 * Supabase duoc mock, khong truy cap database that.
 */

jest.mock('../src/config/supabase.config', () => ({
  from: jest.fn(),
  rpc: jest.fn()
}));

jest.mock('../src/utils/helper', () => ({
  generateToken: jest.fn()
}));

jest.mock('../src/utils/tokenBlacklist', () => ({
  add: jest.fn()
}));

const bcrypt = require('bcryptjs');
const supabase = require('../src/config/supabase.config');
const { register } = require('../src/controllers/auth.controller');

describe('UC001 - Dang ky tai khoan', () => {
  let req;
  let res;

  const mockFindEmail = (data = null, error = null) => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data,
      error
    });

    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });

    supabase.from.mockReturnValue({ select });

    return { select, eq, maybeSingle };
  };

  const mockRegisterRpc = (data = null, error = null) => {
    const single = jest.fn().mockResolvedValue({
      data,
      error
    });

    const select = jest.fn().mockReturnValue({ single });

    supabase.rpc.mockReturnValue({ select });

    return { select, single };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        email: 'test@example.com',
        username: 'testuser',
        password: '12345678',
        confirmPassword: '12345678'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // TC01 - Thieu email
  test('TC01 - Thieu email tra 400', async () => {
    delete req.body.email;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
    });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  // TC02 - Email khong hop le
  test('TC02 - Email khong hop le tra 400', async () => {
    req.body.email = 'email-sai';

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email không hợp lệ hoặc đã được đăng ký'
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  // TC03 - Mat khau duoi 8 ky tu
  test('TC03 - Mat khau ngan tra 400', async () => {
    req.body.password = '1234567';
    req.body.confirmPassword = '1234567';

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Mật khẩu phải có tối thiểu 8 ký tự'
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  // TC04 - Xac nhan mat khau khong khop
  test('TC04 - Xac nhan mat khau sai tra 400', async () => {
    req.body.confirmPassword = '87654321';

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Mật khẩu xác nhận không khớp'
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  // TC05 - Email da ton tai
  test('TC05 - Email trung tra 409', async () => {
    mockFindEmail({ id: 'existing-user-id' });

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email không hợp lệ hoặc đã được đăng ký'
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  // TC06 - Dang ky thanh cong
  test('TC06 - Dang ky thanh cong tra 201', async () => {
    mockFindEmail();

    const mockUser = {
      id: '702f693c-5290-412d-8329-6ee522fd9a46',
      email: 'test@example.com',
      username: 'testuser',
      role: 'PATIENT',
      created_at: '2026-10-10T00:00:00Z'
    };

    const { select, single } = mockRegisterRpc(mockUser);

    await register(req, res);

    expect(supabase.rpc).toHaveBeenCalledTimes(1);

    expect(supabase.rpc).toHaveBeenCalledWith(
      'register_patient',
      expect.objectContaining({
        p_email: 'test@example.com',
        p_username: 'testuser',
        p_password_hash: expect.any(String)
      })
    );

    // Mat khau phai duoc hash, khong luu plaintext
    const rpcArgs = supabase.rpc.mock.calls[0][1];

    expect(rpcArgs.p_password_hash).not.toBe('12345678');

    const passwordMatched = await bcrypt.compare(
      '12345678',
      rpcArgs.p_password_hash
    );

    expect(passwordMatched).toBe(true);

    expect(select).toHaveBeenCalledWith(
      'id, email, username, role, created_at'
    );
    expect(single).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Đăng ký thành công',
      user: mockUser
    });
  });

  // TC07 - Loi database
  test('TC07 - Loi database tra 500', async () => {
    mockFindEmail();

    mockRegisterRpc(null, {
      code: 'XX000',
      message: 'Database error'
    });

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Đã có lỗi xảy ra, vui lòng thử lại sau'
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  // TC08 - Username qua 50 ky tu
  test('TC08 - Username qua dai tra 400', async () => {
    req.body.username = 'a'.repeat(51);

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Tên tài khoản tối đa 50 ký tự'
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  // TC09 - Mat khau qua 72 byte
  test('TC09 - Mat khau qua dai tra 400', async () => {
    req.body.password = 'a'.repeat(73);
    req.body.confirmPassword = 'a'.repeat(73);

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Mật khẩu quá dài (tối đa 72 byte)'
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  // TC10 - Email duoc chuan hoa, username duoc trim
  test('TC10 - Chuan hoa email va username', async () => {
    req.body.email = '  TEST@EXAMPLE.COM  ';
    req.body.username = '  testuser  ';

    mockFindEmail();

    mockRegisterRpc({
      id: 'mock-user-id',
      email: 'test@example.com',
      username: 'testuser',
      role: 'PATIENT',
      created_at: '2026-10-10T00:00:00Z'
    });

    await register(req, res);

    expect(supabase.rpc).toHaveBeenCalledWith(
      'register_patient',
      expect.objectContaining({
        p_email: 'test@example.com',
        p_username: 'testuser'
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
  });

  // TC11 - Loi UNIQUE khi email bi trung dong thoi
  test('TC11 - Email trung khi goi RPC tra 409', async () => {
    // Lan 1: Email chua ton tai
    // Lan 2: Email da ton tai khi kiem tra lai
    const maybeSingle = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: 'existing-user-id' },
        error: null
      });

    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });

    supabase.from.mockReturnValue({ select });

    mockRegisterRpc(null, {
      code: '23505',
      message: 'Unique constraint violation'
    });

    await register(req, res);

    expect(supabase.from).toHaveBeenCalledTimes(2);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email không hợp lệ hoặc đã được đăng ký'
    });
  });
});
//