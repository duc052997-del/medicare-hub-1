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
      <PageBanner title="Lịch Khám" sub="Lịch làm việc các chuyên khoa trong tuần (Chủ nhật: nghỉ, chỉ tiếp nhận cấp cứu)" />

      <section style={styles.content}>
        <ScheduleTable />
        <div style={styles.cta}>
          <button className="mh-btn" onClick={() => onBooking()} style={styles.btn}>Đặt lịch khám ngay</button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  content: { ...inner, padding: '40px 24px 72px' },
  cta: { marginTop: 28, textAlign: 'center' },
  btn: { padding: '13px 32px', fontSize: 15, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
};