import type { FormEvent, ReactNode } from 'react';
import { authStyles as s } from '../styles/auth';

interface AuthLayoutProps {
  title: string;
  error: string;
  success: string;
  loading: boolean;
  submitText: string;
  onSubmit: (e: FormEvent) => void;
  footerText: string;
  footerLink: string;
  onFooterClick?: () => void;
  children: ReactNode; // các ô nhập (Field)
}

// Khung chung của Login và Register: tiêu đề, thông báo, form, nút gửi, dòng chuyển trang
export default function AuthLayout({
  title, error, success, loading, submitText, onSubmit, footerText, footerLink, onFooterClick, children,
}: AuthLayoutProps) {
  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.header}>
          <h2 style={s.title}>{title}</h2>
          <p style={s.subtitle}>Hệ thống quản lý phòng khám MediCare Hub</p>
        </div>

        {error && <div style={s.errorAlert}>{error}</div>}
        {success && <div style={s.successAlert}>{success}</div>}

        <form onSubmit={onSubmit} style={s.form}>
          {children}

          <button
            type="submit"
            disabled={loading}
            style={{ ...s.button, backgroundColor: loading ? '#9ca3af' : '#2563eb', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Đang xử lý...' : submitText}
          </button>

          <div style={s.footer}>
            <span style={{ color: '#4b5563' }}>{footerText} </span>
            <span onClick={onFooterClick} style={s.link}>{footerLink}</span>
          </div>
        </form>
      </div>
    </div>
  );
}