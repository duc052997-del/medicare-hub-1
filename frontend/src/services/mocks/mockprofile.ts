// services/mocks/mockprofile.ts
// Giả lập GET /api/auth/profile và PUT /api/auth/profile (UC009). Thứ tự kiểm tra: thiếu trường -> độ dài/định dạng -> mật khẩu -> trùng email.
// Khớp hợp đồng API-13/API-14 + patient.controller.js: full_name, address; PUT trả profile (FE chuẩn hóa).
// Mã lỗi để Tester thử:
//   - 400 + field: thiếu full_name/email/password, email/SĐT/ngày sinh/giới tính/ảnh/địa chỉ sai,
//     new_password (< 8 ký tự, > 72 byte, hoặc trùng mật khẩu hiện tại)
//   - 400 WRONG_PASSWORD (field password): mật khẩu xác nhận sai (KHÔNG dùng 401 vì api.ts sẽ coi là hết phiên và đăng xuất)
//   - 409 EMAIL_TAKEN (field email): email đã thuộc tài khoản khác
//   - 401: chưa đăng nhập / token sai (mockCurrentUser) | localStorage mock_error_500 = '1': 500
// Lưu ý: tài khoản seed không đổi được email dùng để ĐĂNG NHẬP trong mock (chỉ đổi phần hiển thị).

import { ApiError } from '../apierror';
import type { Gender, ProfilePayload, ProfileResult, UserProfile } from '../../types/profile';
import { MockUser, SEED_USERS } from './mockdata';
import { mockCurrentUser } from './mockauth';
import { delay, flag } from './mockutils';
import { isRealDate, todayVN } from '../../utils/schedule';

const PROFILES_KEY = 'mock_profiles';
const USERS_KEY = 'mock_users';
const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0\d{9}$/; // 10 số bắt đầu bằng 0 (khớp API-14)
const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
const MAX_FULL_NAME = 100;
const MAX_ADDRESS = 255;
const MIN_PASSWORD_LENGTH = 8; // cùng quy tắc với đăng ký (API-01)
const MAX_PASSWORD_BYTES = 72;
const MAX_AVATAR_CHARS = 700_000;

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bỏ qua */
  }
};

const registered = () => readJson<MockUser[]>(USERS_KEY, []);
const allUsers = () => [...SEED_USERS, ...registered()];
const overrides = () => readJson<Record<string, Partial<UserProfile>>>(PROFILES_KEY, {});

const buildProfile = (u: MockUser): UserProfile => {
  const o = overrides()[u.id] ?? {};
  // Tương thích dữ liệu mock cũ lưu dưới key "username"
  const legacy = o as Partial<UserProfile> & { username?: string };
  return {
    id: u.id,
    email: o.email ?? u.email,
    full_name: o.full_name ?? legacy.username ?? u.username ?? null,
    avatar_url: o.avatar_url ?? null,
    date_of_birth: o.date_of_birth ?? null,
    phone: o.phone ?? null,
    gender: o.gender ?? null,
    address: o.address ?? null,
  };
};

const currentUser = (): MockUser => {
  if (flag('mock_error_500')) throw new ApiError(500, SERVER_ERROR);
  const { id } = mockCurrentUser();
  const found = allUsers().find((u) => u.id === id);
  if (!found || !found.is_active) throw new ApiError(401, 'Phiên đăng nhập không còn hiệu lực, vui lòng đăng nhập lại');
  return found;
};

const text = (v: unknown) => (v == null ? '' : String(v).trim());
const bad = (message: string, field: string, code?: string) => new ApiError(400, message, code, field);

// ================= GET /api/auth/profile =================
export const mockGetProfile = async (): Promise<UserProfile> => {
  await delay(150, 400);
  return buildProfile(currentUser());
};

