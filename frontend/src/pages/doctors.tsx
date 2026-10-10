import { useState, useMemo, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import SafeImage from '../components/safeimage';
import { doctorService } from '../services/doctorservice';
import { ApiError } from '../services/apierror';
import { buildShifts } from '../utils/schedule';
import { formatDate } from '../utils/helpers';
import { inner, layoutStyles } from '../styles/layout';
import type { AuthUser, Doctor, NavHandlers, Slot } from '../types';

const ALL = 'Tất cả chuyên khoa';
const SPECIALTIES = [ALL, 'Nội tổng quát', 'Nhi khoa', 'Da liễu', 'Tim mạch', 'Tai Mũi Họng', 'Sản phụ khoa'];

// ApiError dùng err.status (status 0 = không kết nối được máy chủ)
const loadError = (err: unknown) => {
  const status = err instanceof ApiError ? err.status : 0;
  if (status === 404) return 'Không thể tải danh sách bác sĩ (404): backend chưa gắn route GET /api/doctors.';
  if (status === 0) return 'Không thể tải danh sách bác sĩ: không kết nối được tới máy chủ backend.';
  return `Không thể tải danh sách bác sĩ (lỗi ${status}), vui lòng thử lại sau.`;
};

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    {children}
  </div>
);

interface DoctorsPageProps {
  user?: AuthUser | null;
  nav: NavHandlers;
  onBooking: (doctorId?: string | number) => void;
}

