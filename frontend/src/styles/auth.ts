// styles/auth.ts
// Style form đăng nhập / đăng ký (AuthLayout + Field).
import type { CSSProperties } from 'react';

const inputBase: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  outline: 'none',
  backgroundColor: '#fff',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export const authStyles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #e0f2fe 100%)',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '28px 28px 24px',
    boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
    border: '1px solid #e2e8f0',
  },
  header: { marginBottom: 20, textAlign: 'center' },
  title: { margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: 0, fontSize: 13, color: '#64748b' },

  errorAlert: {
    marginBottom: 14,
    padding: '10px 12px',
    fontSize: 13,
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
  },
  successAlert: {
    marginBottom: 14,
    padding: '10px 12px',
    fontSize: 13,
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
  },

  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1e293b' },
  required: { color: '#ef4444' },
  input: inputBase,
  passwordInput: { ...inputBase, paddingRight: 44 },
  passwordWrapper: { position: 'relative' },
  eyeButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    padding: 4,
  },
  errorText: { fontSize: 12, color: '#ef4444' },

  button: {
    marginTop: 4,
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontFamily: 'inherit',
  },
  footer: { marginTop: 4, textAlign: 'center', fontSize: 13 },
  link: { color: '#2563eb', fontWeight: 600, cursor: 'pointer' },
};
