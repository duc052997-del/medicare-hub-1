// pages/schedule.tsx — Trang Lịch khám: lịch đã đặt của bệnh nhân + nút "Đặt lịch ngay" + bảng lịch chuyên khoa.
import type { CSSProperties } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import ScheduleTable from '../components/scheduletable';
import { inner, layoutStyles } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

interface SchedulePageProps {
  user?: AuthUser | null;
  nav: NavHandlers;
  onBooking: (doctorId?: string | number) => void;
  
}

export default function SchedulePage({ user, nav, onBooking }: SchedulePageProps) {

  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active="schedule" />
      <PageBanner title="Lịch Khám" sub="Lịch làm việc các chuyên khoa của phòng khám" />

      <section style={styles.content}>
        <div style={styles.titleRow}>
          <h2 style={styles.h2}>Lịch làm việc các chuyên khoa</h2>   
          <button className="mh-btn" onClick={() => onBooking()} style={styles.btn}>Đặt lịch ngay</button>
        </div>

        <ScheduleTable />
      </section>

      <Footer />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  content: { ...inner, padding: '36px 24px 72px', maxWidth: 960 },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  h2: { margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' },
  btn: { padding: '10px 26px', fontSize: 14, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  hintBox: { padding: '28px 20px', textAlign: 'center', fontSize: 14, color: '#64748b', backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: 14 },
  link: { color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' },
};