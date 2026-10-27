// components/profilesections.tsx — Các nhóm ô của form Thông tin cá nhân (UC009).
// Mỗi nhóm nhận cùng một bộ props (SectionProps). Thêm trường mới = thêm 1 ô vào nhóm phù hợp,
// hoặc viết thêm 1 nhóm mới rồi gắn vào profileform.tsx.
import { PasswordField, SelectField, TextField } from './profilefields';
import { GENDER_OPTIONS, PROFILE_LIMITS, toGender } from '../utils/profileform';
import { todayVN } from '../utils/schedule';
import { profileStyles as s } from '../styles/profile';
import type { ProfileChange } from '../utils/useprofile';
import type { ProfileErrors, ProfileForm } from '../types/profile';

export interface SectionProps {
  form: ProfileForm;
  errors: ProfileErrors;
  disabled: boolean;
  onChange: ProfileChange;
}

// Họ tên, email (bắt buộc) — khớp API-14: full_name + email
export function AccountSection({ form, errors, disabled, onChange }: SectionProps) {
  return (
    <>
      <TextField
        label="Họ và tên"
        required
        value={form.full_name}
        error={errors.full_name}
        disabled={disabled}
        placeholder="Nhập họ và tên"
        onChange={(v) => onChange('full_name', v)}
      />
      <TextField
        label="Email"
        required
        type="email"
        value={form.email}
        error={errors.email}
        disabled={disabled}
        placeholder="name@example.com"
        onChange={(v) => onChange('email', v)}
      />
    </>
  );
}

// Ngày sinh, giới tính, số điện thoại, địa chỉ (không bắt buộc)
export function PersonalSection({ form, errors, disabled, onChange }: SectionProps) {
  return (
    <>
      <div style={s.twoCol}>
        <TextField
          label="Ngày sinh"
          type="date"
          max={todayVN()}
          value={form.date_of_birth}
          error={errors.date_of_birth}
          disabled={disabled}
          onChange={(v) => onChange('date_of_birth', v)}
        />
        <SelectField
          label="Giới tính"
          value={form.gender}
          error={errors.gender}
          disabled={disabled}
          options={GENDER_OPTIONS}
          emptyLabel="Không chọn"
          onChange={(v) => onChange('gender', toGender(v))}
        />
      </div>
      <TextField
        label="Số điện thoại"
        type="tel"
        value={form.phone}
        error={errors.phone}
        disabled={disabled}
        placeholder="0912345678"
        onChange={(v) => onChange('phone', v)}
      />
      <TextField
        label="Địa chỉ"
        value={form.address}
        error={errors.address}
        disabled={disabled}
        placeholder="Số nhà, đường, quận/huyện..."
        onChange={(v) => onChange('address', v)}
      />
    </>
  );
}

// Mật khẩu hiện tại (bắt buộc, xác nhận lưu) + mật khẩu mới (không bắt buộc, chỉ khi muốn đổi)
export function PasswordSection({ form, errors, disabled, onChange }: SectionProps) {
  return (
    <>
      <PasswordField
        label="Mật khẩu hiện tại"
        required
        value={form.password}
        error={errors.password}
        disabled={disabled}
        autoComplete="current-password"
        hint="Nhập mật khẩu hiện tại để xác nhận lưu thay đổi."
        onChange={(v) => onChange('password', v)}
      />
      <PasswordField
        label="Mật khẩu mới"
        value={form.new_password}
        error={errors.new_password}
        disabled={disabled}
        autoComplete="new-password"
        placeholder="Để trống nếu không đổi mật khẩu"
        hint={`Không bắt buộc. Chỉ nhập khi muốn đổi mật khẩu (tối thiểu ${PROFILE_LIMITS.passwordMin} ký tự).`}
        onChange={(v) => onChange('new_password', v)}
      />
      <PasswordField
        label="Nhập lại mật khẩu mới"
        required={!!form.new_password}
        value={form.confirm_password}
        error={errors.confirm_password}
        disabled={disabled}
        autoComplete="new-password"
        placeholder="Nhập lại mật khẩu mới"
        onChange={(v) => onChange('confirm_password', v)}
      />
    </>
  );
}