// ================= PUT /api/auth/profile =================
export const mockUpdateProfile = async (payload: ProfilePayload): Promise<ProfileResult> => {
  await delay();
  const me = currentUser();

  const fullName = text(payload?.full_name);
  const email = text(payload?.email).toLowerCase();
  const password = typeof payload?.password === 'string' ? payload.password : '';
  const newPassword = typeof payload?.new_password === 'string' ? payload.new_password : '';
  const phone = text(payload?.phone).replace(/\s/g, '');
  const dob = text(payload?.date_of_birth);
  const gender = text(payload?.gender);
  const avatar = text(payload?.avatar_url);
  const address = text(payload?.address);

  if (!fullName) throw bad('Vui lòng nhập họ và tên', 'full_name');
  if (!email) throw bad('Vui lòng nhập email', 'email');
  if (!password) throw bad('Vui lòng nhập mật khẩu', 'password');

  if (fullName.length > MAX_FULL_NAME) throw bad(`Họ và tên tối đa ${MAX_FULL_NAME} ký tự`, 'full_name');
  if (!EMAIL_REGEX.test(email)) throw bad('Email không hợp lệ', 'email');
  if (phone && !PHONE_REGEX.test(phone)) throw bad('Số điện thoại không hợp lệ', 'phone');
  if (dob && (!isRealDate(dob) || dob > todayVN())) throw bad('Ngày sinh không hợp lệ', 'date_of_birth');
  if (gender && !GENDERS.includes(gender as Gender)) throw bad('Giới tính không hợp lệ', 'gender');
  if (address.length > MAX_ADDRESS) throw bad(`Địa chỉ tối đa ${MAX_ADDRESS} ký tự`, 'address');
  if (newPassword && newPassword.length < MIN_PASSWORD_LENGTH) {
    throw bad(`Mật khẩu mới phải có tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`, 'new_password');
  }
  if (newPassword && new TextEncoder().encode(newPassword).length > MAX_PASSWORD_BYTES) {
    throw bad(`Mật khẩu mới quá dài (tối đa ${MAX_PASSWORD_BYTES} byte)`, 'new_password');
  }
  if (avatar && (!avatar.startsWith('data:image/') || avatar.length > MAX_AVATAR_CHARS)) {
    throw bad('Ảnh đại diện không hợp lệ hoặc quá lớn', 'avatar_url');
  }

  if (me.password !== password) throw bad('Mật khẩu không đúng', 'password', 'WRONG_PASSWORD');

  if (newPassword && newPassword === password) throw bad('Mật khẩu mới phải khác mật khẩu hiện tại', 'new_password');

  const taken = allUsers().some((u) => u.id !== me.id && buildProfile(u).email.toLowerCase() === email);
  if (taken) throw new ApiError(409, 'Email đã được sử dụng bởi tài khoản khác', 'EMAIL_TAKEN', 'email');

  const next: Partial<UserProfile> = {
    full_name: fullName,
    email,
    avatar_url: avatar || null,
    date_of_birth: dob || null,
    phone: phone || null,
    gender: (gender || null) as Gender | null,
    address: address || null,
  };
  writeJson(PROFILES_KEY, { ...overrides(), [me.id]: next });

  // Tài khoản đăng ký mới: đổi luôn email/tên trong "CSDL" để đăng nhập bằng email mới được
  // Có mật khẩu mới thì đổi luôn. Tài khoản seed (admin, patient1...) KHÔNG đổi được mật khẩu trong mock
  // (SEED_USERS là hằng số) và vẫn là Test@12345 để các ca test ổn định; chỉ tài khoản đăng ký mới được lưu.
  if (registered().some((u) => u.id === me.id)) {
    writeJson(
      USERS_KEY,
      registered().map((u) =>
        u.id === me.id
          ? { ...u, email, username: fullName, ...(newPassword ? { password: newPassword } : {}) }
          : u
      )
    );
  }

  return { message: 'Cập nhật thông tin cá nhân thành công', profile: buildProfile(me) };
};
