import React, { useState } from 'react';

interface LoginProps {
  onSwitchToRegister?: () => void;
  onLoginSuccess?: () => void;
}

export default function Login({ onSwitchToRegister, onLoginSuccess }: LoginProps) {
  const [formData, setFormData] = useState({
    email: '', // Đổi từ emailOrUsername sang email để khớp hoàn toàn với Backend auth.controller.js
    password: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    let newErrors = { email: '', password: '' };
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng điền địa chỉ email!';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng điền mật khẩu!';
      isValid = false;
    }

    setErrors(newErrors);
    if (!isValid) return;

    try {
      setLoading(true);
      
      // Gọi API đến Backend Express (Cổng 5000)
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        data = { message: 'Phản hồi từ máy chủ không hợp lệ' };
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin.');
      }

      setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
      
      // TẬN DỤNG BACKEND: Lưu token và thông tin user vào localStorage để dùng cho middleware sau này
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('userInfo', JSON.stringify(data.user));
      }

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          window.location.href = '/';
        }
      }, 1000);

    } catch (err: any) {
      setGeneralError(err.message || 'Đã có lỗi xảy ra từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Đăng nhập hệ thống</h2>
          <p style={styles.subtitle}>Hệ thống quản lý phòng khám MediCare Hub</p>
        </div>

        {generalError && <div style={styles.errorAlert}>{generalError}</div>}
        {successMessage && <div style={styles.successAlert}>{successMessage}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Địa chỉ Email <span style={styles.required}>*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                ...styles.input,
                borderColor: errors.email ? '#ef4444' : '#d1d5db',
              }}
              placeholder="name@example.com"
            />
            {errors.email && <span style={styles.errorText}>{errors.email}</span>}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Mật khẩu <span style={styles.required}>*</span>
            </label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                style={{
                  ...styles.passwordInput,
                  borderColor: errors.password ? '#ef4444' : '#d1d5db',
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <span style={styles.errorText}>{errors.password}</span>}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              backgroundColor: loading ? '#9ca3af' : '#2563eb',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>

          <div style={styles.footer}>
            <span style={{ color: '#4b5563' }}>Chưa có tài khoản? </span>
            <span onClick={onSwitchToRegister} style={styles.link}>
              Đăng ký ngay
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: '20px',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
  },
  errorAlert: {
    padding: '12px',
    marginBottom: '16px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '14px',
  },
  successAlert: {
    padding: '12px',
    marginBottom: '16px',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  passwordWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    padding: '10px 40px 10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: '10px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0',
  },
  errorText: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '2px',
  },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
  footer: {
    marginTop: '16px',
    textAlign: 'center' as const,
    fontSize: '14px',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '500',
    cursor: 'pointer',
  },
};