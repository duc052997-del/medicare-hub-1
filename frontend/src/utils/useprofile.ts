// utils/useprofile.ts
// UC009: trạng thái + hành động của trang Thông tin cá nhân (tải hồ sơ, sửa form, lưu).
// Component chỉ việc hiển thị; muốn đổi luồng (vd lưu xong ở lại trang) thì sửa ở đây.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { profileService } from '../services/profileservice';
import { saveUser } from '../services/session';
import { ApiError, GENERIC_ERROR } from '../services/apierror';
import { applyProfileToUser, isProfileFieldKey, toProfileForm, toProfilePayload, validateProfileForm } from './profileform';
import type { AuthUser } from '../types';
import type { ProfileErrors, ProfileFieldKey, ProfileForm } from '../types/profile';

const BACK_DELAY_MS = 900; // cho người dùng kịp thấy thông báo thành công trước khi quay lại
const LOAD_ERROR = 'Không thể tải thông tin cá nhân, vui lòng thử lại sau.';

export type ProfileNotice = { kind: 'success' | 'error'; text: string } | null;
export type ProfileChange = <K extends ProfileFieldKey>(key: K, value: ProfileForm[K]) => void;

interface Options {
  user: AuthUser;
  onSaved: (user: AuthUser) => void; // App cập nhật người dùng -> Header đổi tên/ảnh ngay
  onDone: () => void; // lưu xong (sau một lúc ngắn) -> quay lại trang trước
}

export function useProfile({ user, onSaved, onDone }: Options) {
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);

  const [errors, setErrors] = useState<ProfileErrors>({});
  const [notice, setNotice] = useState<ProfileNotice>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false); // đã lưu xong, đang chờ quay lại
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Tải hồ sơ hiện tại
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    profileService
      .getProfile()
      .then((p) => !cancelled && setForm(toProfileForm(p)))
      .catch((err) => !cancelled && setLoadError(err instanceof ApiError && err.message ? err.message : LOAD_ERROR))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [retry]);

  const reload = useCallback(() => setRetry((n) => n + 1), []);

  // Sửa 1 ô: xóa lỗi của ô đó và thông báo cũ
  const setField: ProfileChange = useCallback((key, value) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    setNotice(null);
  }, []);

  const setFieldError = useCallback((key: ProfileFieldKey, message: string) => {
    setErrors((e) => ({ ...e, [key]: message }));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || saving || done) return;
    setNotice(null);

    const found = validateProfileForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    const changedPassword = !!form.new_password;
    try {
      setSaving(true);
      const result = await profileService.update(toProfilePayload(form));
      const next = applyProfileToUser(user, result.profile);
      saveUser(next);
      onSaved(next);
      setForm(toProfileForm(result.profile)); // xóa luôn các ô mật khẩu
      setDone(true);
      setNotice({
        kind: 'success',
        text: `${result.message || 'Cập nhật thông tin cá nhân thành công'}${changedPassword ? ' (đã đổi mật khẩu)' : ''}. Đang quay lại trang trước...`,
      });
      timer.current = setTimeout(onDone, BACK_DELAY_MS);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const message = apiErr?.message || GENERIC_ERROR;
      const field = apiErr?.field;
      if (isProfileFieldKey(field)) setErrors({ [field]: message });
      else setNotice({ kind: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  return { form, loading, loadError, errors, notice, saving, busy: saving || done, reload, setField, setFieldError, submit };
}