
// controllers/auth.controller.js
// Xử lý xác thực: đăng ký (UC001), đăng nhập (UC002),
// lấy thông tin phiên đăng nhập và đăng xuất (UC003).

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

// Hash mồi để hạn chế chênh lệch thời gian phản hồi khi email không tồn tại
const DUMMY_HASH = bcrypt.hashSync(
  'medicare-hub-dummy-password',
  SALT_ROUNDS
);

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username ?? null,
  role: user.role
});

// =====================================================
// UC001 - ĐĂNG KÝ
// Tạo đồng thời tài khoản users và hồ sơ patients
// bằng PostgreSQL RPC (cùng một transaction).
// =====================================================
const register = async (req, res) => {
  try {
    const { email, password, confirmPassword, username } = req.body || {};

    // Bước 1: Kiểm tra trường bắt buộc
    if (
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password ||
      typeof confirmPassword !== 'string' || !confirmPassword ||
      typeof username !== 'string' || !username.trim()
    ) {
      return fail(
        res,
        400,
        'Vui lòng nhập đầy đủ thông tin bắt buộc'
      );
    }

    // Bước 2: Kiểm tra username
    const trimmedUsername = username.trim();

    if (trimmedUsername.length > 50) {
      return fail(res, 400, 'Tên tài khoản tối đa 50 ký tự');
    }

    // Bước 3: Kiểm tra email
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return fail(res, 400, EMAIL_TAKEN_MESSAGE);
    }

    // Bước 4: Kiểm tra độ dài mật khẩu
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(
        res,
        400,
        `Mật khẩu phải có tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`
      );
    }

    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
      return fail(
        res,
        400,
        `Mật khẩu quá dài (tối đa ${MAX_PASSWORD_LENGTH} byte)`
      );
    }

    // Bước 5: Kiểm tra xác nhận mật khẩu
    if (password !== confirmPassword) {
      return fail(res, 400, 'Mật khẩu xác nhận không khớp');
    }

    // Bước 6: Kiểm tra email đã tồn tại chưa
    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing) {
      return fail(res, 409, EMAIL_TAKEN_MESSAGE);
    }

    // Bước 7: Mã hóa mật khẩu
    const passwordHash = await bcrypt.hash(
      password,
      SALT_ROUNDS
    );

    // Bước 8: Gọi PostgreSQL RPC.
    // RPC tạo users + patients trong một transaction.
    // Nếu tạo patients thất bại, users cũng rollback.
    const { data: newUser, error: insertError } = await supabase
      .rpc('register_patient', {
        p_email: normalizedEmail,
        p_username: trimmedUsername,
        p_password_hash: passwordHash
      })
      .select('id, email, username, role, created_at')
      .single();

    if (insertError) {
      // PostgreSQL 23505: vi phạm UNIQUE.
      // Có thể do email trùng khi đăng ký đồng thời,
      // hoặc mã bệnh nhân được sinh bị trùng.
      if (insertError.code === '23505') {
        // Kiểm tra lại email để tránh báo nhầm lỗi.
        const { data: duplicate, error: duplicateError } = await supabase
          .from('users')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (!duplicateError && duplicate) {
          return fail(res, 409, EMAIL_TAKEN_MESSAGE);
        }
      }

      throw insertError;
    }

    // Bước 9: Trả kết quả theo API-01
    return success(res, 201, 'Đăng ký thành công', {
      user: newUser
    });
  } catch (error) {
    return serverError(res, 'auth.register', error);
  }
};

// =====================================================
// UC002 - ĐĂNG NHẬP
// Giữ nguyên logic hiện tại
// =====================================================
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
      return fail(res, 401, 'Email không tồn tại', {
        field: 'email'
      });
    }

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, username, password_hash, role, is_active')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);

      return fail(res, 401, 'Email không tồn tại', {
        field: 'email'
      });
    }

    const passwordMatched = user.password_hash
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!passwordMatched) {
      return fail(res, 401, 'Mật khẩu không đúng', {
        field: 'password'
      });
    }

    if (user.is_active === false) {
      return fail(
        res,
        403,
        'Tài khoản đã bị khóa, vui lòng liên hệ quản trị viên'
      );
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return success(res, 200, 'Đăng nhập thành công', {
      token,
      user: publicUser(user)
    });
  } catch (error) {
    return serverError(res, 'auth.login', error);
  }
};

// =====================================================
// GET /api/auth/me
// Giữ nguyên logic hiện tại
// =====================================================
const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, role, is_active')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!user || user.is_active === false) {
      return fail(
        res,
        401,
        'Phiên đăng nhập không còn hiệu lực, vui lòng đăng nhập lại'
      );
    }

    return success(
      res,
      200,
      'Lấy thông tin tài khoản thành công',
      {
        user: publicUser(user)
      }
    );
  } catch (error) {
    return serverError(res, 'auth.getMe', error);
  }
};

// =====================================================
// UC003 - ĐĂNG XUẤT
// Giữ nguyên logic hiện tại
// =====================================================
const logout = async (req, res) => {
  tokenBlacklist.add(req.token, req.user.exp);

  return success(res, 200, 'Đăng xuất thành công');
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
