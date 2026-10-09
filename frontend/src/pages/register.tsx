import { useState } from 'react';
import type { FormEvent } from 'react';
import AuthLayout from '../components/authlayout';
import Field from '../components/field';
import { authService } from '../services/authservice';
import { ApiError } from '../services/apierror';
import { useForm } from '../utils/useform';

interface RegisterProps {
  onSwitchToLogin?: () => void;
}

const MIN_PASSWORD_LENGTH = 8; // đồng bộ với backend

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const { values, errors, setErrors, onChange } = useForm({
    username: '', email: '', password: '', confirmPassword: '',
  });
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setSuccess('');

    const { username, email, password, confirmPassword } = values;
    const errs = {
      username: username.trim() ? '' : 'Vui lòng điền tên tài khoản!',
      email: email.trim() ? '' : 'Vui lòng điền địa chỉ email!',
      password: !password
        ? 'Vui lòng điền mật khẩu!'
        : password.length < MIN_PASSWORD_LENGTH
          ? `Mật khẩu phải có tối thiểu ${MIN_PASSWORD_LENGTH} ký tự!`
          : '',
      confirmPassword: !confirmPassword
        ? 'Vui lòng nhập lại mật khẩu!'
        : password !== confirmPassword
          ? 'Mật khẩu xác nhận không khớp!'
          : '',
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    try {
      setLoading(true);
      // Hợp đồng API-01 bắt buộc đủ 4 trường: email, username, password, confirmPassword
      const result = await authService.register({ email, username: username.trim(), password, confirmPassword });
      setSuccess(`${result.message || 'Đăng ký thành công'}! Đang chuyển hướng...`);
      setTimeout(() => onSwitchToLogin?.(), 1500);
    } catch (err) {
      setGeneralError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Tạo tài khoản mới"
      error={generalError}
      success={success}
      loading={loading}
      submitText="Đăng ký"
      onSubmit={handleSubmit}
      footerText="Đã có tài khoản?"
      footerLink="Đăng nhập ngay"
      onFooterClick={onSwitchToLogin}
    >
      <Field label="Tên tài khoản" name="username" placeholder="Nhập tên tài khoản"
        value={values.username} error={errors.username} onChange={onChange} />
      <Field label="Địa chỉ Email" name="email" type="email" placeholder="name@example.com"
        value={values.email} error={errors.email} onChange={onChange} />
      <Field label="Mật khẩu" name="password" password placeholder="••••••••"
        value={values.password} error={errors.password} onChange={onChange} />
      <Field label="Nhập lại mật khẩu" name="confirmPassword" password placeholder="••••••••"
        value={values.confirmPassword} error={errors.confirmPassword} onChange={onChange} />
    </AuthLayout>
  );
}