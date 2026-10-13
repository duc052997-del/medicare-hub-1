import type { CSSProperties } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import PageBanner from '../components/pagebanner';
import { useClinicInfo, displayInfo } from '../services/clinicservice';
import { inner, layoutStyles } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

interface ContactPageProps {
  user?: AuthUser | null;
  nav: NavHandlers;
}

export default function ContactPage({ user, nav }: ContactPageProps) {
  const { clinic, loading } = useClinicInfo();
  const show = (v?: string | null) => displayInfo(v, loading);

  const items = [
    { icon: '📍', label: 'Địa chỉ', value: show(clinic?.address) },
    { icon: '📞', label: 'Hotline', value: show(clinic?.hotline) },
    { icon: '✉️', label: 'Email', value: show(clinic?.email) },
    { icon: '🕒', label: 'Giờ làm việc', value: show(clinic?.working_hours || clinic?.workingHours) },
  ];

  return (
    <div style={layoutStyles.container}>
      <Header user={user} nav={nav} active="contact" />
      <PageBanner title="Liên Hệ" sub="Thông tin liên hệ và giờ làm việc của phòng khám" />

      <section style={styles.content}>
        <div style={styles.grid}>
          {items.map((i) => (
            <div key={i.label} className="mh-card" style={styles.card}>
              <div style={styles.icon}>{i.icon}</div>
              <div style={styles.label}>{i.label}</div>
              <div style={styles.value}>{i.value}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  content: { ...inner, padding: '40px 24px 72px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 },
  card: { padding: 26, backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 16, boxShadow: '0 2px 8px rgba(15,23,42,.04)' },
  icon: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#e0efff', fontSize: 26, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 6 },
  value: { fontSize: 16, fontWeight: 600, color: '#0f172a', lineHeight: 1.5 },
};