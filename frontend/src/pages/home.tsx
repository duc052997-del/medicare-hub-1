import React, { useEffect, useRef, useState } from 'react';
import SafeImage from '../components/safeimage';
import Header from '../components/header';
import Footer from '../components/footer';
import api from '../services/api';
import { useClinicInfo, displayInfo } from '../services/clinicservice'; // [SỬA] lấy thông tin phòng khám từ API

export interface AuthUser {
  id: string | number;
  email: string;
  username: string | null;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  PATIENT: 'người dùng', DOCTOR: 'Bác sĩ', ADMIN: 'Quản trị viên', STAFF: 'Nhân viên',
};

const getRoleLabel = (role?: string) => role ? ROLE_LABELS[role.toUpperCase()] ?? role : '';

const assetImages = import.meta.glob('../assets/*.{png,jpg,jpeg,webp}', {
  eager: true, import: 'default',
}) as Record<string, string>;

const getAsset = (name: string): string | undefined => {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const found = assetImages[`../assets/${name}.${ext}`];
    if (found) return found;
  }
  return undefined;
};

function HeroBanner({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <div style={styles.heroImgWrap}>
      <img src={src} alt="Phòng khám MediCare-Hub" style={styles.heroImg} onError={() => setFailed(true)} />
    </div>
  );
}

// Khớp với các cột backend select trong doctor.controller.js
interface FeaturedDoctor {
  id: string | number;
  full_name: string;
  specialty: string;
  avatar_url: string | null;
  bio: string | null;
}

const STATS = [
  { value: '6+', label: 'Bác sĩ chuyên khoa' },
  { value: '10.000+', label: 'Lượt khám mỗi năm' },
  { value: '8', label: 'Chuyên khoa' },
  { value: '24/7', label: 'Đặt lịch trực tuyến' },
];

const STEPS = [
  { icon: '🔐', title: 'Đăng nhập', desc: 'Tạo tài khoản hoặc đăng nhập vào hệ thống.' },
  { icon: '🩺', title: 'Chọn bác sĩ', desc: 'Xem thông tin và chọn bác sĩ phù hợp.' },
  { icon: '🕒', title: 'Chọn khung giờ', desc: 'Chọn ngày và giờ khám còn trống.' },
  { icon: '✅', title: 'Xác nhận lịch', desc: 'Nhận xác nhận và đến khám đúng giờ.' },
];

const SCHEDULE = [
  { dept: 'Nội tổng quát', days: 'Thứ 2 - Thứ 6', time: '07:30 - 17:00' },
  { dept: 'Nhi khoa', days: 'Thứ 2 - Thứ 7', time: '07:30 - 16:30' },
  { dept: 'Da liễu', days: 'Thứ 3, Thứ 5, Thứ 7', time: '08:00 - 16:00' },
  { dept: 'Tim mạch', days: 'Thứ 2, Thứ 4, Thứ 6', time: '08:00 - 17:00' },
  { dept: 'Tai Mũi Họng', days: 'Thứ 2 - Thứ 6', time: '08:00 - 16:30' },
  { dept: 'Sản phụ khoa', days: 'Thứ 3, Thứ 5, Thứ 7', time: '07:30 - 15:30' },
];

const CSS = `
html { scroll-behavior: smooth; }
.mh-nav-link:hover { color:#2563eb !important; }
.mh-btn { transition:transform .15s,box-shadow .2s,background-color .2s; }
.mh-btn:hover { transform:translateY(-1px);box-shadow:0 6px 16px rgba(37,99,235,.25); }
.mh-card { transition:transform .2s,box-shadow .2s; }
.mh-card:hover { transform:translateY(-4px);box-shadow:0 12px 28px rgba(15,23,42,.10); }
.mh-track { scrollbar-width:none; }
.mh-track::-webkit-scrollbar { display:none; }
.mh-doctor { flex:0 0 calc((100% - 40px) / 3); }
.mh-arrow:hover { background:#2563eb !important;color:#fff !important; }
.mh-row:hover { background:#eaf3ff; }
@media(max-width:900px) {
  .mh-doctor { flex:0 0 calc((100% - 20px) / 2); }
  .mh-hero { flex-direction:column !important;padding:40px 20px !important; }
  .mh-grid4 { grid-template-columns:repeat(2,1fr) !important; }
  .mh-grid3 { grid-template-columns:1fr !important; }
  .mh-nav { display:none !important; }
  .mh-header { padding:14px 20px !important; }
  .mh-section { padding:40px 20px !important; }
}
@media(max-width:600px) {
  .mh-doctor { flex:0 0 100%; }
  .mh-grid4 { grid-template-columns:1fr !important; }
  .mh-hotline { display:none !important; }
}`;

