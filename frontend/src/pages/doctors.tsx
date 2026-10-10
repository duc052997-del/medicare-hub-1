import React, { useState, useMemo, useEffect } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import SafeImage from '../components/safeimage';
import api from '../services/api';
import type { AuthUser } from './home';

// Chỉ còn dùng ảnh assets cho logo (ảnh bác sĩ lấy từ avatar_url của DB)
const assetImages = import.meta.glob('../assets/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const getAsset = (name: string): string | undefined => {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const found = assetImages[`../assets/${name}.${ext}`];
    if (found) return found;
  }
  return undefined;
};

const ROLE_LABELS: Record<string, string> = {
  PATIENT: 'người dùng',
  DOCTOR: 'Bác sĩ',
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
};

const getRoleLabel = (role?: string) =>
  role ? ROLE_LABELS[role.toUpperCase()] ?? role : '';

// Khớp với các cột backend select trong doctorCatalog.controller.js
export interface Doctor {
  id: string | number;
  full_name: string;
  specialty: string;
  avatar_url: string | null;
  bio: string | null;
}

// Khớp với { time, available } của API /doctors/:id/schedule
interface Slot {
  time: string;
  available: boolean;
}

// Một ca làm việc sau khi gom các khung giờ lại
interface Shift {
  label: string; // Ca sáng / Ca chiều / Ca tối
  start: string; // "08:00"
  end: string; // "12:00"
  availableCount: number; // số khung giờ còn trống
}

const ALL_SPECIALTIES = 'Tất cả chuyên khoa';

const SPECIALTIES = [
  ALL_SPECIALTIES,
  'Nội tổng quát',
  'Nhi khoa',
  'Da liễu',
  'Tim mạch',
  'Tai Mũi Họng',
  'Sản phụ khoa',
];

// ---------- Hàm hỗ trợ: gom khung giờ thành ca làm ----------
// Backend chỉ trả danh sách khung giờ (VD 08:00, 08:30, ..., 11:30), không trả
// tên ca. Nên FE chia theo buổi: trước 12:00 = sáng, 12:00-18:00 = chiều, còn lại = tối.
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const toTimeText = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

const SHIFT_DEFS = [
  { label: 'Ca sáng', from: 0, to: 12 * 60 },
  { label: 'Ca chiều', from: 12 * 60, to: 18 * 60 },
  { label: 'Ca tối', from: 18 * 60, to: 24 * 60 },
];

const DEFAULT_STEP = 30; // phút, trùng giá trị mặc định của backend

// Độ dài 1 khung giờ = khoảng cách nhỏ nhất giữa 2 khung liền kề
const detectStep = (minutes: number[]): number => {
  let step = Infinity;
  for (let i = 1; i < minutes.length; i++) {
    const diff = minutes[i] - minutes[i - 1];
    if (diff > 0 && diff < step) step = diff;
  }
  return Number.isFinite(step) ? step : DEFAULT_STEP;
};

const buildShifts = (slots: Slot[]): Shift[] => {
  if (slots.length === 0) return [];

  const sorted = [...slots].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const globalStep = detectStep(sorted.map((s) => toMinutes(s.time)));

  const shifts: Shift[] = [];
  for (const def of SHIFT_DEFS) {
    const inShift = sorted.filter((s) => {
      const m = toMinutes(s.time);
      return m >= def.from && m < def.to;
    });
    if (inShift.length === 0) continue;

    const minutes = inShift.map((s) => toMinutes(s.time));
    const step = minutes.length > 1 ? detectStep(minutes) : globalStep;

    shifts.push({
      label: def.label,
      start: toTimeText(minutes[0]),
      // Giờ kết thúc ca = khung giờ cuối + độ dài 1 khung
      end: toTimeText(minutes[minutes.length - 1] + step),
      availableCount: inShift.filter((s) => s.available).length,
    });
  }
  return shifts;
};

// "2026-10-05" -> "05/10/2026"
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

interface DoctorsPageProps {
  user?: AuthUser | null;
  onNavigateHome: () => void;
  onNavigateToDoctors: () => void;
  onNavigateToSchedule: () => void;
  onNavigateToContact: () => void;
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToLogout: () => void;
  onNavigateToBooking: (doctorId?: string | number) => void;
}

