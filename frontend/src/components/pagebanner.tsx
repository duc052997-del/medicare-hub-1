import type { CSSProperties } from 'react';

// Dải tiêu đề xanh đầu trang con (Bác sĩ, Lịch khám, Liên hệ...)
export default function PageBanner({ title, sub }: { title: string; sub: string }) {
  return (
    <section style={styles.banner}>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.sub}>{sub}</p>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  banner: { color: '#fff', padding: '48px 24px', textAlign: 'center', background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' },
  title: { fontSize: 32, fontWeight: 800, margin: '0 0 12px' },
  sub: { fontSize: 16, opacity: 0.9, margin: 0 },
};