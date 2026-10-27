// types/profile.ts
// UC009 / API-13, API-14 — thông tin cá nhân (Patient + Admin):
//   GET /api/auth/profile  -> { success, message, profile }
//   PUT /api/auth/profile  -> { success, message, patient }  (request = ProfilePayload)
// Chuẩn: hop-dong-API-MediCare-Hub.xlsx + patient.controller.js

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// Khớp formatProfile() phía BE (API-13/API-14)
export interface UserProfile {
  id: string | number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null; // YYYY-MM-DD
  phone: string | null;
  gender: Gender | null;
  address: string | null;
}

// Request PUT API-14. Bắt buộc: full_name, email, password.
// Không bắt buộc: avatar_url, date_of_birth, phone, gender, address, new_password (gửi null nếu bỏ trống)
export interface ProfilePayload {
  full_name: string; // <= 100 ký tự
  email: string;
  password: string; // mật khẩu hiện tại, để xác nhận lưu
  new_password: string | null; // mật khẩu mới (>= 8 ký tự, <= 72 byte, khác mật khẩu hiện tại); null = không đổi
  avatar_url: string | null;
  date_of_birth: string | null;
  phone: string | null;
  gender: Gender | null;
  address: string | null; // <= 255 ký tự
}

export interface ProfileResult {
  message: string;
  profile: UserProfile;
}

// ---------- Form trang Thông tin cá nhân (chỉ dùng ở FE) ----------
// Thêm trường mới: thêm vào ProfileForm -> EMPTY_PROFILE_FORM / toProfileForm / toProfilePayload / validate (utils/profileform.ts) -> 1 ô trong components/profilesections.tsx
export interface ProfileForm {
  full_name: string;
  email: string;
  password: string; // mật khẩu hiện tại (xác nhận lưu)
  new_password: string; // không bắt buộc
  confirm_password: string; // chỉ FE, không gửi lên BE
  date_of_birth: string;
  phone: string;
  gender: Gender | '';
  address: string;
  avatar_url: string;
}

export type ProfileFieldKey = keyof ProfileForm;
export type ProfileErrors = Partial<Record<ProfileFieldKey, string>>;
