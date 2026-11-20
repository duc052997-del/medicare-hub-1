// styles/layout.ts
// Style dùng chung: khung trang, Header, Footer (trước đây chép lặp ở home.tsx và doctors.tsx).

import type { CSSProperties } from 'react';

export const inner: CSSProperties = { maxWidth: 1200, margin: '0 auto' };

export const layoutStyles: Record<string, CSSProperties> = {
  container: { minHeight: '100vh', width: '100%', backgroundColor: '#f5faff', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#334155', boxSizing: 'border-box' },

  // Header
  header: { position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 48px', backgroundColor: 'rgba(240,247,255,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #dbeafe' },
  logoBox: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  logoImg: { width: 32, height: 32, objectFit: 'contain' },
  logoText: { fontSize: 20, fontWeight: 800, color: '#1d4ed8', letterSpacing: 0.3 },
  nav: { display: 'flex', gap: 28 },
  navLink: { fontSize: 15, fontWeight: 500, color: '#475569', cursor: 'pointer', transition: 'color .2s' },
  navActive: { color: '#2563eb', fontWeight: 700 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 14 },
  hotline: { fontSize: 14, fontWeight: 600, color: '#dc2626' },
  userBox: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: { width: 38, height: 38, borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  userInfo: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 },
  userName: { fontSize: 14, fontWeight: 600, color: '#0f172a', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roleBadge: { alignSelf: 'flex-start', marginTop: 2, padding: '1px 8px', fontSize: 11, fontWeight: 600, color: '#1d4ed8', backgroundColor: '#dbeafe', borderRadius: 999 },
  btnPrimarySm: { padding: '8px 18px', fontSize: 14, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', backgroundColor: '#3b82f6' },
  btnOutline: { padding: '8px 18px', fontSize: 14, fontWeight: 600, color: '#2563eb', backgroundColor: 'transparent', border: '1.5px solid #2563eb', borderRadius: 8, cursor: 'pointer' },

  // Footer
  footer: { backgroundColor: '#e3effd', color: '#334155', padding: '48px 48px 20px' },
  footerInner: { ...inner, display: 'flex', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', paddingBottom: 28, borderBottom: '1px solid #c7dcf7' },
  footerBrand: { fontSize: 22, fontWeight: 800, color: '#1d4ed8', marginBottom: 8 },
  footerText: { fontSize: 14, margin: 0, maxWidth: 320, lineHeight: 1.6 },
  footerCol: { display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 },
  copy: { ...inner, textAlign: 'center', fontSize: 13, color: '#64748b', paddingTop: 18 },
};