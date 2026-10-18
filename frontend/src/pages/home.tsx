import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import SafeImage from '../components/safeimage';
import Header from '../components/header';
import Footer from '../components/footer';
import ScheduleTable from '../components/scheduletable';
import { doctorService } from '../services/doctorservice';
import { useClinicInfo } from '../services/clinicservice';
import { ApiError } from '../services/apierror';
import { getAsset, getRoleLabel } from '../utils/helpers';
import { inner, layoutStyles } from '../styles/layout';
import type { AuthUser, Doctor, NavHandlers } from '../types';

const STATS = [
  { value: '6+', label: 'Bác sĩ chuyên khoa' },
  { value: '10.000+', label: 'Lượt khám mỗi năm' },
  { value: '8', label: 'Chuyên khoa' },
  { value: '24/7', label: 'Đặt lịch trực tuyến' },
];

const REASONS = [
  { icon: '👨‍⚕️', t: 'Đội ngũ bác sĩ giàu kinh nghiệm', d: 'Bác sĩ có chuyên môn cao, tận tâm và nhiều năm công tác tại các bệnh viện lớn.' },
  { icon: '📅', t: 'Đặt lịch trực tuyến 24/7', d: 'Chủ động chọn lịch hẹn nhanh chóng, không cần chờ đợi tại phòng khám.' },
  { icon: '⚡', t: 'Trang thiết bị hiện đại', d: 'Máy móc y tế tối tân, hỗ trợ chẩn đoán chính xác và điều trị hiệu quả.' },
];

const STEPS = [
  { icon: '🔐', title: 'Đăng nhập', desc: 'Tạo tài khoản hoặc đăng nhập vào hệ thống.' },
  { icon: '🩺', title: 'Chọn bác sĩ', desc: 'Xem thông tin và chọn bác sĩ phù hợp.' },
  { icon: '🕒', title: 'Chọn khung giờ', desc: 'Chọn ngày và giờ khám còn trống.' },
  { icon: '✅', title: 'Xác nhận lịch', desc: 'Nhận xác nhận và đến khám đúng giờ.' },
];

function HeroBanner({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div style={styles.heroImgWrap}>
      <img src={src} alt="Phòng khám MediCare-Hub" style={styles.heroImg} onError={() => setFailed(true)} />
    </div>
  );
}

const Title = ({ title, sub }: { title: string; sub: string }) => (
  <>
    <h2 style={styles.title}>{title}</h2>
    <p style={styles.titleSub}>{sub}</p>
  </>
);

interface HomeProps {
  user?: AuthUser | null;
  nav: NavHandlers;
  onBooking: (doctorId?: string | number) => void;
}

