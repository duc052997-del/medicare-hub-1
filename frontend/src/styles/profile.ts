// styles/profile.ts
// Style của trang Thông tin cá nhân (UC009). Khung trang/Header/Footer dùng chung ở styles/layout.ts.
import type { CSSProperties } from 'react';

export const profileStyles: Record<string, CSSProperties> = {
  // Khung trang và thẻ biểu mẫu nổi lên banner
  main: { padding: '0 16px 56px' },
  card: { position: 'relative', maxWidth: 640, margin: '-28px auto 0', padding: '24px 28px 28px', backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 16, boxShadow: '0 12px 32px rgba(15,23,42,.1)' },
  role: { margin: '0 0 14px', fontSize: 13, color: '#64748b' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  note: { padding: '24px 12px', textAlign: 'center', fontSize: 14, color: '#64748b' },

  // Thông báo
  notice: { padding: '12px 14px', borderRadius: 8, fontSize: 14 },
  noticeOk: { color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' },
  noticeError: { color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' },

  // Ô nhập
  group: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 14, fontWeight: 700, color: '#1e293b' },
  required: { color: '#ef4444' },
  input: { padding: '10px 12px', fontSize: 14, borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', borderRadius: 8, outline: 'none', backgroundColor: '#fff', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' },
  inputError: { borderColor: '#ef4444' },
  error: { fontSize: 12, color: '#ef4444' },
  hint: { fontSize: 12, color: '#64748b' },
  pwWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  eye: { position: 'absolute', right: 10, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 },

  // Ảnh đại diện
  avatarRow: { display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', backgroundColor: '#f5faff', border: '1px solid #dbeafe', borderRadius: 12 },
  avatar: { width: 88, height: 88, flexShrink: 0, borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: 36, background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 88, height: 88, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', border: '3px solid #dbeafe' },
  avatarActions: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  avatarButtons: { display: 'flex', gap: 8, flexWrap: 'wrap' },

  // Nút
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  btnPrimary: { padding: '10px 26px', fontSize: 14, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnLine: { padding: '10px 22px', fontSize: 14, fontWeight: 600, color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb', borderRadius: 8, cursor: 'pointer' },
  btnSmall: { padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #bfdbfe', borderRadius: 8, cursor: 'pointer' },
  btnSmallDanger: { color: '#dc2626', borderColor: '#fecaca' },
};