// pages/schedule.tsx — Trang Lịch khám.
//  - Bệnh nhân: lịch sử đặt lịch của mình (UC007) + bảng lịch chuyên khoa.
//  - Admin (UC011): quản lý toàn bộ lịch hẹn (AdminAppointments) + bảng lịch chuyên khoa.
import type { CSSProperties } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import ScheduleTable from '../components/scheduletable';
import AppointmentHistory from '../components/appointmenthistory';
import AdminAppointments from '../components/adminappointments'; // UC011 Admin (THÊM)
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
  const isAdmin = user?.role === 'ADMIN'; // UC011 (THÊM)

  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active="schedule" />
      <PageBanner
        title="Lịch Khám"
        sub={
          isAdmin
            ? 'Theo dõi, xác nhận và xử lý lịch hẹn của tất cả bệnh nhân'
            : 'Tra cứu, lọc và hủy lịch đã đặt; xem lịch làm việc các chuyên khoa'
        }
      />

      {isAdmin ? (
        <AdminAppointments user={user} />
      ) : (
        <AppointmentHistory user={user} onLogin={nav.onLogin} onBooking={() => onBooking()} refreshKey={refreshKey} />
      )}

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