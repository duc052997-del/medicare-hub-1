// utils/profileform.ts
// UC009: phần THUẦN (không React, không gọi API) của form Thông tin cá nhân:
// giá trị mặc định, đổi qua lại giữa form <-> API, và kiểm tra dữ liệu. Dễ viết test, dễ thêm trường mới.
import { isRealDate, todayVN } from './schedule';
import type { AuthUser } from '../types';
import type { Gender, ProfileErrors, ProfileFieldKey, ProfileForm, ProfilePayload, UserProfile } from '../types/profile';

// Giới hạn dữ liệu. Mật khẩu cùng quy tắc với đăng ký (API-01); SĐT theo API-14.
export const PROFILE_LIMITS = { usernameMax: 50, passwordMin: 8, passwordMaxBytes: 72 } as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0\d{9}$/; // 10 số bắt đầu bằng 0

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

export const EMPTY_PROFILE_FORM: ProfileForm = {
  username: '',
  email: '',
  password: '',
  new_password: '',
  confirm_password: '',
  date_of_birth: '',
  phone: '',
  gender: '',
  avatar_url: '',
};

// Lỗi từ BE có "field": chỉ gắn vào ô nếu đó là ô của form này
export const isProfileFieldKey = (key: unknown): key is ProfileFieldKey =>
  typeof key === 'string' && Object.prototype.hasOwnProperty.call(EMPTY_PROFILE_FORM, key); // không dùng `in`: 'toString' in {} là true

// Ô chọn giới tính trả chuỗi bất kỳ -> chỉ nhận giá trị hợp lệ, còn lại coi như không chọn
export const toGender = (v: string): Gender | '' => GENDER_OPTIONS.find((g) => g.value === v)?.value ?? '';

// ---------- Đổi qua lại form <-> API ----------
export const toProfileForm = (p: UserProfile): ProfileForm => ({
  ...EMPTY_PROFILE_FORM, // mật khẩu luôn rỗng khi nạp/làm mới form
  username: p.username ?? '',
  email: p.email ?? '',
  date_of_birth: p.date_of_birth ?? '',
  phone: p.phone ?? '',
  gender: p.gender ?? '',
  avatar_url: p.avatar_url ?? '',
});

// Ô không bắt buộc bỏ trống thì gửi null
export const toProfilePayload = (f: ProfileForm): ProfilePayload => ({
  username: f.username.trim(),
  email: f.email.trim(),
  password: f.password,
  new_password: f.new_password || null,
  avatar_url: f.avatar_url || null,
  date_of_birth: f.date_of_birth || null,
  phone: f.phone.replace(/\s/g, '') || null,
  gender: f.gender || null,
});

// Phần của hồ sơ mà Header/menu cần hiển thị (lưu vào phiên đăng nhập)
export const applyProfileToUser = (user: AuthUser, p: UserProfile): AuthUser => ({
  ...user,
  email: p.email,
  username: p.username,
  avatar_url: p.avatar_url ?? undefined
});

// ---------- Kiểm tra dữ liệu, mỗi nhóm một hàm ----------
const validateAccount = (f: ProfileForm): ProfileErrors => {
  const errs: ProfileErrors = {};
  const username = f.username.trim();
  const email = f.email.trim();
  if (!username) errs.username = 'Vui lòng nhập tên tài khoản!';
  else if (username.length > PROFILE_LIMITS.usernameMax) errs.username = `Tên tài khoản tối đa ${PROFILE_LIMITS.usernameMax} ký tự!`;
  if (!email) errs.email = 'Vui lòng nhập email!';
  else if (!EMAIL_REGEX.test(email)) errs.email = 'Email không hợp lệ!';
  return errs;
};

// Không bắt buộc: chỉ kiểm tra khi có nhập
const validatePersonal = (f: ProfileForm): ProfileErrors => {
  const errs: ProfileErrors = {};
  const phone = f.phone.replace(/\s/g, '');
  if (phone && !PHONE_REGEX.test(phone)) errs.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0!';
  if (f.date_of_birth && (!isRealDate(f.date_of_birth) || f.date_of_birth > todayVN())) {
    errs.date_of_birth = 'Ngày sinh không hợp lệ hoặc ở tương lai!';
  }
  return errs;
};

const validatePassword = (f: ProfileForm): ProfileErrors => {
  const errs: ProfileErrors = {};
  if (!f.password) errs.password = 'Vui lòng nhập mật khẩu hiện tại để xác nhận lưu!';

  if (f.new_password) {
    if (f.new_password.length < PROFILE_LIMITS.passwordMin) errs.new_password = `Mật khẩu mới phải có tối thiểu ${PROFILE_LIMITS.passwordMin} ký tự!`;
    else if (new TextEncoder().encode(f.new_password).length > PROFILE_LIMITS.passwordMaxBytes) errs.new_password = `Mật khẩu mới quá dài (tối đa ${PROFILE_LIMITS.passwordMaxBytes} byte)!`;
    else if (f.new_password === f.password) errs.new_password = 'Mật khẩu mới phải khác mật khẩu hiện tại!';

    if (!f.confirm_password) errs.confirm_password = 'Vui lòng nhập lại mật khẩu mới!';
    else if (f.confirm_password !== f.new_password) errs.confirm_password = 'Mật khẩu xác nhận không khớp!';
  } else if (f.confirm_password) {
    errs.new_password = 'Vui lòng nhập mật khẩu mới!';
  }
  return errs;
};

// Rỗng = hợp lệ
export const validateProfileForm = (f: ProfileForm): ProfileErrors => ({
  ...validateAccount(f),
  ...validatePersonal(f),
  ...validatePassword(f),
});