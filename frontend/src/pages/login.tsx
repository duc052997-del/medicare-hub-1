import { useState } from 'react';
import type { FormEvent } from 'react';
import AuthLayout from '../components/authlayout';
import Field from '../components/field';
import { authService } from '../services/authservice';
import { ApiError } from '../services/apierror';
import { useForm } from '../utils/useform';

interface LoginProps {
  onSwitchToRegister?: () => void;
  onLoginSuccess?: () => void;
}

export default function Login({ onSwitchToRegister, onLoginSuccess }: LoginProps) {
  const { values, errors, setErrors, onChange } = useForm({ email: '', password: '' }); // khớp API-02
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setSuccess('');

    const errs = {
      email: values.email.trim() ? '' : 'Vui lòng điền địa chỉ email!',
      password: values.password ? '' : 'Vui lòng điền mật khẩu!',
    };
    setErrors(errs);
    if (errs.email || errs.password) return;

    try {
      setLoading(true);
      // authService tự chọn mock / BE thật (VITE_USE_MOCK) và tự lưu token + userInfo
      const result = await authService.login(values.email, values.password);
      setSuccess(`${result.message || 'Đăng nhập thành công'}! Đang chuyển hướng...`);

      setTimeout(() => (onLoginSuccess ? onLoginSuccess() : (window.location.href = '/')), 1000);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const field = apiErr?.field;
      // BE trả "field" cho lỗi email/mật khẩu -> hiện ngay dưới ô nhập tương ứng
      if (apiErr && (field === 'email' || field === 'password')) {
        setErrors((prev) => ({ ...prev, [field]: apiErr.message }));
      } else {
        setGeneralError(apiErr?.message || 'Đã có lỗi xảy ra từ máy chủ.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập hệ thống"
      error={generalError}
      success={success}
      loading={loading}
      submitText="Đăng nhập"
      onSubmit={handleSubmit}
      footerText="Chưa có tài khoản?"
      footerLink="Đăng ký ngay"
      onFooterClick={onSwitchToRegister}
    >
      <Field label="Địa chỉ Email" name="email" type="email" placeholder="name@example.com"
        value={values.email} error={errors.email} onChange={onChange} />
      <Field label="Mật khẩu" name="password" password placeholder="••••••••"
        value={values.password} error={errors.password} onChange={onChange} />
    </AuthLayout>
  );
}