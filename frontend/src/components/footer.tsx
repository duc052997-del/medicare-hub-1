import React from 'react';
import { useClinicInfo, displayInfo } from '../services/clinicservice';

interface FooterProps {
  styles: Record<string, React.CSSProperties>;
}

export default function Footer({ styles }: FooterProps) {
  // Lấy dữ liệu phòng khám động từ DB
  const { clinic, loading } = useClinicInfo();

  // Hỗ trợ cả 2 dạng tên biến từ backend (working_hours hoặc workingHours)
  const workingHoursData = clinic?.working_hours || clinic?.workingHours;
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" style={styles.footer}>
      <div style={styles.footerInner}>
        <div>
          <div style={styles.footerBrand}>
            {displayInfo(clinic?.name, loading)}
          </div>

          <p style={styles.footerText}>
            {displayInfo(clinic?.description, loading)}
          </p>
        </div>

        <div style={styles.footerCol}>
          <span>📍 Địa chỉ: {displayInfo(clinic?.address, loading)}</span>
          <span>📞 Hotline: {displayInfo(clinic?.hotline, loading)}</span>
          <span>✉️ Email: {displayInfo(clinic?.email, loading)}</span>
          <span>
            🕒 Giờ làm việc: {displayInfo(workingHoursData, loading)}
          </span>
        </div>
      </div>

      <div style={styles.copy}>
        © {currentYear} {displayInfo(clinic?.name, loading)}. Mọi quyền được bảo lưu.
      </div>
    </footer>
  );
}