export default function Home({ user, nav, onBooking }: HomeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { clinic, loading: clinicLoading } = useClinicInfo(); // mô tả phòng khám từ API-05
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');

  // API-06: service tự chọn mock hoặc BE thật
  useEffect(() => {
    let cancelled = false;
    doctorService
      .getFeatured()
      .then((list) => !cancelled && setDoctors(list))
      .catch((err) => {
        if (!cancelled)
          setDoctorsError(err instanceof ApiError && err.message ? err.message : 'Không thể tải danh sách bác sĩ, vui lòng thử lại sau.');
      })
      .finally(() => !cancelled && setDoctorsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user ? user.username || user.email : '';
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const slideDoctors = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * (el.clientWidth + 20), behavior: 'smooth' });
  };

  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={{ ...nav, onHome: () => scrollTo('top') }} />

      <section id="top" className="mh-hero" style={styles.hero}>
        <div style={styles.heroText}>
          {user && (
            <div style={styles.welcome}>
              👋 Xin chào, <b>{displayName}</b> · {getRoleLabel(user.role)}
            </div>
          )}
          <h1 style={styles.heroTitle}>
            Đặt lịch khám nhanh chóng,<br />
            <span style={{ color: '#2563eb' }}>chăm sóc sức khỏe tận tâm</span>
          </h1>
          <p style={styles.heroSub}>
            {clinic?.description?.trim() || (clinicLoading ? '' : 'Thông tin giới thiệu phòng khám đang được cập nhật.')}
          </p>
          <div style={styles.heroBtns}>
            <button className="mh-btn" onClick={() => onBooking()} style={styles.btnPrimary}>Đặt lịch khám ngay</button>
            <button className="mh-btn" onClick={nav.onSchedule} style={styles.btnGhost}>Xem lịch khám</button>
          </div>
        </div>
        <HeroBanner src={getAsset('1')} />
      </section>

      <section style={styles.statsWrap}>
        <div className="mh-grid4" style={styles.statsGrid}>
          {STATS.map((s) => (
            <div key={s.label} style={styles.statItem}>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mh-section" style={styles.section}>
        <Title title="Vì sao chọn chúng tôi" sub="Dịch vụ y tế tiện lợi, minh bạch và đáng tin cậy" />
        <div className="mh-grid3" style={styles.grid3}>
          {REASONS.map((c) => (
            <div key={c.t} className="mh-card" style={styles.card}>
              <div style={styles.iconCircle}>{c.icon}</div>
              <h3 style={styles.cardTitle}>{c.t}</h3>
              <p style={styles.cardDesc}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mh-section" style={{ ...styles.section, backgroundColor: '#eaf3ff' }}>
        <Title title="Đặt lịch chỉ với 4 bước" sub="Đơn giản, nhanh gọn, không cần xếp hàng" />
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
        <Title title="Bác sĩ tiêu biểu" sub="Kéo sang hoặc bấm mũi tên để xem thêm bác sĩ" />

        {doctorsLoading && <p style={styles.doctorNote}>Đang tải danh sách bác sĩ...</p>}
        {!doctorsLoading && doctorsError && <p style={{ ...styles.doctorNote, color: '#dc2626' }}>{doctorsError}</p>}
        {!doctorsLoading && !doctorsError && doctors.length === 0 && <p style={styles.doctorNote}>Chưa có danh sách bác sĩ</p>}

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
                  <div style={styles.doctorBioWrapper}>
                    <p style={styles.doctorBio}>{d.bio || 'Đang cập nhật thông tin giới thiệu chuyên môn.'}</p>
                  </div>
                  <button className="mh-btn" onClick={() => onBooking(d.id)} style={styles.btnSmallLine}>Đặt lịch với bác sĩ</button>
                </div>
              ))}
            </div>

            <button className="mh-arrow" aria-label="Sau" onClick={() => slideDoctors(1)} style={{ ...styles.arrow, right: -18 }}>›</button>
          </div>
        )}
      </section>

      <section id="schedule" className="mh-section" style={{ ...styles.section, backgroundColor: '#eaf3ff' }}>
        <Title title="Lịch khám" sub="Lịch làm việc các chuyên khoa trong tuần (Chủ nhật: nghỉ, chỉ tiếp nhận cấp cứu)" />
        <ScheduleTable />
      </section>

      <section style={styles.ctaWrap}>
        <div style={styles.cta}>
          <h3 style={styles.ctaTitle}>Bạn cần đặt lịch khám?</h3>
          <p style={styles.ctaSub}>Chọn bác sĩ và khung giờ phù hợp chỉ trong vài phút.</p>
          <button className="mh-btn" onClick={() => onBooking()} style={styles.btnWhite}>Đặt lịch khám ngay</button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  btnPrimary: { padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnGhost: { padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#1e293b', backgroundColor: '#fff', border: '1.5px solid #bfdbfe', borderRadius: 10, cursor: 'pointer' },
  btnWhite: { padding: '13px 32px', fontSize: 15, fontWeight: 700, color: '#1d4ed8', backgroundColor: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' },
  btnSmallLine: { width: '85%', marginTop: 'auto', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#2563eb', backgroundColor: '#e0efff', border: 'none', borderRadius: 8, cursor: 'pointer', boxSizing: 'border-box' },

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
  track: { display: 'flex', gap: 20, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '6px 2px 14px', scrollBehavior: 'smooth', alignItems: 'stretch', scrollbarWidth: 'none' },
  arrow: { position: 'absolute', top: '42%', zIndex: 5, width: 40, height: 40, borderRadius: '50%', border: '1px solid #bfdbfe', backgroundColor: '#fff', color: '#2563eb', fontSize: 24, lineHeight: '36px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,.12)', transition: 'all .2s' },
  
  // Cấu hình căn giữa các thành phần bên trong thẻ bác sĩ
  doctorCard: { scrollSnapAlign: 'start', flex: '0 0 calc(33.333% - 14px)', width: 'calc(33.333% - 14px)', minWidth: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 16, textAlign: 'center', boxSizing: 'border-box' },
  
  doctorImg: { width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #dbeafe', margin: '0 auto 14px', display: 'block', flexShrink: 0 },
  doctorAvatar: { width: 120, height: 120, borderRadius: '50%', backgroundColor: '#e0efff', border: '4px solid #dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 52, margin: '0 auto 14px', flexShrink: 0 },
  doctorName: { fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', minHeight: 24, textAlign: 'center', width: '100%' },
  doctorSpec: { fontSize: 14, color: '#2563eb', fontWeight: 600, margin: '0 0 10px', minHeight: 20, textAlign: 'center', width: '100%' },
  
  doctorBioWrapper: { flexGrow: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 16, width: '100%' },
  doctorBio: { fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', width: '100%' },
  
  doctorNote: { ...inner, fontSize: 15, color: '#64748b', padding: '24px 0' },

  ctaWrap: { padding: '72px 48px' },
  cta: { ...inner, padding: '48px 24px', textAlign: 'center', borderRadius: 24, background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', color: '#1e3a8a' },
  ctaTitle: { fontSize: 28, fontWeight: 800, margin: '0 0 8px' },
  ctaSub: { fontSize: 15, opacity: 0.9, margin: '0 0 24px' },
};