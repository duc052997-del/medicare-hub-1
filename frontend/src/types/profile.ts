// types/profile.ts
// UC009 / API-13, API-14 — thông tin cá nhân (Patient + Admin):
//   GET /api/auth/profile  -> { success, message, profile }
//   PUT /api/auth/profile  -> { success, message, profile }  (request = ProfilePayload)
// Chuẩn: hop-dong-API-MediCare-Hub.xlsx

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface UserProfile {
  id: string | number;
  email: string;
  username: string;
  avatar_url: string | null;
  date_of_birth: string | null; // YYYY-MM-DD
  phone: string | null;
  gender: Gender | null;
}

// Bắt buộc: username, email, password. Không bắt buộc: avatar_url, date_of_birth, phone, gender, new_password (gửi null nếu bỏ trống)
export interface ProfilePayload {
  username: string; // <= 50 ký tự
  email: string;
  password: string; // mật khẩu hiện tại, để xác nhận lưu
  new_password: string | null; // mật khẩu mới (>= 8 ký tự, <= 72 byte, khác mật khẩu hiện tại); null = không đổi mật khẩu
  avatar_url: string | null;
  date_of_birth: string | null;
  phone: string | null;
  gender: Gender | null;
}

export interface ProfileResult {
  message: string;
  profile: UserProfile;
}

// ---------- Form trang Thông tin cá nhân (chỉ dùng ở FE) ----------
// Thêm trường mới: thêm vào ProfileForm -> EMPTY_PROFILE_FORM / toProfileForm / toProfilePayload / validate (utils/profileform.ts) -> 1 ô trong components/profilesections.tsx
export interface ProfileForm {
  username: string;
  email: string;
  password: string; // mật khẩu hiện tại (xác nhận lưu)
  new_password: string; // không bắt buộc
  confirm_password: string; // chỉ FE, không gửi lên BE
  date_of_birth: string;
  phone: string;
  gender: Gender | '';
  avatar_url: string;
}

export type ProfileFieldKey = keyof ProfileForm;
export type ProfileErrors = Partial<Record<ProfileFieldKey, string>>;