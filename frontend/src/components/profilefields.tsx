// components/profilefields.tsx — Các ô nhập của trang Thông tin cá nhân (UC009).
// FieldShell lo nhãn, dấu * bắt buộc, viền đỏ + dòng lỗi/gợi ý; TextField, SelectField, PasswordField dùng lại FieldShell.
// Muốn thêm kiểu ô mới (vd textarea), viết thêm 1 component ở đây rồi dùng trong profilesections.tsx.
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { profileStyles as s } from '../styles/profile';

interface ShellProps {
  id: string; // id của ô nhập, để <label htmlFor> trỏ tới
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldShell({ id, label, required, error, hint, children }: ShellProps) {
  return (
    <div style={s.group}>
      <label htmlFor={id} style={s.label}>
        {label} {required && <span style={s.required}>*</span>}
      </label>
      {children}
      {error ? <span id={`${id}-msg`} role="alert" style={s.error}>{error}</span> : hint ? <span id={`${id}-msg`} style={s.hint}>{hint}</span> : null}
    </div>
  );
}

// Thuộc tính chung của mọi ô: onChange nhận thẳng chuỗi giá trị, không phải sự kiện
interface BaseProps extends Omit<ShellProps, 'children' | 'id'> {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const inputStyle = (error?: string, extra = {}) => ({ ...s.input, ...extra, ...(error ? s.inputError : {}) });

// Thuộc tính trợ năng chung cho mọi ô nhập
const a11y = (id: string, error?: string) => ({ id, 'aria-invalid': !!error, 'aria-describedby': `${id}-msg` });

interface TextProps extends BaseProps {
  type?: 'text' | 'email' | 'tel' | 'date';
  placeholder?: string;
  max?: string;
}

export function TextField({ type = 'text', placeholder, max, ...p }: TextProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={p.label} required={p.required} error={p.error} hint={p.hint}>
      <input
        {...a11y(id, p.error)}
        type={type}
        value={p.value}
        max={max}
        disabled={p.disabled}
        placeholder={placeholder}
        onChange={(e) => p.onChange(e.target.value)}
        style={inputStyle(p.error)}
      />
    </FieldShell>
  );
}

interface SelectProps extends BaseProps {
  options: { value: string; label: string }[];
  emptyLabel: string; // lựa chọn "không chọn" (value rỗng)
}

export function SelectField({ options, emptyLabel, ...p }: SelectProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={p.label} required={p.required} error={p.error} hint={p.hint}>
      <select {...a11y(id, p.error)} value={p.value} disabled={p.disabled} onChange={(e) => p.onChange(e.target.value)} style={inputStyle(p.error)}>
        <option value="">{emptyLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FieldShell>
  );
}

interface PasswordProps extends BaseProps {
  placeholder?: string;
  autoComplete?: 'current-password' | 'new-password';
}

// Ô mật khẩu có nút 👁️ ẩn/hiện, mỗi ô tự giữ trạng thái ẩn/hiện của nó
export function PasswordField({ placeholder = '••••••••', autoComplete, ...p }: PasswordProps) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <FieldShell id={id} label={p.label} required={p.required} error={p.error} hint={p.hint}>
      <div style={s.pwWrap}>
        <input
          {...a11y(id, p.error)}
          type={show ? 'text' : 'password'}
          value={p.value}
          disabled={p.disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => p.onChange(e.target.value)}
          style={inputStyle(p.error, { paddingRight: 44 })}
        />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} style={s.eye}>
          {show ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>
    </FieldShell>
  );
}