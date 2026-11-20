// pages/patients.tsx — Trang Bệnh nhân (UC012, chỉ Admin).
// Bố cục giống trang Bác sĩ / Lịch khám / Hồ sơ bệnh án: banner -> thẻ tìm kiếm nổi lên banner -> danh sách (nằm trong PatientList).
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import PatientList from '../components/patientlist';
import { layoutStyles } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

interface PatientsPageProps {
  user?: AuthUser | null;
  nav: NavHandlers;
}

export default function PatientsPage({ user, nav }: PatientsPageProps) {
  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active="patients" />
      <PageBanner title="Quản Lý Bệnh Nhân" sub="Tra cứu danh sách bệnh nhân và xem hồ sơ chi tiết (lịch hẹn, hồ sơ bệnh án)" />
      <PatientList user={user} onLogin={nav.onLogin} />
      <Footer />
    </div>
  );
}
