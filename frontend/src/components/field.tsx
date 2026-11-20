import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { authStyles as s } from '../styles/auth';

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  password?: boolean; // true -> có nút 👁️ ẩn/hiện mật khẩu
}

// 1 ô nhập của form đăng nhập/đăng ký: nhãn *, viền đỏ + dòng lỗi khi có lỗi
export default function Field({ label, name, value, onChange, error, placeholder, type = 'text', password }: FieldProps) {
  const [show, setShow] = useState(false);

  const input = (
    <input
      type={password ? (show ? 'text' : 'password') : type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ ...(password ? s.passwordInput : s.input), borderColor: error ? '#ef4444' : '#d1d5db' }}
    />
  );

  return (
    <div style={s.inputGroup}>
      <label style={s.label}>
        {label} <span style={s.required}>*</span>
      </label>

      {password ? (
        <div style={s.passwordWrapper}>
          {input}
          <button type="button" onClick={() => setShow(!show)} style={s.eyeButton}>
            {show ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      ) : (
        input
      )}

      {error && <span style={s.errorText}>{error}</span>}
    </div>
  );
}