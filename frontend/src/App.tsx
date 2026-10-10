import { useState, useEffect } from 'react';
import Home from './pages/home';
import DoctorsPage from './pages/doctors';
import SchedulePage from './pages/schedule';
import ContactPage from './pages/contact';
import Login from './pages/login';
import Register from './pages/register';
import Logout from './pages/logout';
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

  // doctorId có thể có (bấm "Đặt lịch" ở thẻ bác sĩ) hoặc không. UC006 sẽ dùng để chọn sẵn bác sĩ.
  const handleBooking = (doctorId?: string | number) => {
    if (!user) return navigateTo('/login');
    alert(`Chức năng đặt lịch khám đang được phát triển.${doctorId ? `\n(Bác sĩ đã chọn: ${doctorId})` : ''}`);
  };

  // Tạo 1 lần, truyền cho mọi trang có Header
  const nav: NavHandlers = {
    onHome: () => navigateTo('/'),
    onDoctors: () => navigateTo('/doctors'),
    onSchedule: () => navigateTo('/schedule'),
    onContact: () => navigateTo('/contact'),
    onLogin: () => navigateTo('/login'),
    onRegister: () => navigateTo('/register'),
    onLogout: () => setShowLogout(true),
  };

  return (
    <div>
      {(currentPath === '/' || currentPath === '/home') && <Home user={user} nav={nav} onBooking={handleBooking} />}
      {currentPath === '/doctors' && <DoctorsPage user={user} nav={nav} onBooking={handleBooking} />}
      {currentPath === '/schedule' && <SchedulePage user={user} nav={nav} onBooking={handleBooking} />}
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
