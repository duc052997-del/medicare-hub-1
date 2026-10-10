// controllers/auth.controller.js
// Chứa logic xử lý xác thực: đăng ký (UC001), đăng nhập (UC002),
// lấy thông tin phiên đăng nhập, đăng xuất (UC003).

const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase.config');
const { generateToken } = require('../utils/helper');
const { success, fail, serverError } = require('../utils/response');
const tokenBlacklist = require('../utils/tokenBlacklist');
const {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  SALT_ROUNDS,
  normalizeEmail,
  isValidEmail
} = require('../utils/validators');

const EMAIL_TAKEN_MESSAGE = 'Email không hợp lệ hoặc đã được đăng ký';

// Hash mồi dùng khi email không tồn tại, để thời gian phản hồi không chênh lệch
const DUMMY_HASH = bcrypt.hashSync('medicare-hub-dummy-password', SALT_ROUNDS);

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role
});

// UC001 - Đăng ký
const register = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body || {};

    // Bước 4 (4a): kiểm tra các trường bắt buộc
    if (
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password ||
      typeof confirmPassword !== 'string' || !confirmPassword
    ) {
      return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin bắt buộc');
    }

    // Bước 5 (5a): email hợp lệ
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return fail(res, 400, EMAIL_TAKEN_MESSAGE);
    }

    // Mật khẩu tối thiểu 8 ký tự (theo placeholder trên form của SRS)
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(res, 400, `Mật khẩu phải có tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`);
    }
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
      return fail(res, 400, `Mật khẩu quá dài (tối đa ${MAX_PASSWORD_LENGTH} byte)`);
    }

    // Bước 6 (6a): mật khẩu xác nhận khớp
    if (password !== confirmPassword) {
      return fail(res, 400, 'Mật khẩu xác nhận không khớp');
    }

    // Bước 5 (5a): email chưa tồn tại
    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (findError) throw findError;
    if (existing) {
      return fail(res, 409, EMAIL_TAKEN_MESSAGE);
    }

    // Bước 7: mã hóa mật khẩu và lưu vào CSDL (role mặc định PATIENT do DB đặt)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ email: normalizedEmail, password_hash: passwordHash })
      .select('id, email, role, created_at')
      .single();

    if (insertError) {
      // 23505 = vi phạm UNIQUE (2 người đăng ký cùng email cùng lúc)
      if (insertError.code === '23505') {
        return fail(res, 409, EMAIL_TAKEN_MESSAGE);
      }
      throw insertError;
    }

    // Bước 8: báo thành công (bước 9 chuyển trang là việc của FE)
    return success(res, 201, 'Đăng ký thành công', { user: newUser });
  } catch (error) {
    return serverError(res, 'auth.register', error);
  }
};

// UC002 - Đăng nhập
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password
    ) {
      return fail(res, 400, 'Vui lòng nhập email và mật khẩu');
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return fail(res, 401, 'Email không tồn tại', { field: 'email' });
    }

    // Bước 5: kiểm tra email có tồn tại trong hệ thống hay không
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, password_hash, role, is_active')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (findError) throw findError;

    // Luồng thay thế 5a
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return fail(res, 401, 'Email không tồn tại', { field: 'email' });
    }

    // Bước 6: kiểm tra mật khẩu có khớp với tài khoản hay không
    const passwordMatched = user.password_hash
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    // Luồng thay thế 6a
    if (!passwordMatched) {
      return fail(res, 401, 'Mật khẩu không đúng', { field: 'password' });
    }

    if (user.is_active === false) {
      return fail(res, 403, 'Tài khoản đã bị khóa, vui lòng liên hệ quản trị viên');
    }

    // Bước 7: tạo JWT token cho phiên đăng nhập
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Bước 8: trả token cho FE để chuyển đến trang chủ / dashboard
    return success(res, 200, 'Đăng nhập thành công', {
      token,
      user: publicUser(user)
    });
  } catch (error) {
    return serverError(res, 'auth.login', error);
  }
};

// GET /api/auth/me - lấy thông tin phiên đăng nhập hiện tại
const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;

    if (!user || user.is_active === false) {
      return fail(res, 401, 'Phiên đăng nhập không còn hiệu lực, vui lòng đăng nhập lại');
    }

    return success(res, 200, 'Lấy thông tin tài khoản thành công', {
      user: publicUser(user)
    });
  } catch (error) {
    return serverError(res, 'auth.getMe', error);
  }
};

// POST /api/auth/logout - vô hiệu hóa token hiện tại (UC003)
const logout = async (req, res) => {
  tokenBlacklist.add(req.token, req.user.exp);
  return success(res, 200, 'Đăng xuất thành công');
};

module.exports = { register, login, getMe, logout };
