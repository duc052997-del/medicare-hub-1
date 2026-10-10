import React, { useState } from 'react';

interface RegisterProps {
  onSwitchToLogin?: () => void;
}

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const [formData, setFormData] = useState({
    username: '', // Dùng cho UI giao diện
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    let newErrors = { username: '', email: '', password: '', confirmPassword: '' };
    let isValid = true;

    if (!formData.username.trim()) {
      newErrors.username = 'Vui lòng điền tên tài khoản!';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng điền địa chỉ email!';
      isValid = false;
    }

    // ĐỒNG BỘ VỚI BACKEND: Mật khẩu tối thiểu 8 ký tự (MIN_PASSWORD_LENGTH = 8)
    if (!formData.password) {
      newErrors.password = 'Vui lòng điền mật khẩu!';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có tối thiểu 8 ký tự!';
      isValid = false;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu!';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp!';
      isValid = false;
    }

    setErrors(newErrors);
    if (!isValid) return;

    try {
      setLoading(true);

      // Gọi API đến Backend 
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword, // BẮT BUỘC: Phải gửi confirmPassword để Backend kiểm tra
        }),
      });

      // AN TOÀN TUYỆT ĐỐI: Đọc text trước để tránh lỗi Unexpected end of JSON input nếu server trả về trống
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        data = { message: 'Phản hồi từ máy chủ không hợp lệ' };
      }

      // Xử lý khi Backend trả về mã lỗi (400, 409, 500...)
      if (!response.ok) {
        throw new Error(data.message || 'Đăng ký thất bại, vui lòng thử lại.');
      }

      // Lưu thông tin user nếu backend trả về thành công (201)
      if (data.user) {
        localStorage.setItem('userInfo', JSON.stringify(data.user));
      }

      setSuccessMessage(`${data.message || 'Đăng ký thành công'}! Đang chuyển hướng...`);
      
      setTimeout(() => {
        if (onSwitchToLogin) {
          onSwitchToLogin();
        }
      }, 1500);

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
          <h2 style={styles.title}>Tạo tài khoản mới</h2>
          <p style={styles.subtitle}>Hệ thống quản lý phòng khám MediCare Hub</p>
        </div>

        {generalError && <div style={styles.errorAlert}>{generalError}</div>}
        {successMessage && <div style={styles.successAlert}>{successMessage}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Tên tài khoản */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Tên tài khoản <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              style={{
                ...styles.input,
                borderColor: errors.username ? '#ef4444' : '#d1d5db',
              }}
              placeholder="Nhập tên tài khoản"
            />
            {errors.username && <span style={styles.errorText}>{errors.username}</span>}
          </div>

          {/* Địa chỉ Email */}
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

          {/* Mật khẩu */}
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

          {/* Nhập lại mật khẩu */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Nhập lại mật khẩu <span style={styles.required}>*</span>
            </label>
            <div style={styles.passwordWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={{
                  ...styles.passwordInput,
                  borderColor: errors.confirmPassword ? '#ef4444' : '#d1d5db',
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
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
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>

          <div style={styles.footer}>
            <span style={{ color: '#4b5563' }}>Đã có tài khoản? </span>
            <span onClick={onSwitchToLogin} style={styles.link}>
              Đăng nhập ngay
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

// Giữ nguyên giao diện style chuẩn UI
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