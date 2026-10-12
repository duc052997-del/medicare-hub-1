// controllers/auth.controller.js
// Chứa logic xử lý: đăng nhập, lấy thông tin phiên đăng nhập, đăng xuất.

const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase.config');
const { generateToken } = require('../utils/helper');
const { success, fail, serverError } = require('../utils/response');
const tokenBlacklist = require('../utils/tokenBlacklist');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

// Hash mồi dùng khi email không tồn tại, để tránh lộ email qua thời gian phản hồi
const DUMMY_HASH = bcrypt.hashSync('medicare-hub-dummy-password', SALT_ROUNDS);

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  role: user.role
});

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

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return fail(res, 401, 'Email không tồn tại', { field: 'email' });
    }

    // Bước 5: kiểm tra email có tồn tại trong hệ thống hay không
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, username, password_hash, role, is_active')
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
      .select('id, email, username, role, is_active')
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

// POST /api/auth/logout - xóa token khỏi hệ thống (UC003)
const logout = async (req, res) => {
  tokenBlacklist.add(req.token, req.user.exp);
  return success(res, 200, 'Đăng xuất thành công');
};

module.exports = { login, getMe, logout };
