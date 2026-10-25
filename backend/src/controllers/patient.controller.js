/**
 * UC009 - API-13 GET /api/auth/profile, API-14 PUT /api/auth/profile.
 * Can cu cac cot API, quyen, request, response va ma loi trong hop dong;
 * KHONG dung cot ghi chu. Chi sua ho so cua chinh tai khoan JWT.
 *
 * PUT: email/password hien tai bat buoc; new_password tuy chon;
 * confirm_password chi can doi chieu neu FE gui len (hop dong: FE kiem tra).
 * Supabase RPC uc009_update_patient_profile cap nhat users + patients
 * trong 1 transaction PostgreSQL, tranh cap nhat du lieu do dang.
 */

const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');
const { isValidCalendarDate, getTodayInVietnam } = require('../utils/schedule');
const {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  SALT_ROUNDS,
  normalizeEmail,
  isValidEmail
} = require('../utils/validators');

const MAX_FULL_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 255;
const MAX_AVATAR_LENGTH = 700000;
const PHONE_REGEX = /^0\d{9}$/;
const AVATAR_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
const VALID_GENDERS = new Set(['MALE', 'FEMALE', 'OTHER']);
const PATIENT_SELECT =
  'id, full_name, avatar_url, phone, date_of_birth, gender, address';

const INVALID_MESSAGE = 'Thông tin không hợp lệ';
const PATIENT_NOT_FOUND_MESSAGE = 'Không tìm thấy hồ sơ bệnh nhân';
const SESSION_INVALID_MESSAGE =
  'Phiên đăng nhập không còn hiệu lực, vui lòng đăng nhập lại';
const ACCESS_DENIED_MESSAGE = 'Bạn không có quyền truy cập chức năng này';

const invalid = (res, field, message = INVALID_MESSAGE) =>
  fail(res, 400, message, { field });

const formatProfile = (user, patient) => ({
  id: patient.id,
  email: user.email,
  full_name: patient.full_name ?? null,
  avatar_url: patient.avatar_url ?? null,
  phone: patient.phone ?? null,
  date_of_birth: patient.date_of_birth ?? null,
  gender: patient.gender ?? null,
  address: patient.address ?? null
});

const isAllowedToken = (req) =>
  req.user && ['PATIENT', 'ADMIN'].includes(req.user.role);

// So sanh role trong JWT va database, khong tin token neu role da thay doi.
const findActiveProfileUser = async (userId, tokenRole) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, password_hash, role, is_active')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!user || user.is_active === false) return { invalidSession: true };
  if (!['PATIENT', 'ADMIN'].includes(user.role) || user.role !== tokenRole) {
    return { forbidden: true };
  }
  return { user };
};

const findPatient = async (userId) => {
  const { data: patient, error } = await supabase
    .from('patients')
    .select(PATIENT_SELECT)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return patient;
};

const getMyProfile = async (req, res) => {
  if (!isAllowedToken(req)) return fail(res, 403, ACCESS_DENIED_MESSAGE);
  try {
    const auth = await findActiveProfileUser(req.user.id, req.user.role);
    if (auth.invalidSession) return fail(res, 401, SESSION_INVALID_MESSAGE);
    if (auth.forbidden) return fail(res, 403, ACCESS_DENIED_MESSAGE);

    const patient = await findPatient(auth.user.id);
    if (!patient) return fail(res, 404, PATIENT_NOT_FOUND_MESSAGE);

    return success(res, 200, 'Lấy thông tin cá nhân thành công', {
      profile: formatProfile(auth.user, patient)
    });
  } catch (error) {
    return serverError(res, 'patient.getMyProfile', error);
  }
};

// Neu khong gui truong optional thi giu gia tri cu, null / '' la xoa gia tri.
const optionalField = (body, key, check) => {
  if (body[key] === undefined) return { skip: true };
  if (body[key] === null) return { value: null };
  if (typeof body[key] !== 'string') return { error: true };
  const value = body[key].trim();
  if (!value) return { value: null };
  return check(value) ? { value } : { error: true };
};

// Truong bat buoc theo cot Request cua hop dong API-14.
const requiredField = (body, key, check) => {
  if (typeof body[key] !== 'string') return { error: true };
  const value = body[key].trim();
  return value && check(value) ? { value } : { error: true };
};

