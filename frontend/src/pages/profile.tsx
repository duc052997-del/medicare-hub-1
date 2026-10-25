// pages/profile.tsx — Trang Thông tin cá nhân (UC009), đường dẫn /profile. Cho cả bệnh nhân và admin.
// Bố cục giống các trang khác: Header -> banner -> biểu mẫu (nổi lên banner) -> Footer. Nội dung nằm trong ProfileForm.
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import ProfileForm from '../components/profileform';
import { layoutStyles } from '../styles/layout';
import { profileStyles } from '../styles/profile';
import type { AuthUser, NavHandlers } from '../types';

interface ProfilePageProps {
  user?: AuthUser | null;
  nav: NavHandlers;
  onSaved: (user: AuthUser) => void; // App cập nhật người dùng sau khi lưu
  onBack: () => void; // quay lại trang trước đó (App nhớ trang đứng trước /profile)
}

export default function ProfilePage({ user, nav, onSaved, onBack }: ProfilePageProps) {
  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active={null} />
      <PageBanner title="Thông Tin Cá Nhân" sub="Xem và cập nhật thông tin tài khoản của bạn" />
      <main style={profileStyles.main}>
        {user && <ProfileForm user={user} onSaved={onSaved} onBack={onBack} />}
      </main>
      <Footer />
    </div>
  );
}