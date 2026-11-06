// styles/appointmentdetail.ts
// Style của hộp thoại Chi tiết lịch hẹn (bệnh nhân): xem, đổi lịch, hủy (UC011, API-20..22).
import type { CSSProperties } from 'react';

const btn: CSSProperties = { fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' };
const input: CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', backgroundColor: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' };

export const detailStyles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.5)', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,.3)', overflow: 'hidden' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px', borderBottom: '1px solid #e2e8f0' },
  title: { margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' },
  close: { marginLeft: 'auto', width: 32, height: 32, fontSize: 22, lineHeight: 1, color: '#64748b', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', flexShrink: 0 },
  body: { padding: '18px 24px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  statusBadge: { padding: '3px 12px', fontSize: 13, fontWeight: 700, borderRadius: 999, whiteSpace: 'nowrap' },

  note: { padding: '24px 12px', textAlign: 'center', fontSize: 14, color: '#64748b' },
  summary: { display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', fontSize: 14, color: '#334155', backgroundColor: '#f5faff', border: '1px solid #dbeafe', borderRadius: 10 },
  sumRow: { display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 },
  sumLabel: { color: '#64748b' },
  sumValue: { color: '#0f172a', overflowWrap: 'anywhere' },

  notice: { padding: '12px 14px', borderRadius: 8, fontSize: 14 },
  noticeOk: { color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' },
  noticeError: { color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' },
  hint: { padding: '10px 12px', fontSize: 13, lineHeight: 1.5, color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 },

  section: { display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: '#1d4ed8' },
  group: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  input,
  inputError: { borderColor: '#ef4444' },
  error: { fontSize: 12, color: '#ef4444' },
  fieldHint: { fontSize: 12, color: '#64748b' },
  counter: { fontSize: 12, color: '#64748b', textAlign: 'right' },

  slotNote: { padding: '10px 12px', fontSize: 13, color: '#94a3b8', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8 },
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 },
  slot: { padding: '8px 0', fontSize: 13, fontWeight: 600, color: '#1e293b', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
  slotOn: { color: '#fff', backgroundColor: '#2563eb', borderColor: '#2563eb' },
  slotOff: { color: '#94a3b8', backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', cursor: 'not-allowed', textDecoration: 'line-through' },
  slotCurrent: { color: '#1d4ed8', backgroundColor: '#eff6ff', borderColor: '#93c5fd', cursor: 'not-allowed' },

  actions: { display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  btnPrimary: { ...btn, padding: '10px 22px', color: '#fff', border: 'none', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnLine: { ...btn, padding: '10px 22px', color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb' },
  btnDanger: { ...btn, padding: '10px 22px', color: '#fff', backgroundColor: '#dc2626', border: 'none' },
  btnDangerLine: { ...btn, padding: '10px 22px', color: '#dc2626', backgroundColor: '#fff', border: '1.5px solid #dc2626' },
};