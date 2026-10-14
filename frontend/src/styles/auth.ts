// styles/auth.ts
// Style chung của Login, Register (trước đây mỗi trang chép 1 bản).

import type { CSSProperties } from 'react';

const input: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#d1d5db', // tách 3 thuộc tính để Field đổi borderColor khi có lỗi mà React không cảnh báo
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
};

const alert: CSSProperties = { padding: '12px', marginBottom: '16px', borderRadius: '6px', fontSize: '14px' };

export const authStyles: Record<string, CSSProperties> = {
  container: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '20px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' },
  card: { width: '100%', maxWidth: '440px', padding: '32px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)' },
  header: { textAlign: 'center', marginBottom: '24px' },
  title: { fontSize: '26px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' },
  subtitle: { fontSize: '14px', color: '#6b7280', margin: '0' },
  errorAlert: { ...alert, backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
  successAlert: { ...alert, backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '14px', fontWeight: '500', color: '#374151' },
  required: { color: '#ef4444' },
  input,
  passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  passwordInput: { ...input, padding: '10px 40px 10px 14px' },
  eyeButton: { position: 'absolute', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0' },
  errorText: { fontSize: '12px', color: '#ef4444', marginTop: '2px' },
  button: { width: '100%', padding: '12px', fontSize: '15px', fontWeight: '600', color: '#ffffff', border: 'none', borderRadius: '6px', marginTop: '8px', transition: 'background-color 0.2s' },
  footer: { marginTop: '16px', textAlign: 'center', fontSize: '14px' },
  link: { color: '#2563eb', textDecoration: 'none', fontWeight: '500', cursor: 'pointer' },
};