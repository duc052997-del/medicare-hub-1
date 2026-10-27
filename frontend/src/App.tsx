// App.tsx — Router thủ công, phiên đăng nhập, khung đặt lịch đè trang, hộp đăng xuất.
import { useState, useEffect } from 'react';
import Home from './pages/home';
import DoctorsPage from './pages/doctors';
import SchedulePage from './pages/schedule';
import MedicalRecordsPage from './pages/medicalrecords';
import ContactPage from './pages/contact';
import Login from './pages/login';
import Register from './pages/register';
import Logout from './pages/logout';
import BookingModal from './components/bookingmodal';
import MockBadge from './components/mockbadge';
import { authService } from './services/authservice';
import { AUTH_EXPIRED_EVENT, clearSession, getToken } from './services/session';
import type { AuthUser, NavHandlers } from './types';

const getStoredUser = (): AuthUser | null => {
  if (!getToken()) return null;
  try {
    const raw = localStorage.getItem('userInfo');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

// Mở tab/phiên mới thì bắt đăng nhập lại
const getInitialUser = (): AuthUser | null => {
  if (!sessionStorage.getItem('appStarted')) {
    sessionStorage.setItem('appStarted', '1');
    clearSession();
    return null;
  }
  return getStoredUser();
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);
  // Hộp xác nhận đăng xuất đè lên trang đang đứng, không chuyển sang /logout
  const [showLogout, setShowLogout] = useState(false);
  // Khung đặt lịch đè lên trang đang mở (UC006); doctorId có khi bấm "Đặt lịch" ở thẻ bác sĩ
  const [booking, setBooking] = useState<{ open: boolean; doctorId: string }>({ open: false, doctorId: '' });
  // Dùng để làm mới trang lịch khám khi đặt lịch thành công
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onPop = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Kiểm tra phiên khi mở app. 401 đã được service xóa token; lỗi mạng thì giữ phiên cũ.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    authService.getMe().then((me) => !cancelled && setUser(me)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Bất kỳ API nào trả 401 trong lúc đang đăng nhập -> về trạng thái chưa đăng nhập
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Chuyển trang thì cuộn về đầu trang
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  useEffect(() => {
    // Đã đăng nhập thì không vào login/register; /logout không còn là trang riêng
    if ((user && (currentPath === '/login' || currentPath === '/register')) || currentPath === '/logout') {
      navigateTo('/');
    }
  }, [user, currentPath]);

  // Đăng xuất / phiên hết hạn thì đóng khung đặt lịch
  useEffect(() => {
    if (!user) setBooking({ open: false, doctorId: '' });
  }, [user]);

  // Chưa đăng nhập -> sang trang đăng nhập; đã đăng nhập -> mở khung đặt lịch (chọn sẵn bác sĩ nếu có doctorId)
  const handleBooking = (doctorId?: string | number) => {
    if (!user) return navigateTo('/login');
    setBooking({ open: true, doctorId: doctorId ? String(doctorId) : '' });
  };
  const closeBooking = () => setBooking({ open: false, doctorId: '' });

  // Tạo 1 lần, truyền cho mọi trang có Header
  const nav: NavHandlers = {
    onHome: () => navigateTo('/'),
    onDoctors: () => navigateTo('/doctors'),
    onSchedule: () => navigateTo('/schedule'),
    onRecords: () => navigateTo('/records'),
    onContact: () => navigateTo('/contact'),
    onLogin: () => navigateTo('/login'),
    onRegister: () => navigateTo('/register'),
    onLogout: () => setShowLogout(true),
  };

  return (
    <div>
      {(currentPath === '/' || currentPath === '/home') && <Home user={user} nav={nav} onBooking={handleBooking} />}
      {currentPath === '/doctors' && <DoctorsPage user={user} nav={nav} onBooking={handleBooking} />}
      {currentPath === '/schedule' && <SchedulePage user={user} nav={nav} onBooking={handleBooking} refreshKey={refreshKey} />}
      {currentPath === '/records' && <MedicalRecordsPage user={user} nav={nav} />}
      {currentPath === '/contact' && <ContactPage user={user} nav={nav} />}

      {currentPath === '/login' && !user && (
        <Login
          onSwitchToRegister={nav.onRegister}
          onLoginSuccess={() => {
            setUser(getStoredUser());
            navigateTo('/');
          }}
        />
      )}
      {currentPath === '/register' && !user && <Register onSwitchToLogin={nav.onLogin} />}

      {booking.open && user && (
        <BookingModal
          user={user}
          presetDoctorId={booking.doctorId}
          onClose={closeBooking}
          onBooked={() => {
            // Đặt lịch thành công: Cập nhật refreshKey để tải lại lịch sử khi xem
            setRefreshKey((k) => k + 1);
          }}
          onViewSchedule={() => {
            // Logic khi bấm nút xem lịch khám -> chuyển trang lịch khám
            closeBooking();
            navigateTo('/schedule');
          }}
        />
      )}

      {/* Luôn nằm cuối, hiện đè lên bất kỳ trang nào đang mở */}
      <Logout
        isOpen={showLogout && !!user}
        onClose={() => setShowLogout(false)}
        onConfirm={() => {
          setShowLogout(false);
          setUser(null);
          navigateTo('/');
        }}
      />

      <MockBadge />
    </div>
  );
}