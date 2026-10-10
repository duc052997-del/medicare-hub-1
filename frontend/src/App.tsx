import React, { useState, useEffect } from 'react';
import Home from './pages/home';
import DoctorsPage from './pages/doctors'; // Import trang Bác sĩ mới
import type { AuthUser } from './pages/home';
import Login from './pages/login';
import Register from './pages/register';
import Logout from './pages/logout';
import api from './services/api';

const getStoredUser = (): AuthUser | null => {
  if (!localStorage.getItem('token')) return null;
  try {
    const raw = localStorage.getItem('userInfo');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

const getInitialUser = (): AuthUser | null => {
  if (!sessionStorage.getItem('appStarted')) {
    sessionStorage.setItem('appStarted', '1');
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    return null;
  }
  return getStoredUser();
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);
  // [SỬA] Khung xác nhận đăng xuất là hộp thoại bật/tắt đè lên trang đang đứng, không chuyển sang /logout nữa
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    let cancelled = false;

    api.get('/auth/me')
      .then((res) => {
        if (cancelled || !res.data?.user) return;
        localStorage.setItem('userInfo', JSON.stringify(res.data.user));
        setUser(res.data.user);
      })
      .catch((err) => {
        if (!cancelled && err?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          setUser(null);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    if (user && (currentPath === '/login' || currentPath === '/register'))
      navigateTo('/');
    // [SỬA] /logout không còn là trang riêng: ai vào thẳng đường dẫn này thì đưa về trang chủ
    if (currentPath === '/logout')
      navigateTo('/');
  }, [user, currentPath]);

  const handleLoginSuccess = () => {
    setUser(getStoredUser());
    navigateTo('/');
  };

  const handleBooking = () => {
    if (!user) {
      navigateTo('/login');
      return;
    }
    alert('Chức năng đặt lịch khám đang được phát triển.');
  };

  const openLogout = () => setShowLogout(true); // [SỬA] bấm "Đăng xuất" -> hiện khung đè lên trang hiện tại

  const handleDeveloping = (name: string) => {
    alert(`Chức năng ${name} đang được phát triển.`);
  };

  return (
    <div>
      {(currentPath === '/' || currentPath === '/home') && (
        <Home
          user={user}
          onNavigateToBooking={handleBooking}
          onNavigateToLogin={() => navigateTo('/login')}
          onNavigateToRegister={() => navigateTo('/register')}
          onNavigateToLogout={openLogout}
          onNavigateToDoctors={() => navigateTo('/doctors')}
          onNavigateToSchedule={() => handleDeveloping('lịch khám')}
          onNavigateToContact={() => handleDeveloping('liên hệ')}
        />
      )}

      {currentPath === '/doctors' && (
        <DoctorsPage
          user={user}
          onNavigateHome={() => navigateTo('/')}
          onNavigateToDoctors={() => navigateTo('/doctors')}
          onNavigateToSchedule={() => handleDeveloping('lịch khám')}
          onNavigateToContact={() => handleDeveloping('liên hệ')}
          onNavigateToLogin={() => navigateTo('/login')}
          onNavigateToRegister={() => navigateTo('/register')}
          onNavigateToLogout={openLogout}
          onNavigateToBooking={handleBooking}
        />
      )}

      {currentPath === '/login' && !user && (
        <Login
          onSwitchToRegister={() => navigateTo('/register')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentPath === '/register' && !user && (
        <Register onSwitchToLogin={() => navigateTo('/login')} />
      )}

      {/* [SỬA] Luôn nằm cuối, hiện đè lên bất kỳ trang nào đang mở (Logout tự trả về null khi isOpen = false) */}
      <Logout
        isOpen={showLogout && !!user}
        onClose={() => setShowLogout(false)}
        onConfirm={() => {
          setShowLogout(false);
          setUser(null);
          navigateTo('/');
        }}
      />
    </div>
  );
}