export default function DoctorsPage({
  user,
  onNavigateHome,
  onNavigateToDoctors,
  onNavigateToSchedule,
  onNavigateToContact,
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateToLogout,
  onNavigateToBooking,
}: DoctorsPageProps) {
  const logoImage = getAsset('2');
  const displayName = user ? user.username || user.email : '';
  const roleLabel = user ? getRoleLabel(user.role) : '';

  // State bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(ALL_SPECIALTIES);
  const [selectedDate, setSelectedDate] = useState('');

  // State dữ liệu từ backend
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lịch làm việc theo ngày: { [doctorId]: Slot[] }
  // Không chọn ngày -> backend tự lấy "hôm nay"
  const [slotsByDoctor, setSlotsByDoctor] = useState<Record<string, Slot[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);

  // ---------- 1. Lấy danh sách bác sĩ + danh sách bác sĩ nổi bật ----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params =
      selectedSpecialty !== ALL_SPECIALTIES ? { specialty: selectedSpecialty } : {};

    // Danh sách đầy đủ (lọc chuyên khoa ở backend)
    const doctorsReq = api.get('/doctors', { params });
    // Danh sách nổi bật: lỗi thì coi như rỗng, không làm hỏng cả trang
    const featuredReq = api
      .get('/doctors/featured')
      .then((res) => (res.data?.doctors ?? []) as Doctor[])
      .catch(() => [] as Doctor[]);

    Promise.all([doctorsReq, featuredReq])
      .then(([doctorsRes, featured]) => {
        if (cancelled) return;
        setDoctors(doctorsRes.data?.doctors ?? []);
        setFeaturedIds(new Set(featured.map((d) => String(d.id))));
      })
      .catch((err) => {
        if (cancelled) return;
        setDoctors([]);
        const status = err?.response?.status;
        if (status === 404) {
          setError(
            'Không thể tải danh sách bác sĩ (404): backend chưa gắn route GET /api/doctors. ' +
              "Kiểm tra routes/index.js đã có router.use('/doctors', doctorCatalogRoutes) chưa."
          );
        } else if (!status) {
          setError('Không thể tải danh sách bác sĩ: không kết nối được tới máy chủ backend.');
        } else {
          setError(`Không thể tải danh sách bác sĩ (lỗi ${status}), vui lòng thử lại sau.`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSpecialty]);

  // ---------- 2. Lấy lịch làm việc của từng bác sĩ (ngày chọn, mặc định hôm nay) ----------
  useEffect(() => {
    if (doctors.length === 0) {
      setSlotsByDoctor({});
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);

    // Không chọn ngày thì không gửi ?date=, backend tự dùng ngày hôm nay (giờ VN)
    const params = selectedDate ? { date: selectedDate } : {};

    // Gọi song song; 1 bác sĩ lỗi thì coi như không có lịch ngày đó
    Promise.all(
      doctors.map((doc) =>
        api
          .get(`/doctors/${doc.id}/schedule`, { params })
          .then((res) => [String(doc.id), (res.data?.slots ?? []) as Slot[]] as const)
          .catch(() => [String(doc.id), [] as Slot[]] as const)
      )
    ).then((entries) => {
      if (cancelled) return;
      setSlotsByDoctor(Object.fromEntries(entries));
      setSlotsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, doctors]);

  // ---------- 3. Lọc phía client, rồi tách thành 2 nhóm: nổi bật / khác ----------
  const filteredDoctors = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return doctors.filter((doc) => {
      const matchesSearch =
        !keyword ||
        doc.full_name.toLowerCase().includes(keyword) ||
        doc.specialty.toLowerCase().includes(keyword) ||
        (doc.bio ?? '').toLowerCase().includes(keyword);

      // Có chọn ngày -> chỉ giữ bác sĩ còn khung giờ trống ngày đó
      let matchesDate = true;
      if (selectedDate) {
        const slots = slotsByDoctor[String(doc.id)] ?? [];
        matchesDate = slots.some((s) => s.available);
      }

      return matchesSearch && matchesDate;
    });
  }, [doctors, searchTerm, selectedDate, slotsByDoctor]);

  const featuredList = useMemo(
    () => filteredDoctors.filter((d) => featuredIds.has(String(d.id))),
    [filteredDoctors, featuredIds]
  );
  const otherList = useMemo(
    () => filteredDoctors.filter((d) => !featuredIds.has(String(d.id))),
    [filteredDoctors, featuredIds]
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty(ALL_SPECIALTIES);
    setSelectedDate('');
  };

  const isBusy = loading || slotsLoading;
  const dateLabel = selectedDate ? formatDate(selectedDate) : 'hôm nay';

  // ---------- Thẻ 1 bác sĩ ----------
  const renderDoctorCard = (doc: Doctor) => {
    const isFeatured = featuredIds.has(String(doc.id));
    const shifts = buildShifts(slotsByDoctor[String(doc.id)] ?? []);

    return (
      <div key={doc.id} style={styles.doctorCard}>
        <SafeImage
          src={doc.avatar_url ?? undefined}
          alt={doc.full_name}
          style={styles.doctorImg}
          fallback={<div style={styles.doctorAvatar}>👨‍⚕️</div>}
        />

        <div style={styles.doctorContent}>
          <div style={styles.badgeRow}>
            <span style={styles.badge}>{doc.specialty}</span>
            {isFeatured && <span style={styles.featuredBadge}>⭐ Nổi bật</span>}
          </div>

          <h3 style={styles.docName}>{doc.full_name}</h3>
          {doc.bio && <p style={styles.bio}>{doc.bio}</p>}

          {/* Ca làm việc + thời gian mỗi ca */}
          <div style={styles.scheduleInfo}>
            <span style={styles.scheduleTitle}>Ca làm việc ({dateLabel}):</span>

            {shifts.length > 0 ? (
              <div style={styles.shiftList}>
                {shifts.map((s) => (
                  <div key={s.label} style={styles.shiftRow}>
                    <span style={styles.shiftName}>{s.label}</span>
                    <span style={styles.shiftTime}>
                      {s.start} - {s.end}
                    </span>
                    <span style={styles.shiftCount}>còn {s.availableCount} khung giờ</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noShift}>Không có lịch làm việc ngày này</p>
            )}
          </div>

          <button onClick={() => onNavigateToBooking(doc.id)} style={styles.btnBook}>
            Đặt lịch hẹn
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <Header
        user={user}
        logoImage={logoImage}
        displayName={displayName}
        roleLabel={roleLabel}
        scrollTo={onNavigateHome}
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToRegister={onNavigateToRegister}
        onNavigateToLogout={onNavigateToLogout}
        onNavigateToDoctors={onNavigateToDoctors}
        onNavigateToSchedule={onNavigateToSchedule}
        onNavigateToContact={onNavigateToContact}
        styles={styles}
      />

      {/* Hero Header Section */}
      <section style={styles.heroBanner}>
        <h1 style={styles.heroTitle}>Đội Ngũ Bác Sĩ Chuyên Khoa</h1>
        <p style={styles.heroSub}>
          Tìm kiếm thông tin bác sĩ và lựa chọn khung giờ khám phù hợp nhất với bạn
        </p>
      </section>

      {/* Filter Section */}
      <section style={styles.filterSection}>
        <div style={styles.filterCard}>
          <div style={styles.filterGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>🔍 Tìm kiếm bác sĩ</label>
              <input
                type="text"
                placeholder="Nhập tên bác sĩ, chuyên khoa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>🩺 Chuyên khoa</label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                style={styles.select}
              >
                {SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>📅 Ngày khám</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {(searchTerm || selectedSpecialty !== ALL_SPECIALTIES || selectedDate) && (
            <div style={styles.resetWrap}>
              <button onClick={handleResetFilters} style={styles.resetBtn}>
                🔄 Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Doctor List */}
      <section style={styles.listSection}>
        {isBusy && <div style={styles.resultSummary}>Đang tải danh sách bác sĩ...</div>}

        {!isBusy && error && (
          <div style={{ ...styles.resultSummary, color: '#dc2626' }}>{error}</div>
        )}

        {!isBusy && !error && (
          <div style={styles.resultSummary}>
            Hiển thị <b>{filteredDoctors.length}</b> bác sĩ phù hợp
          </div>
        )}

        {/* Nhóm 1: bác sĩ nổi bật (hiện trước) */}
        {!isBusy && !error && featuredList.length > 0 && (
          <>
            <h2 style={styles.sectionTitle}>⭐ Bác sĩ nổi bật</h2>
            <div style={styles.doctorGrid}>{featuredList.map(renderDoctorCard)}</div>
          </>
        )}

        {/* Nhóm 2: các bác sĩ còn lại (hiện sau) */}
        {!isBusy && !error && otherList.length > 0 && (
          <>
            {featuredList.length > 0 && (
              <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>Các bác sĩ khác</h2>
            )}
            <div style={styles.doctorGrid}>{otherList.map(renderDoctorCard)}</div>
          </>
        )}

        {!isBusy && !error && filteredDoctors.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <h3>Không tìm thấy bác sĩ phù hợp</h3>
            <p>Vui lòng thử lại với từ khóa hoặc điều kiện lọc khác.</p>
          </div>
        )}
      </section>

      <Footer styles={styles} />
    </div>
  );
}

const inner: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' };

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#f5faff',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    color: '#334155',
    boxSizing: 'border-box',
  },

  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 48px',
    backgroundColor: 'rgba(240,247,255,0.92)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #dbeafe',
  },
  logoBox: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  logoImg: { width: 32, height: 32, objectFit: 'contain' },
  logoText: { fontSize: 20, fontWeight: 800, color: '#1d4ed8', letterSpacing: 0.3 },
  nav: { display: 'flex', gap: 28 },
  navLink: { fontSize: 15, fontWeight: 500, color: '#475569', cursor: 'pointer' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 14 },
  hotline: { fontSize: 14, fontWeight: 600, color: '#dc2626' },
  userBox: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
    background: 'linear-gradient(135deg,#3b82f6,#60a5fa)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 },
  userName: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    padding: '1px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
  },

  btnPrimarySm: {
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    backgroundColor: '#3b82f6',
  },
  btnOutline: {
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 600,
    color: '#2563eb',
    backgroundColor: 'transparent',
    border: '1.5px solid #2563eb',
    borderRadius: 8,
    cursor: 'pointer',
  },

  heroBanner: {
    backgroundColor: '#1e40af',
    color: '#fff',
    padding: '48px 24px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
  },
  heroTitle: { fontSize: 32, fontWeight: 800, margin: '0 0 12px' },
  heroSub: { fontSize: 16, opacity: 0.9, margin: 0 },

  filterSection: { ...inner, padding: '0 24px', marginTop: -28 },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 10px 25px rgba(15,23,42,.08)',
    border: '1px solid #dbeafe',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
  },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#fff',
  },
  resetWrap: { marginTop: 16, textAlign: 'right' },
  resetBtn: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },

  listSection: { ...inner, padding: '40px 24px 72px' },
  resultSummary: { fontSize: 15, color: '#64748b', marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' },
  doctorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 24,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #dbeafe',
    display: 'flex',
    gap: 20,
    boxShadow: '0 4px 12px rgba(15,23,42,.03)',
    alignItems: 'flex-start',
  },
  doctorImg: {
    width: 90,
    height: 90,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #dbeafe',
    flexShrink: 0,
  },
  doctorAvatar: {
    width: 90,
    height: 90,
    borderRadius: '50%',
    backgroundColor: '#e0efff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 40,
    flexShrink: 0,
  },
  doctorContent: { flex: 1, display: 'flex', flexDirection: 'column' },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  badge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
  },
  featuredBadge: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    fontSize: 12,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
  },
  docName: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  bio: {
    fontSize: 13,
    color: '#64748b',
    margin: '0 0 12px',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  scheduleInfo: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: 10,
    marginBottom: 16,
  },
  scheduleTitle: { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
  shiftList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
  shiftRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 13,
  },
  shiftName: { fontWeight: 700, color: '#0f172a', minWidth: 62 },
  shiftTime: {
    padding: '2px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    borderRadius: 999,
  },
  shiftCount: { fontSize: 12, color: '#64748b' },
  noShift: { fontSize: 13, color: '#94a3b8', margin: '8px 0 0' },

  btnBook: {
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'center',
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: 16,
    border: '1px dashed #cbd5e1',
    color: '#64748b',
  },

  footer: { backgroundColor: '#e3effd', color: '#334155', padding: '48px 48px 20px' },
  footerInner: {
    ...inner,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 32,
    flexWrap: 'wrap',
    paddingBottom: 28,
    borderBottom: '1px solid #c7dcf7',
  },
  footerBrand: { fontSize: 22, fontWeight: 800, color: '#1d4ed8', marginBottom: 8 },
  footerText: { fontSize: 14, margin: 0, maxWidth: 320, lineHeight: 1.6 },
  footerCol: { display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 },
  copy: { ...inner, textAlign: 'center', fontSize: 13, color: '#64748b', paddingTop: 18 },
};