const updateMyProfile = async (req, res) => {
  if (!isAllowedToken(req)) return fail(res, 403, ACCESS_DENIED_MESSAGE);

  try {
    const body = req.body && !Array.isArray(req.body) && typeof req.body === 'object'
      ? req.body
      : {};

    const fullName = requiredField(body, 'full_name', (v) => v.length <= MAX_FULL_NAME_LENGTH);
    if (fullName.error) return invalid(res, 'full_name');

    // Hop dong API-14: phone, date_of_birth, gender co the la null.
    // Neu khong gui, giu nguyen gia tri cu; neu null, xoa gia tri.
    const phone = optionalField(body, 'phone', (v) => PHONE_REGEX.test(v));
    if (phone.error) return invalid(res, 'phone');

    const dob = optionalField(body, 'date_of_birth', (v) =>
      isValidCalendarDate(v) && v <= getTodayInVietnam()
    );
    if (dob.error) return invalid(res, 'date_of_birth');

    const gender = optionalField(body, 'gender', (v) => VALID_GENDERS.has(v));
    if (gender.error) return invalid(res, 'gender');

    if (typeof body.email !== 'string' || !body.email.trim()) {
      return invalid(res, 'email');
    }
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return invalid(res, 'email');

    // Xac nhan mat khau hien tai cho moi lan PUT (hop dong API-14).
    if (typeof body.password !== 'string' || !body.password) {
      return invalid(res, 'password');
    }

    const wantsNewPassword =
      body.new_password !== undefined && body.new_password !== null;

    if (wantsNewPassword) {
      if (
        typeof body.new_password !== 'string' ||
        body.new_password.length < MIN_PASSWORD_LENGTH ||
        Buffer.byteLength(body.new_password, 'utf8') > MAX_PASSWORD_LENGTH ||
        body.new_password === body.password
      ) {
        return invalid(res, 'new_password');
      }
      // FE kiem tra confirm_password. BE kiem tra them NEU truong nay duoc gui.
      if (body.confirm_password !== undefined &&
          body.confirm_password !== body.new_password) {
        return invalid(res, 'confirm_password');
      }
    } else if (body.confirm_password !== undefined &&
               body.confirm_password !== null && body.confirm_password !== '') {
      return invalid(res, 'confirm_password');
    }

    const avatar = optionalField(body, 'avatar_url', (v) =>
      v.length <= MAX_AVATAR_LENGTH && AVATAR_REGEX.test(v)
    );
    if (avatar.error) return invalid(res, 'avatar_url');

    const address = optionalField(body, 'address', (v) => v.length <= MAX_ADDRESS_LENGTH);
    if (address.error) return invalid(res, 'address');

    // Khong chap nhan sua dinh danh va quyen truc tiep tu request.
    if (body.role !== undefined || body.user_id !== undefined ||
        body.password_hash !== undefined || body.is_active !== undefined ||
        body.id !== undefined || body.patient_id !== undefined) {
      return invalid(res, 'role', 'Không được thay đổi quyền hoặc định danh tài khoản');
    }

    const auth = await findActiveProfileUser(req.user.id, req.user.role);
    if (auth.invalidSession) return fail(res, 401, SESSION_INVALID_MESSAGE);
    if (auth.forbidden) return fail(res, 403, ACCESS_DENIED_MESSAGE);
    const user = auth.user;

    const passwordMatched = user.password_hash
      ? await bcrypt.compare(body.password, user.password_hash)
      : false;
    if (!passwordMatched) {
      return fail(res, 400, 'Mật khẩu không đúng', {
        field: 'password', code: 'WRONG_PASSWORD'
      });
    }

    // Chi cap nhat ho so gan voi chinh user dang nhap. Admin khong co ban ghi
    // patients se nhan 404, khong tu tao ho so benh nhan cho tai khoan Admin.
    const patient = await findPatient(user.id);
    if (!patient) return fail(res, 404, PATIENT_NOT_FOUND_MESSAGE);

    // Chi bam mat khau moi khi nguoi dung yeu cau doi mat khau.
    const newPasswordHash = wantsNewPassword
      ? await bcrypt.hash(body.new_password, SALT_ROUNDS)
      : null;

    // Mot lenh RPC = mot transaction PostgreSQL:
    // email/password_hash cua users va cac field cua patients cung commit/rollback.
    // p_expected_password_hash giup tranh ghi de khi 2 request dong thoi doi mat khau.
    const { data: updated, error: updateError } = await supabase.rpc(
      'uc009_update_patient_profile',
      {
        p_user_id: user.id,
        p_expected_password_hash: user.password_hash,
        p_email: email,
        p_new_password_hash: newPasswordHash,
        p_full_name: fullName.value,
        p_phone: phone.skip ? (patient.phone ?? null) : phone.value,
        p_date_of_birth: dob.skip ? (patient.date_of_birth ?? null) : dob.value,
        p_gender: gender.skip ? (patient.gender ?? null) : gender.value,
        p_address: address.skip ? (patient.address ?? null) : address.value,
        p_avatar_url: avatar.skip ? (patient.avatar_url ?? null) : avatar.value
      }
    );

    if (updateError) {
      // Unique index lower(users.email) xu ly ca 2 request dong thoi cung doi email.
      if (updateError.code === '23505') {
        return fail(res, 409, 'Email đã được sử dụng bởi tài khoản khác', {
          field: 'email', code: 'EMAIL_TAKEN'
        });
      }
      if (updateError.message === 'UC009_PATIENT_NOT_FOUND') {
        return fail(res, 404, PATIENT_NOT_FOUND_MESSAGE);
      }
      if (updateError.message === 'UC009_USER_NOT_FOUND') {
        return fail(res, 401, SESSION_INVALID_MESSAGE);
      }
      if (updateError.message === 'UC009_FORBIDDEN') {
        return fail(res, 403, ACCESS_DENIED_MESSAGE);
      }
      if (updateError.message === 'UC009_AUTH_STALE') {
        return fail(res, 409, 'Tài khoản vừa thay đổi, vui lòng tải lại và thử lại', {
          code: 'PROFILE_CONFLICT'
        });
      }
      throw updateError;
    }
    if (!updated || !updated.id) {
      throw new Error('RPC uc009_update_patient_profile không trả về hồ sơ');
    }

    return success(res, 200, 'Cập nhật thông tin cá nhân thành công', {
      patient: formatProfile({ email: updated.email }, updated)
    });
  } catch (error) {
    return serverError(res, 'patient.updateMyProfile', error);
  }
};

module.exports = { getMyProfile, updateMyProfile };
