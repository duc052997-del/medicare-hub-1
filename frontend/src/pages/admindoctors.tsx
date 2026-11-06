// pages/admindoctors.tsx — UC010: trang Bác sĩ dành cho Admin (không đặt lịch).
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import AdminDoctorList from '../components/admindoctorlist';
import { layoutStyles } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

interface Props {
  user?: AuthUser | null;
  nav: NavHandlers;
}

export default function AdminDoctorsPage({ user, nav }: Props) {
  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active="doctors" />
      <PageBanner
        title="Đội Ngũ Bác Sĩ"
        sub="Quản lý bác sĩ: thêm, sửa, ngừng hoạt động hoặc xóa (Admin)"
      />
      <AdminDoctorList isAdmin={user?.role === 'ADMIN'} />
      <Footer />
    </div>
  );
}
