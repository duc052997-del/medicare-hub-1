import React from 'react';
import SafeImage from './safeimage';
import { useClinicInfo, displayInfo } from '../services/clinicservice'; // [SỬA] lấy thông tin phòng khám từ API

interface AuthUser {
  id: string | number;
  email: string;
  username: string | null;
  role: string;
}

interface HeaderProps {
  user?: AuthUser | null;
  logoImage?: string;
  displayName: string;
  roleLabel: string;
  scrollTo: (id: string) => void;
  onNavigateToDoctors?: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToContact?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToLogout?: () => void;
  styles: Record<string, React.CSSProperties>;
}

export default function Header({
  user,
  logoImage,
  displayName,
  roleLabel,
  scrollTo,
  onNavigateToDoctors,
  onNavigateToSchedule,
  onNavigateToContact,
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToLogout,
  styles,
}: HeaderProps) {
  // [SỬA] hotline lấy từ DB thay vì ghi cứng
  const { clinic, loading: clinicLoading } = useClinicInfo();

  return (
    <header className="mh-header" style={styles.header}>
      <div
        style={styles.logoBox}
        onClick={() => scrollTo('top')}
      >
        <SafeImage
          src={logoImage}
          alt="Logo"
          style={styles.logoImg}
        />

        <span style={styles.logoText}>
          MediCare-Hub
        </span>
      </div>

      <nav className="mh-nav" style={styles.nav}>
        <span
          className="mh-nav-link"
          style={{ ...styles.navLink, ...styles.navActive }}
          onClick={() => scrollTo('top')}
        >
          Trang chủ
        </span>

        <span
          className="mh-nav-link"
          style={styles.navLink}
          onClick={onNavigateToDoctors}
        >
          Bác sĩ
        </span>

        <span
          className="mh-nav-link"
          style={styles.navLink}
          onClick={onNavigateToSchedule}
        >
          Lịch khám
        </span>

        <span
          className="mh-nav-link"
          style={styles.navLink}
          onClick={onNavigateToContact}
        >
          Liên hệ
        </span>
      </nav>

      <div style={styles.headerRight}>
        <span
          className="mh-hotline"
          style={styles.hotline}
        >
          📞 {displayInfo(clinic?.hotline, clinicLoading)} {/* [SỬA] */}
        </span>

        {user ? (
          <>
            <div style={styles.userBox}>
              <div style={styles.userAvatar}>
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div style={styles.userInfo}>
                <span style={styles.userName}>
                  {displayName}
                </span>

                <span style={styles.roleBadge}>
                  {roleLabel}
                </span>
              </div>
            </div>

            <button
              className="mh-btn"
              onClick={onNavigateToLogout}
              style={styles.btnOutline}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <button
              className="mh-btn"
              onClick={onNavigateToLogin}
              style={styles.btnOutline}
            >
              Đăng nhập
            </button>

            <button
              className="mh-btn"
              onClick={onNavigateToRegister}
              style={styles.btnPrimarySm}
            >
              Đăng ký
            </button>
          </>
        )}
      </div>
    </header>
  );
}