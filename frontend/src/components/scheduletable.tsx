import type { CSSProperties } from 'react';
import { DEPT_SCHEDULE } from '../config/constants';
import { inner } from '../styles/layout';

// Bảng lịch khám theo chuyên khoa, dùng ở Trang chủ và trang Lịch khám
export default function ScheduleTable() {
  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.row, ...styles.head }}>
        <span>Chuyên khoa</span><span>Ngày khám</span><span>Giờ khám</span>
      </div>
      {DEPT_SCHEDULE.map((r) => (
        <div key={r.dept} className="mh-row" style={styles.row}>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.dept}</span>
          <span>{r.days}</span>
          <span style={styles.pill}>{r.time}</span>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { ...inner, backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 16, overflow: 'hidden', textAlign: 'left', boxShadow: '0 2px 8px rgba(15,23,42,.04)' },
  row: { display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 12, alignItems: 'center', padding: '16px 24px', fontSize: 15, borderBottom: '1px solid #f1f5f9' },
  head: { backgroundColor: '#e0efff', fontWeight: 700, color: '#1d4ed8', fontSize: 14 },
  pill: { justifySelf: 'start', padding: '4px 12px', fontSize: 13, fontWeight: 600, color: '#15803d', backgroundColor: '#f0fdf4', borderRadius: 999 },
};