// styles/adminappointments.ts
// Style của màn hình Quản lý lịch hẹn (UC011, Admin). Cùng ngôn ngữ thiết kế với UC007 / trang Bác sĩ.
import type { CSSProperties } from 'react';
import { inner } from './layout';

const field: CSSProperties = { padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' };
const tag: CSSProperties = { fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6 };
const btn: CSSProperties = { fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' };

export const adminApptStyles: Record<string, CSSProperties> = {
  hintBox: { padding: '36px 20px', textAlign: 'center', fontSize: 14, color: '#64748b', backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16 },

  // Bộ lọc (nổi lên dải banner)
  filterSection: { ...inner, padding: '0 24px', marginTop: -28, position: 'relative', zIndex: 2 },
  filterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 10px 25px rgba(15,23,42,.08)', border: '1px solid #dbeafe' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  input: field,
  select: { ...field, backgroundColor: '#fff' },
  resetWrap: { marginTop: 16, textAlign: 'right' },
  resetBtn: { background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' },

  // Ô thống kê theo trạng thái (bấm để lọc)
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 },
  statTile: { display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 16px', textAlign: 'left', backgroundColor: '#fff', border: '1.5px solid #dbeafe', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' },
  statValue: { fontSize: 24, fontWeight: 800 },
  statLabel: { fontSize: 13, fontWeight: 600, color: '#475569' },

  // Danh sách
  listSection: { ...inner, padding: '40px 24px 36px' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  resultSummary: { fontSize: 15, color: '#64748b' },
  rows: { display: 'flex', flexDirection: 'column', gap: 16 },

  row: { display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 16, padding: 22, border: '1px solid #dbeafe', boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(15,23,42,.03)', textAlign: 'left' },
  avatar: { width: 56, height: 56, borderRadius: '50%', flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: 22, background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 6 },
  nameRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4 },
  patientName: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, overflowWrap: 'anywhere' },
  codeBadge: { ...tag, backgroundColor: '#eff6ff', color: '#2563eb' },
  phone: { fontSize: 13, color: '#64748b' },
  meta: { display: 'flex', flexWrap: 'wrap', gap: '4px 18px', fontSize: 14, color: '#334155', fontWeight: 600 },
  doctorLine: { fontSize: 13, color: '#475569' },
  line: { fontSize: 13, color: '#475569', lineHeight: 1.5, overflowWrap: 'anywhere' },
  times: { display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginTop: 4, paddingTop: 8, borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8' },

  aside: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, marginLeft: 'auto', flexShrink: 0 },
  statusBadge: { padding: '4.5px 13.5px', fontSize: 13.5, fontWeight: 700, borderRadius: 999, whiteSpace: 'nowrap' },

  btnPrimary: { ...btn, padding: '10px 26px', color: '#fff', border: 'none', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnLine: { ...btn, padding: '10px 22px', color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb' },
};

// ---------- Giai đoạn 2: nút xử lý ở hàng + hộp thoại + thông báo ----------
const actionBtn: CSSProperties = { fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer', padding: '7.5px 18px', minWidth: 104 };

export const adminActionStyles: Record<string, CSSProperties> = {
  actions: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  btnConfirm: { ...actionBtn, color: '#fff', border: 'none', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnReject: { ...actionBtn, color: '#dc2626', backgroundColor: '#fff', border: '1.5px solid #dc2626' },
  btnComplete: { ...actionBtn, color: '#fff', border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)' },
  btnRecord: { ...actionBtn, color: '#15803d', backgroundColor: '#fff', border: '1.5px solid #15803d' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  pastTag: { fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: '#b91c1c', backgroundColor: '#fee2e2' },

  notice: { padding: '12px 14px', marginBottom: 16, borderRadius: 8, fontSize: 14 },
  noticeOk: { color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' },
  noticeError: { color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' },

  // Hộp thoại
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.5)', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' },
  dialog: { width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', padding: 28, backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,.3)', boxSizing: 'border-box' },
  dialogTitle: { margin: '0 0 12px', fontSize: 20, fontWeight: 800, color: '#0f172a' },
  dialogText: { margin: '0 0 12px', fontSize: 14, color: '#334155', lineHeight: 1.6 },
  dialogHint: { margin: '12px 0 16px', fontSize: 12, color: '#64748b', lineHeight: 1.5 },
  summary: { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', fontSize: 14, color: '#334155', backgroundColor: '#f5faff', border: '1px solid #dbeafe', borderRadius: 8 },
  sumRow: { display: 'grid', gridTemplateColumns: '96px 1fr', gap: 8 },
  sumLabel: { color: '#64748b' },
  sumValue: { color: '#0f172a', overflowWrap: 'anywhere' },
  label: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  textarea: { width: '100%', marginTop: 6, padding: '10px 14px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' },
  counter: { marginTop: 4, fontSize: 12, color: '#64748b', textAlign: 'right' },
  dialogActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btnLine: { fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer', padding: '10px 22px', color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb' },
  btnPrimary: { fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer', padding: '10px 22px', color: '#fff', border: 'none', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnDanger: { fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer', padding: '10px 22px', color: '#fff', backgroundColor: '#dc2626', border: 'none' },
};

// ---------- Giai đoạn 3: form hoàn tất lịch khám (kết luận + đơn thuốc) ----------
export const adminCompleteStyles: Record<string, CSSProperties> = {
  dialog: { maxWidth: 760 },
  section: { marginTop: 18 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: '#1d4ed8' },
  group: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  required: { color: '#ef4444' },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #cbd5e1', borderRadius: 8, outline: 'none', backgroundColor: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' },
  inputError: { borderColor: '#ef4444' },
  error: { fontSize: 12, color: '#ef4444' },
  hint: { fontSize: 12, color: '#64748b' },

  rxList: { display: 'flex', flexDirection: 'column', gap: 12 },
  rxCard: { padding: '12px 14px 14px', backgroundColor: '#f5faff', border: '1px solid #dbeafe', borderRadius: 10 },
  rxHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13, fontWeight: 700, color: '#1e293b' },
  rxGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 },
  rxWide: { gridColumn: '1 / -1' },
  rxEmpty: { padding: '14px', fontSize: 13, color: '#94a3b8', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8 },
  btnSmall: { padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #bfdbfe', borderRadius: 8, cursor: 'pointer' },
  btnSmallDanger: { color: '#dc2626', borderColor: '#fecaca' },
  warn: { marginTop: 16, padding: '10px 12px', fontSize: 12, lineHeight: 1.5, color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 },
};