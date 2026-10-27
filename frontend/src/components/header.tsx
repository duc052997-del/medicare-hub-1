import SafeImage from './safeimage';
import AccountMenu from './accountmenu';
import { useClinicInfo, displayInfo } from '../services/clinicservice';
import { getAsset, getRoleLabel } from '../utils/helpers';
import { layoutStyles as s } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

export type HeaderTab = 'home' | 'doctors' | 'schedule' | 'records' | 'contact';

interface HeaderProps {
  user?: AuthUser | null;
  nav: NavHandlers & { onProfile?: () => void };
  // Mục menu được tô sáng
  active?: HeaderTab | string | null;
}

export default function Header({ user, nav, active = 'home' }: HeaderProps) {
  const { clinic, loading } = useClinicInfo(); // hotline lấy từ DB
  const isPatient = user?.role === 'PATIENT';

  const tabs: { key: HeaderTab; text: string; onClick: () => void; show: boolean }[] = [
    { key: 'home', text: 'Trang chủ', onClick: nav.onHome, show: true },
    { key: 'doctors', text: 'Bác sĩ', onClick: nav.onDoctors, show: true },
    { key: 'schedule', text: 'Lịch khám', onClick: nav.onSchedule, show: true },
    // UC008: chỉ bệnh nhân có hồ sơ bệnh án (hoặc không phải ADMIN tùy logic dự án)
    { key: 'records', text: 'Hồ sơ bệnh án', onClick: nav.onRecords, show: user?.role !== 'ADMIN' },
    { key: 'contact', text: 'Liên hệ', onClick: nav.onContact, show: true },
  ];

  return (
    <header className="mh-header" style={s.header}>
      <div style={s.logoBox} onClick={nav.onHome}>
        <SafeImage 
          src={getAsset('2')} 
          alt="MediCare-Hub" 
          style={s.logoImg} 
          fallback={<span style={{ fontSize: 26 }}>🏥</span>} 
        />
        <span style={s.logoText}>MediCare-Hub</span>
      </div>

      <nav className="mh-nav" style={s.nav}>
        {tabs.filter((t) => t.show).map((t) => (
          <span
            key={t.key}
            className="mh-nav-link"
            style={{ ...s.navLink, ...(t.key === active ? s.navActive : {}) }}
            onClick={t.onClick}
          >
            {t.text}
          </span>
        ))}
      </nav>

      <div style={s.headerRight}>
        <span className="mh-hotline" style={s.hotline}>
          📞 {displayInfo(clinic?.hotline, loading)}
        </span>

        {user ? (
          <AccountMenu user={user} nav={nav} />
        ) : (
          <>
            <button type="button" className="mh-btn" onClick={nav.onLogin} style={s.btnOutline}>Đăng nhập</button>
            <button type="button" className="mh-btn" onClick={nav.onRegister} style={s.btnPrimarySm}>Đăng ký</button>
          </>
        )}
      </div>
    </header>
  );
}