export default function DoctorsPage({ user, nav, onBooking }: DoctorsPageProps) {
  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(ALL);
  const [selectedDate, setSelectedDate] = useState('');

  // Dữ liệu
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slotsByDoctor, setSlotsByDoctor] = useState<Record<string, Slot[]>>({}); // { [doctorId]: Slot[] }
  const [slotsLoading, setSlotsLoading] = useState(false);

  // 1. Danh sách bác sĩ (API-07) + bác sĩ nổi bật (API-06)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const specialty = selectedSpecialty !== ALL ? selectedSpecialty : undefined;
    // Nổi bật lỗi thì coi như rỗng, không làm hỏng cả trang
    const featuredReq = doctorService.getFeatured().catch(() => [] as Doctor[]);

    Promise.all([doctorService.getDoctors(specialty), featuredReq])
      .then(([list, featured]) => {
        if (cancelled) return;
        setDoctors(list);
        setFeaturedIds(new Set(featured.map((d) => String(d.id))));
      })
      .catch((err) => {
        if (cancelled) return;
        setDoctors([]);
        setError(loadError(err));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selectedSpecialty]);

  // 2. Lịch làm việc từng bác sĩ (API-08); không chọn ngày = hôm nay (giờ VN)
  useEffect(() => {
    if (doctors.length === 0) {
      setSlotsByDoctor({});
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);

    // Gọi song song; 1 bác sĩ lỗi thì coi như không có lịch ngày đó
    Promise.all(
      doctors.map((doc) =>
        doctorService
          .getSchedule(doc.id, selectedDate || undefined)
          .then((r) => [String(doc.id), r.slots] as const)
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

  // 3. Lọc phía client, rồi tách 2 nhóm: nổi bật / khác
  const filteredDoctors = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return doctors.filter((doc) => {
      const matchesSearch =
        !keyword ||
        [doc.full_name, doc.specialty, doc.bio ?? ''].some((t) => t.toLowerCase().includes(keyword));
      // Có chọn ngày -> chỉ giữ bác sĩ còn khung giờ trống ngày đó
      const matchesDate = !selectedDate || (slotsByDoctor[String(doc.id)] ?? []).some((s) => s.available);
      return matchesSearch && matchesDate;
    });
  }, [doctors, searchTerm, selectedDate, slotsByDoctor]);

  const featuredList = filteredDoctors.filter((d) => featuredIds.has(String(d.id)));
  const otherList = filteredDoctors.filter((d) => !featuredIds.has(String(d.id)));

  const hasFilter = searchTerm || selectedSpecialty !== ALL || selectedDate;
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty(ALL);
    setSelectedDate('');
  };

  const isBusy = loading || slotsLoading;
  const ready = !isBusy && !error;
  const dateLabel = selectedDate ? formatDate(selectedDate) : 'hôm nay';

  const renderDoctorCard = (doc: Doctor) => {
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
            {featuredIds.has(String(doc.id)) && <span style={styles.featuredBadge}>⭐ Nổi bật</span>}
          </div>

          <h3 style={styles.docName}>{doc.full_name}</h3>
          {doc.bio && <p style={styles.bio}>{doc.bio}</p>}

          <div style={styles.scheduleInfo}>
            <span style={styles.scheduleTitle}>Ca làm việc ({dateLabel}):</span>
            {shifts.length > 0 ? (
              <div style={styles.shiftList}>
                {shifts.map((s) => (
                  <div key={s.label} style={styles.shiftRow}>
                    <span style={styles.shiftName}>{s.label}</span>
                    <span style={styles.shiftTime}>{s.start} - {s.end}</span>
                    <span style={styles.shiftCount}>còn {s.availableCount} khung giờ</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noShift}>Không có lịch làm việc ngày này</p>
            )}
          </div>

          <button onClick={() => onBooking(doc.id)} style={styles.btnBook}>Đặt lịch hẹn</button>
        </div>
      </div>
    );
  };

  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active="doctors" />

      <PageBanner title="Đội Ngũ Bác Sĩ Chuyên Khoa" sub="Tìm kiếm thông tin bác sĩ và lựa chọn khung giờ khám phù hợp nhất với bạn" />

      <section style={styles.filterSection}>
        <div style={styles.filterCard}>
          <div style={styles.filterGrid}>
            <Group label="🔍 Tìm kiếm bác sĩ">
              <input type="text" placeholder="Nhập tên bác sĩ, chuyên khoa..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} style={styles.input} />
            </Group>
            <Group label="🩺 Chuyên khoa">
              <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} style={styles.select}>
                {SPECIALTIES.map((spec) => <option key={spec} value={spec}>{spec}</option>)}
              </select>
            </Group>
            <Group label="📅 Ngày khám">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={styles.input} />
            </Group>
          </div>

          {hasFilter && (
            <div style={styles.resetWrap}>
              <button onClick={resetFilters} style={styles.resetBtn}>🔄 Xóa bộ lọc</button>
            </div>
          )}
        </div>
      </section>

      <section style={styles.listSection}>
        {isBusy && <div style={styles.resultSummary}>Đang tải danh sách bác sĩ...</div>}
        {!isBusy && error && <div style={{ ...styles.resultSummary, color: '#dc2626' }}>{error}</div>}
        {ready && <div style={styles.resultSummary}>Hiển thị <b>{filteredDoctors.length}</b> bác sĩ phù hợp</div>}

        {ready && featuredList.length > 0 && (
          <>
            <h2 style={styles.sectionTitle}>⭐ Bác sĩ nổi bật</h2>
            <div style={styles.doctorGrid}>{featuredList.map(renderDoctorCard)}</div>
          </>
        )}

        {ready && otherList.length > 0 && (
          <>
            {featuredList.length > 0 && <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>Các bác sĩ khác</h2>}
            <div style={styles.doctorGrid}>{otherList.map(renderDoctorCard)}</div>
          </>
        )}

        {ready && filteredDoctors.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <h3>Không tìm thấy bác sĩ phù hợp</h3>
            <p>Vui lòng thử lại với từ khóa hoặc điều kiện lọc khác.</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

const field: CSSProperties = { padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' };
const tag: CSSProperties = { fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6 };
const circle: CSSProperties = { width: 90, height: 90, borderRadius: '50%', flexShrink: 0 };

const styles: Record<string, CSSProperties> = {

  filterSection: { ...inner, padding: '0 24px', marginTop: -28 },
  filterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 10px 25px rgba(15,23,42,.08)', border: '1px solid #dbeafe' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  input: field,
  select: { ...field, backgroundColor: '#fff' },
  resetWrap: { marginTop: 16, textAlign: 'right' },
  resetBtn: { background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' },

  listSection: { ...inner, padding: '40px 24px 72px' },
  resultSummary: { fontSize: 15, color: '#64748b', marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' },
  doctorGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 },
  doctorCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, border: '1px solid #dbeafe', display: 'flex', gap: 20, boxShadow: '0 4px 12px rgba(15,23,42,.03)', alignItems: 'flex-start' },
  doctorImg: { ...circle, objectFit: 'cover', border: '3px solid #dbeafe' },
  doctorAvatar: { ...circle, backgroundColor: '#e0efff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 40 },
  doctorContent: { flex: 1, display: 'flex', flexDirection: 'column' },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  badge: { ...tag, backgroundColor: '#eff6ff', color: '#2563eb' },
  featuredBadge: { ...tag, backgroundColor: '#fef3c7', color: '#b45309' },
  docName: { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  bio: { fontSize: 13, color: '#64748b', margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },

  scheduleInfo: { borderTop: '1px solid #f1f5f9', paddingTop: 10, marginBottom: 16 },
  scheduleTitle: { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
  shiftList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
  shiftRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 13 },
  shiftName: { fontWeight: 700, color: '#0f172a', minWidth: 62 },
  shiftTime: { padding: '2px 10px', fontSize: 12, fontWeight: 600, color: '#15803d', backgroundColor: '#f0fdf4', borderRadius: 999 },
  shiftCount: { fontSize: 12, color: '#64748b' },
  noShift: { fontSize: 13, color: '#94a3b8', margin: '8px 0 0' },

  btnBook: { padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#fff', backgroundColor: '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'center' },
  emptyState: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#fff', borderRadius: 16, border: '1px dashed #cbd5e1', color: '#64748b' },
};