import SafeImage from './safeimage';
import { useClinicInfo, displayInfo } from '../services/clinicservice';
import { getAsset, getRoleLabel } from '../utils/helpers';
import { layoutStyles as s } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

interface HeaderProps {
  user?: AuthUser | null;
  nav: NavHandlers;
  // Mục menu được tô sáng: 'home' | 'doctors' | 'schedule' | 'records' | 'contact' | null (không tô)
  active?: string | null;
}

export default function Header({ user, nav, active = 'home' }: HeaderProps) {
  const { clinic, loading } = useClinicInfo(); // hotline lấy từ DB
  const displayName = user ? user.username || user.email : '';

  const links = [
    { key: 'home', text: 'Trang chủ', onClick: nav.onHome },
    { key: 'doctors', text: 'Bác sĩ', onClick: nav.onDoctors },
    { key: 'schedule', text: 'Lịch khám', onClick: nav.onSchedule },
    // UC008: chỉ bệnh nhân có hồ sơ bệnh án
    ...(user?.role !== 'ADMIN' ? [{ key: 'records', text: 'Hồ sơ bệnh án', onClick: nav.onRecords }] : []), // khách chưa đăng nhập vẫn thấy, trang sẽ mời đăng nhập
    { key: 'contact', text: 'Liên hệ', onClick: nav.onContact },
  ];

  return (
    <header className="mh-header" style={s.header}>
      <div style={s.logoBox} onClick={nav.onHome}>
        <SafeImage src={getAsset('2')} alt="Logo" style={s.logoImg} />
        <span style={s.logoText}>MediCare-Hub</span>
      </div>

      <nav className="mh-nav" style={s.nav}>
        {links.map((l) => (
          <span
            key={l.key}
            className="mh-nav-link"
            style={{ ...s.navLink, ...(l.key === active ? s.navActive : {}) }}
            onClick={l.onClick}
          >
            {l.text}
          </span>
        ))}
      </nav>

      <div style={s.headerRight}>
        <span className="mh-hotline" style={s.hotline}>
          📞 {displayInfo(clinic?.hotline, loading)}
        </span>

        {user ? (
          <>
            <div style={s.userBox}>
              <div style={s.userAvatar}>{displayName.charAt(0).toUpperCase()}</div>
              <div style={s.userInfo}>
                <span style={s.userName}>{displayName}</span>
                <span style={s.roleBadge}>{getRoleLabel(user.role)}</span>
              </div>
            </div>
            <button className="mh-btn" onClick={nav.onLogout} style={s.btnOutline}>Đăng xuất</button>
          </>
        ) : (
          <>
            <button className="mh-btn" onClick={nav.onLogin} style={s.btnOutline}>Đăng nhập</button>
            <button className="mh-btn" onClick={nav.onRegister} style={s.btnPrimarySm}>Đăng ký</button>
          </>
        )}
      </div>
    </header>
  );
}