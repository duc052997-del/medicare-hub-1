// components/avatarpicker.tsx — Chọn / đổi / xóa ảnh đại diện (UC009, không bắt buộc).
// Chọn ảnh xong gọi onChange(dataUrl) ngay để xem trước; ảnh chỉ được lưu khi bấm "Lưu thông tin" ở form.
// Ảnh được cắt vuông và thu nhỏ trên FE (utils/image.ts). Chưa có ảnh/ảnh lỗi thì hiện chữ cái đầu.
import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import SafeImage from './safeimage';
import { imageToSquareDataUrl } from '../utils/image';
import { profileStyles as s } from '../styles/profile';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ảnh gốc tối đa 5MB
const AVATAR_SIZE = 256; // px, sau khi thu nhỏ

interface AvatarPickerProps {
  value: string; // data URL hoặc đường dẫn ảnh; '' = chưa có
  initial: string; // chữ cái hiện khi chưa có ảnh
  error?: string;
  disabled?: boolean;
  onChange: (dataUrl: string) => void; // '' = xóa ảnh
  onError: (message: string) => void;
}

export default function AvatarPicker({ value, initial, error, disabled, onChange, onError }: AvatarPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng 1 file
    if (!file) return;
    if (!file.type.startsWith('image/')) return onError('Vui lòng chọn một tệp ảnh');
    if (file.size > MAX_IMAGE_BYTES) return onError('Ảnh tối đa 5MB');
    try {
      onChange(await imageToSquareDataUrl(file, AVATAR_SIZE));
    } catch {
      onError('Không đọc được ảnh, vui lòng chọn ảnh khác');
    }
  };

  return (
    <div style={s.avatarRow}>
      <SafeImage
        key={value} // chọn ảnh mới thì dựng lại, để ảnh lỗi trước đó không chặn ảnh mới
        src={value || undefined}
        alt="Ảnh đại diện"
        style={s.avatarImg}
        fallback={<div style={s.avatar}>{initial}</div>}
      />
      <div style={s.avatarActions}>
        <span style={s.label}>Ảnh đại diện</span>
        <div style={s.avatarButtons}>
          <button type="button" className="mh-btn" disabled={disabled} onClick={() => fileRef.current?.click()} style={s.btnSmall}>
            {value ? 'Đổi ảnh' : 'Chọn ảnh'}
          </button>
          {value && (
            <button type="button" className="mh-btn" disabled={disabled} onClick={() => onChange('')} style={{ ...s.btnSmall, ...s.btnSmallDanger }}>
              Xóa ảnh
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
        {error ? (
          <span style={s.error}>{error}</span>
        ) : (
          <span style={s.hint}>Không bắt buộc. Ảnh được cắt vuông và thu nhỏ tự động; bấm "Lưu thông tin" để áp dụng.</span>
        )}
      </div>
    </div>
  );
}