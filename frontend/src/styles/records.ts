// styles/records.ts
// Style của trang Hồ sơ bệnh án (UC008). Cùng ngôn ngữ thiết kế với lịch sử đặt lịch (UC007) và trang Bác sĩ.

import type { CSSProperties } from 'react';
import { inner } from './layout';

const field: CSSProperties = { padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' };
const tag: CSSProperties = { fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6 };
const btn: CSSProperties = { fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' };
const circle: CSSProperties = { width: 72, height: 72, borderRadius: '50%', flexShrink: 0 };

export const recordStyles: Record<string, CSSProperties> = {
  hintBox: { padding: '36px 20px', textAlign: 'center', fontSize: 14, color: '#64748b', backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16 },
  link: { color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' },

  // Bộ lọc (nổi lên dải banner)
  filterSection: { ...inner, padding: '0 24px', marginTop: -28, position: 'relative', zIndex: 2 },
  filterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 10px 25px rgba(15,23,42,.08)', border: '1px solid #dbeafe' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  input: field,
  select: { ...field, backgroundColor: '#fff' },
  resetWrap: { marginTop: 16, textAlign: 'right' },
  resetBtn: { background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' },

  // Danh sách
  listSection: { ...inner, padding: '40px 24px 72px' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 },
  resultSummary: { fontSize: 15, color: '#64748b' },
  rows: { display: 'flex', flexDirection: 'column', gap: 16 },

  row: { display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 16, padding: 22, border: '1px solid #dbeafe', boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(15,23,42,.03)', textAlign: 'left' },
  avatar: { ...circle, backgroundColor: '#e0efff', border: '3px solid #dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 32 },
  avatarImg: { ...circle, objectFit: 'cover', border: '3px solid #dbeafe' },
  info: { flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  badge: { ...tag, backgroundColor: '#eff6ff', color: '#2563eb' },
  featuredBadge: { ...tag, backgroundColor: '#fef3c7', color: '#b45309' },
  nameRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 4 },
  docName: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, overflowWrap: 'anywhere' },
  meta: { display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14, color: '#334155', fontWeight: 600 },
  bio: { fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  line: { fontSize: 13, color: '#475569', lineHeight: 1.5, overflowWrap: 'anywhere' },
  aside: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 20, marginLeft: 'auto', flexShrink: 0 },

  btnPrimary: { ...btn, padding: '10px 26px', color: '#fff', border: 'none', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnLine: { ...btn, padding: '10px 22px', color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb' },
  btnView: { ...btn, padding: '7.5px 18px', fontSize: 15, color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb' },

  // Hộp thoại chi tiết
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.5)', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' },
  dialog: { width: '100%', maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,.3)', overflow: 'hidden' },
  dialogHead: { display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px', borderBottom: '1px solid #e2e8f0' },
  dialogTitle: { margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a', overflowWrap: 'anywhere' },
  close: { marginLeft: 'auto', width: 32, height: 32, fontSize: 22, lineHeight: 1, color: '#64748b', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', flexShrink: 0 },
  dialogBody: { padding: '18px 24px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 },
  sumGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  sumItem: { display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 14px', backgroundColor: '#f5faff', border: '1px solid #dbeafe', borderRadius: 8 },
  sumLabel: { fontSize: 12, color: '#64748b' },
  sumValue: { fontSize: 14, fontWeight: 600, color: '#0f172a', overflowWrap: 'anywhere' },
  sectionTitle: { margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: '#1d4ed8' },
  textBox: { padding: '12px 14px', fontSize: 14, lineHeight: 1.6, color: '#334155', backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  tableWrap: { border: '1px solid #dbeafe', borderRadius: 8, overflow: 'hidden' },
  tRow: { display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 1.3fr 0.6fr 1.5fr', gap: 10, alignItems: 'start', padding: '10px 14px', fontSize: 13, color: '#334155', borderBottom: '1px solid #f1f5f9', overflowWrap: 'anywhere' },
  tHead: { backgroundColor: '#e0efff', fontWeight: 700, color: '#1d4ed8' },
  tName: { fontWeight: 700, color: '#0f172a' },
  emptyRx: { padding: '14px', fontSize: 13, color: '#94a3b8', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8 },
  errBox: { padding: '14px', fontSize: 14, textAlign: 'center', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 },
  dialogActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 2 },
};