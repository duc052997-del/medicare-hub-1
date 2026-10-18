// pages/schedule.tsx — Trang Lịch khám: lịch sử đặt lịch của bệnh nhân (UC007) + bảng lịch chuyên khoa.
// Bố cục giống trang Bác sĩ: banner -> thẻ bộ lọc nổi lên banner -> danh sách (đều nằm trong AppointmentHistory).
import type { CSSProperties } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import ScheduleTable from '../components/scheduletable';
import AppointmentHistory from '../components/appointmenthistory';
import { inner, layoutStyles } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

interface SchedulePageProps {
  user?: AuthUser | null;
  nav: NavHandlers;
  onBooking: (doctorId?: string | number) => void;
  // Tăng sau mỗi lần đặt lịch thành công để lịch sử tải lại (App.tsx truyền xuống)
  refreshKey?: number;
}

export default function SchedulePage({ user, nav, onBooking, refreshKey = 0 }: SchedulePageProps) {
  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active="schedule" />
      <PageBanner title="Lịch Khám" sub="Tra cứu, lọc và hủy lịch đã đặt; xem lịch làm việc các chuyên khoa" />

      <AppointmentHistory user={user} onLogin={nav.onLogin} onBooking={() => onBooking()} refreshKey={refreshKey} />

      <section style={styles.content}>
        <h2 style={styles.h2}>Lịch làm việc các chuyên khoa</h2>
        <ScheduleTable />
      </section>

      <Footer />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  content: { ...inner, padding: '12px 24px 72px' },
  h2: { margin: '0 0 16px', fontSize: 22, fontWeight: 800, color: '#0f172a' },
};