interface HomeProps {
  user?: AuthUser | null;
  onNavigateToBooking?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToLogout?: () => void;
  onNavigateToDoctors?: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToContact?: () => void;
}

export default function Home({
  user,
  onNavigateToBooking,
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToLogout,
  onNavigateToDoctors,
  onNavigateToSchedule,
  onNavigateToContact,
}: HomeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  // [SỬA] thông tin giới thiệu phòng khám từ API /api/home
  const { clinic, loading: clinicLoading } = useClinicInfo();
  const [doctors, setDoctors] = useState<FeaturedDoctor[]>([]);
const [doctorsLoading, setDoctorsLoading] = useState(true);
const [doctorsError, setDoctorsError] = useState('');

useEffect(() => {
  let cancelled = false;

  api.get('/doctors/featured')
    .then((res) => {
      if (!cancelled) setDoctors(res.data?.doctors ?? []);
    })
    .catch(() => {
      if (!cancelled) setDoctorsError('Không thể tải danh sách bác sĩ, vui lòng thử lại sau.');
    })
    .finally(() => {
      if (!cancelled) setDoctorsLoading(false);
    });

  return () => { cancelled = true; };
}, []);
  const bannerImage = getAsset('1');
  const logoImage = getAsset('2');
  const displayName = user ? user.username || user.email : '';
  const roleLabel = user ? getRoleLabel(user.role) : '';

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth', block: 'start',
  });

  const slideDoctors = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * (el.clientWidth + 20), behavior: 'smooth' });
  };

  return (
    <div style={styles.container}>
      <style>{CSS}</style>

      <Header
      user={user}
      logoImage={logoImage}
      displayName={displayName}
      roleLabel={roleLabel}
      scrollTo={scrollTo}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToRegister={onNavigateToRegister}
      onNavigateToLogout={onNavigateToLogout}
      onNavigateToDoctors={onNavigateToDoctors}
      onNavigateToSchedule={onNavigateToSchedule}
      onNavigateToContact={onNavigateToContact}
      styles={styles}
    />

      <section id="top" className="mh-hero" style={styles.hero}>
        <div style={styles.heroText}>
          {user && <div style={styles.welcome}>👋 Xin chào, <b>{displayName}</b> · {roleLabel}</div>}

          <h1 style={styles.heroTitle}>
            Đặt lịch khám nhanh chóng,<br />
            <span style={{ color: '#2563eb' }}>chăm sóc sức khỏe tận tâm</span>
          </h1>

          <p style={styles.heroSub}>
            {/* [SỬA] mô tả lấy từ DB; không có thì báo đang cập nhật */}
            {clinic?.description?.trim() ||
              (clinicLoading ? '' : 'Thông tin giới thiệu phòng khám đang được cập nhật.')}
          </p>

          <div style={styles.heroBtns}>
            <button className="mh-btn" onClick={onNavigateToBooking} style={styles.btnPrimary}>Đặt lịch khám ngay</button>
            <button className="mh-btn" onClick={() => scrollTo('schedule')} style={styles.btnGhost}>Xem lịch khám</button>
          </div>
        </div>

        <HeroBanner src={bannerImage} />
      </section>

      <section style={styles.statsWrap}>
        <div className="mh-grid4" style={styles.statsGrid}>
          {STATS.map(s => (
            <div key={s.label} style={styles.statItem}>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mh-section" style={styles.section}>
        <h2 style={styles.title}>Vì sao chọn chúng tôi</h2>
        <p style={styles.titleSub}>Dịch vụ y tế tiện lợi, minh bạch và đáng tin cậy</p>

        <div className="mh-grid3" style={styles.grid3}>
          {[
            { icon: '👨‍⚕️', t: 'Đội ngũ bác sĩ giàu kinh nghiệm', d: 'Bác sĩ có chuyên môn cao, tận tâm và nhiều năm công tác tại các bệnh viện lớn.' },
            { icon: '📅', t: 'Đặt lịch trực tuyến 24/7', d: 'Chủ động chọn lịch hẹn nhanh chóng, không cần chờ đợi tại phòng khám.' },
            { icon: '⚡', t: 'Trang thiết bị hiện đại', d: 'Máy móc y tế tối tân, hỗ trợ chẩn đoán chính xác và điều trị hiệu quả.' },
          ].map(c => (
            <div key={c.t} className="mh-card" style={styles.card}>
              <div style={styles.iconCircle}>{c.icon}</div>
              <h3 style={styles.cardTitle}>{c.t}</h3>
              <p style={styles.cardDesc}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mh-section" style={{ ...styles.section, backgroundColor: '#eaf3ff' }}>
        <h2 style={styles.title}>Đặt lịch chỉ với 4 bước</h2>
        <p style={styles.titleSub}>Đơn giản, nhanh gọn, không cần xếp hàng</p>

        <div className="mh-grid4" style={styles.grid4}>
          {STEPS.map((s, i) => (
            <div key={s.title} className="mh-card" style={{ ...styles.card, textAlign: 'center' }}>
              <div style={styles.stepNo}>{i + 1}</div>
              <div style={{ fontSize: 30, margin: '8px 0' }}>{s.icon}</div>
              <h3 style={styles.cardTitle}>{s.title}</h3>
              <p style={styles.cardDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="doctors" className="mh-section" style={styles.section}>
        <h2 style={styles.title}>Bác sĩ tiêu biểu</h2>
        <p style={styles.titleSub}>Kéo sang hoặc bấm mũi tên để xem thêm bác sĩ</p>

        {doctorsLoading && <p style={styles.doctorNote}>Đang tải danh sách bác sĩ...</p>}

{!doctorsLoading && doctorsError && (
  <p style={{ ...styles.doctorNote, color: '#dc2626' }}>{doctorsError}</p>
)}

{!doctorsLoading && !doctorsError && doctors.length === 0 && (
  <p style={styles.doctorNote}>Chưa có danh sách bác sĩ</p>
)}

{!doctorsLoading && !doctorsError && doctors.length > 0 && (
  <div style={styles.carousel}>
    <button className="mh-arrow" aria-label="Trước" onClick={() => slideDoctors(-1)} style={{ ...styles.arrow, left: -18 }}>‹</button>

    <div ref={trackRef} className="mh-track" style={styles.track}>
      {doctors.map((d) => (
        <div key={d.id} className="mh-doctor mh-card" style={styles.doctorCard}>
          <SafeImage
            src={d.avatar_url ?? undefined}
            alt={d.full_name}
            style={styles.doctorImg}
            fallback={<div style={styles.doctorAvatar}>👨‍⚕️</div>}
          />
          <h4 style={styles.doctorName}>{d.full_name}</h4>
          <p style={styles.doctorSpec}>{d.specialty}</p>
          {d.bio && <p style={styles.doctorBio}>{d.bio}</p>}
          <button className="mh-btn" onClick={onNavigateToBooking} style={styles.btnSmallLine}>Đặt lịch với bác sĩ</button>
        </div>
      ))}
    </div>

    <button className="mh-arrow" aria-label="Sau" onClick={() => slideDoctors(1)} style={{ ...styles.arrow, right: -18 }}>›</button>
  </div>
)}
      </section>

      <section id="schedule" className="mh-section" style={{ ...styles.section, backgroundColor: '#eaf3ff' }}>
        <h2 style={styles.title}>Lịch khám</h2>
        <p style={styles.titleSub}>Lịch làm việc các chuyên khoa trong tuần (Chủ nhật: nghỉ, chỉ tiếp nhận cấp cứu)</p>

        <div style={styles.tableWrap}>
          <div style={{ ...styles.tRow, ...styles.tHead }}>
            <span>Chuyên khoa</span><span>Ngày khám</span><span>Giờ khám</span>
          </div>

          {SCHEDULE.map(r => (
            <div key={r.dept} className="mh-row" style={styles.tRow}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.dept}</span>
              <span>{r.days}</span>
              <span style={styles.timePill}>{r.time}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.ctaWrap}>
        <div style={styles.cta}>
          <h3 style={styles.ctaTitle}>Bạn cần đặt lịch khám?</h3>
          <p style={styles.ctaSub}>Chọn bác sĩ và khung giờ phù hợp chỉ trong vài phút.</p>
          <button className="mh-btn" onClick={onNavigateToBooking} style={styles.btnWhite}>Đặt lịch khám ngay</button>
        </div>
      </section>

      <Footer styles={styles} />
    </div>
  );
}

const inner: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' };

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', width: '100%', backgroundColor: '#f5faff', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#334155', boxSizing: 'border-box' },

  header: { position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 48px', backgroundColor: 'rgba(240,247,255,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #dbeafe' },
  logoBox: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  logoImg: { width: 32, height: 32, objectFit: 'contain' },
  logoText: { fontSize: 20, fontWeight: 800, color: '#1d4ed8', letterSpacing: 0.3 },
  nav: { display: 'flex', gap: 28 },
  navLink: { fontSize: 15, fontWeight: 500, color: '#475569', cursor: 'pointer', transition: 'color .2s' },
  navActive: { color: '#2563eb', fontWeight: 700 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 14 },
  hotline: { fontSize: 14, fontWeight: 600, color: '#dc2626' },
  userBox: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: { width: 38, height: 38, borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  userInfo: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 },
  userName: { fontSize: 14, fontWeight: 600, color: '#0f172a', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roleBadge: { alignSelf: 'flex-start', marginTop: 2, padding: '1px 8px', fontSize: 11, fontWeight: 600, color: '#1d4ed8', backgroundColor: '#dbeafe', borderRadius: 999 },

  btnPrimary: { padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnPrimarySm: { padding: '8px 18px', fontSize: 14, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', backgroundColor: '#3b82f6' },
  btnOutline: { padding: '8px 18px', fontSize: 14, fontWeight: 600, color: '#2563eb', backgroundColor: 'transparent', border: '1.5px solid #2563eb', borderRadius: 8, cursor: 'pointer' },
  btnGhost: { padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#1e293b', backgroundColor: '#fff', border: '1.5px solid #bfdbfe', borderRadius: 10, cursor: 'pointer' },
  btnWhite: { padding: '13px 32px', fontSize: 15, fontWeight: 700, color: '#1d4ed8', backgroundColor: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' },
  btnSmallLine: { marginTop: 14, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#2563eb', backgroundColor: '#e0efff', border: 'none', borderRadius: 8, cursor: 'pointer' },

  hero: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, padding: '72px 48px', background: 'linear-gradient(135deg,#e6f1ff 0%,#f0f7ff 55%,#f8fbff 100%)' },
  heroText: { flex: 1, maxWidth: 560 },
  welcome: { display: 'inline-block', marginBottom: 16, padding: '7px 16px', fontSize: 14, color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999 },
  heroTitle: { fontSize: 42, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', lineHeight: 1.2 },
  heroSub: { fontSize: 16, color: '#64748b', margin: '0 0 28px', lineHeight: 1.7 },
  heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  heroImgWrap: { flex: 1, maxWidth: 520, height: 340, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 40px rgba(59,130,246,.14)' },
  heroImg: { width: '100%', height: '100%', objectFit: 'cover' },

  statsWrap: { padding: '0 48px', marginTop: -32, position: 'relative', zIndex: 2 },
  statsGrid: { ...inner, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(15,23,42,.08)', padding: '24px 12px' },
  statItem: { textAlign: 'center', padding: '4px 8px' },
  statValue: { fontSize: 30, fontWeight: 800, color: '#2563eb' },
  statLabel: { fontSize: 14, color: '#64748b', marginTop: 2 },

  section: { padding: '72px 48px', textAlign: 'center' },
  title: { fontSize: 30, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' },
  titleSub: { fontSize: 15, color: '#64748b', margin: '0 0 36px' },
  grid3: { ...inner, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 },
  grid4: { ...inner, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 },
  card: { padding: 26, backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 16, textAlign: 'left', boxShadow: '0 2px 8px rgba(15,23,42,.04)' },
  iconCircle: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#e0efff', fontSize: 26, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' },
  cardDesc: { fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 },
  stepNo: { width: 30, height: 30, borderRadius: '50%', margin: '0 auto', backgroundColor: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'center', alignItems: 'center' },

  carousel: { ...inner, position: 'relative' },
  track: { display: 'flex', gap: 20, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '6px 2px 14px', scrollBehavior: 'smooth' },
  arrow: { position: 'absolute', top: '42%', zIndex: 5, width: 40, height: 40, borderRadius: '50%', border: '1px solid #bfdbfe', backgroundColor: '#fff', color: '#2563eb', fontSize: 24, lineHeight: '36px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,.12)', transition: 'all .2s' },
  doctorCard: { scrollSnapAlign: 'start', padding: 24, backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 16, textAlign: 'center', boxSizing: 'border-box' },
  doctorImg: { width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #dbeafe', margin: '0 auto 14px', display: 'block' },
  doctorAvatar: { width: 120, height: 120, borderRadius: '50%', backgroundColor: '#e0efff', border: '4px solid #dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 52, margin: '0 auto 14px' },
  doctorName: { fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  doctorSpec: { fontSize: 14, color: '#2563eb', fontWeight: 600, margin: '0 0 4px' },
  doctorExp: { fontSize: 13, color: '#64748b', margin: 0 },
  doctorBio: { fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  doctorNote: { ...inner, fontSize: 15, color: '#64748b', padding: '24px 0' },

  tableWrap: { ...inner, backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 16, overflow: 'hidden', textAlign: 'left', boxShadow: '0 2px 8px rgba(15,23,42,.04)' },
  tRow: { display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 12, alignItems: 'center', padding: '16px 24px', fontSize: 15, borderBottom: '1px solid #f1f5f9' },
  tHead: { backgroundColor: '#e0efff', fontWeight: 700, color: '#1d4ed8', fontSize: 14 },
  timePill: { justifySelf: 'start', padding: '4px 12px', fontSize: 13, fontWeight: 600, color: '#15803d', backgroundColor: '#f0fdf4', borderRadius: 999 },

  ctaWrap: { padding: '72px 48px' },
  cta: { ...inner, padding: '48px 24px', textAlign: 'center', borderRadius: 24, background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', color: '#1e3a8a' },
  ctaTitle: { fontSize: 28, fontWeight: 800, margin: '0 0 8px' },
  ctaSub: { fontSize: 15, opacity: 0.9, margin: '0 0 24px' },

  footer: { backgroundColor: '#e3effd', color: '#334155', padding: '48px 48px 20px' },
  footerInner: { ...inner, display: 'flex', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', paddingBottom: 28, borderBottom: '1px solid #c7dcf7' },
  footerBrand: { fontSize: 22, fontWeight: 800, color: '#1d4ed8', marginBottom: 8 },
  footerText: { fontSize: 14, margin: 0, maxWidth: 320, lineHeight: 1.6 },
  footerCol: { display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 },
  copy: { ...inner, textAlign: 'center', fontSize: 13, color: '#64748b', paddingTop: 18 },
};