// pages/medicalrecords.tsx — Trang Hồ sơ bệnh án (UC008).
// Bố cục giống trang Bác sĩ / Lịch khám: banner -> thẻ bộ lọc nổi lên banner -> danh sách (nằm trong RecordList).
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import RecordList from '../components/recordlist';
import { layoutStyles } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

interface MedicalRecordsPageProps {
  user?: AuthUser | null;
  nav: NavHandlers;
}

export default function MedicalRecordsPage({ user, nav }: MedicalRecordsPageProps) {
  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active="records" />
      <PageBanner title="Hồ Sơ Bệnh Án" sub="Xem chẩn đoán, lời dặn và đơn thuốc của các lần khám trước" />
      <RecordList user={user} onLogin={nav.onLogin} onSchedule={nav.onSchedule} />
      <Footer />
    </div>
  );
}