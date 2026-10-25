// components/profileform.tsx — UC009: biểu mẫu Thông tin cá nhân (dùng cho cả bệnh nhân và admin).
// Chỉ ghép các phần lại và hiển thị trạng thái tải/lỗi; logic ở utils/useprofile.ts, kiểm tra dữ liệu ở utils/profileform.ts.
// Bắt buộc khi lưu: tên tài khoản, email, mật khẩu hiện tại. Không bắt buộc: ảnh, ngày sinh, SĐT, giới tính, mật khẩu mới.
import AvatarPicker from './avatarpicker';
import { AccountSection, PasswordSection, PersonalSection } from './profilesections';
import { useProfile } from '../utils/useprofile';
import { getRoleLabel } from '../utils/helpers';
import { profileStyles as s } from '../styles/profile';
import type { AuthUser } from '../types';

interface ProfileFormProps {
  user: AuthUser;
  onSaved: (user: AuthUser) => void; // cập nhật người dùng ở App (Header đổi tên/ảnh ngay)
  onBack: () => void; // Hủy, hoặc lưu xong -> quay lại trang trước
}

export default function ProfileForm({ user, onSaved, onBack }: ProfileFormProps) {
  const p = useProfile({ user, onSaved, onDone: onBack });
  const { form, errors, busy } = p;
  const section = { errors, disabled: busy, onChange: p.setField };

  return (
    <section style={s.card}>
      <p style={s.role}>Vai trò: {getRoleLabel(user.role)}</p>

      {p.loading && <div style={s.note}>Đang tải thông tin cá nhân...</div>}

      {!p.loading && p.loadError && (
        <div role="alert" style={{ ...s.notice, ...s.noticeError, textAlign: 'center' }}>
          <div style={{ marginBottom: 10 }}>{p.loadError}</div>
          <button type="button" className="mh-btn" onClick={p.reload} style={s.btnLine}>Thử lại</button>
        </div>
      )}

      {!p.loading && form && (
        <form onSubmit={p.submit} style={s.form} noValidate>
          {p.notice && (
            <div role="alert" style={{ ...s.notice, ...(p.notice.kind === 'success' ? s.noticeOk : s.noticeError) }}>
              {p.notice.text}
            </div>
          )}

          <AvatarPicker
            value={form.avatar_url}
            initial={(form.username.trim() || user.username || user.email).charAt(0).toUpperCase()}
            error={errors.avatar_url}
            disabled={busy}
            onChange={(url) => p.setField('avatar_url', url)}
            onError={(msg) => p.setFieldError('avatar_url', msg)}
          />

          <AccountSection form={form} {...section} />
          <PersonalSection form={form} {...section} />
          <PasswordSection form={form} {...section} />

          <div style={s.actions}>
            <button type="button" className="mh-btn" onClick={onBack} disabled={busy} style={s.btnLine}>Hủy</button>
            <button
              type="submit"
              className="mh-btn"
              disabled={busy}
              style={{ ...s.btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              {p.saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}