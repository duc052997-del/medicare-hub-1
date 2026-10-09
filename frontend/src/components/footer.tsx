import { useClinicInfo, displayInfo } from '../services/clinicservice';
import { layoutStyles as s } from '../styles/layout';

export default function Footer() {
  const { clinic, loading } = useClinicInfo();
  const show = (v?: string | null) => displayInfo(v, loading);
  // Hỗ trợ cả 2 dạng tên biến từ backend (working_hours hoặc workingHours)
  const workingHours = clinic?.working_hours || clinic?.workingHours;

  return (
    <footer id="contact" style={s.footer}>
      <div style={s.footerInner}>
        <div>
          <div style={s.footerBrand}>{show(clinic?.name)}</div>
          <p style={s.footerText}>{show(clinic?.description)}</p>
        </div>

        <div style={s.footerCol}>
          <span>📍 Địa chỉ: {show(clinic?.address)}</span>
          <span>📞 Hotline: {show(clinic?.hotline)}</span>
          <span>✉️ Email: {show(clinic?.email)}</span>
          <span>🕒 Giờ làm việc: {show(workingHours)}</span>
        </div>
      </div>

      <div style={s.copy}>
        © {new Date().getFullYear()} {show(clinic?.name)}. Mọi quyền được bảo lưu.
      </div>
    </footer>
  );
}