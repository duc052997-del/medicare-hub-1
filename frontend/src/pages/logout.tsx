import { useState } from 'react';
import type { CSSProperties } from 'react';
import { authService } from '../services/authservice';

interface LogoutProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function Logout({ isOpen, onClose, onConfirm }: LogoutProps) {
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;

  const handleLogout = async () => {
    setLoading(true);
    await authService.logout(); // mock hoặc BE thật (UC003); luôn xóa phiên ở client, không ném lỗi
    setLoading(false);
    onConfirm();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>Xác nhận đăng xuất</h2>
        <p style={styles.question}>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?</p>
        <p style={styles.subtitle}>Phiên đăng nhập hiện tại sẽ kết thúc.</p>

        <div style={styles.buttonGroup}>
          <button type="button" onClick={onClose} style={styles.cancelButton} disabled={loading}>
            Hủy
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            style={{ ...styles.confirmButton, backgroundColor: loading ? '#9ca3af' : '#111827', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Đang xử lý...' : 'Đăng xuất'}
          </button>
        </div>

        <p style={styles.footerText}>Bạn sẽ được chuyển về trang đăng nhập sau khi xác nhận</p>
      </div>
    </div>
  );
}

const button: CSSProperties = { flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600', borderRadius: '6px', transition: 'background-color 0.2s' };

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' },
  card: { width: '100%', maxWidth: '440px', padding: '32px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)', textAlign: 'center' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px', marginTop: '0' },
  question: { fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '6px' },
  subtitle: { fontSize: '13px', color: '#6b7280', marginBottom: '24px', marginTop: '0' },
  buttonGroup: { display: 'flex', gap: '12px', marginBottom: '20px' },
  cancelButton: { ...button, color: '#374151', backgroundColor: '#ffffff', border: '1px solid #d1d5db', cursor: 'pointer' },
  confirmButton: { ...button, color: '#ffffff', border: 'none' },
  footerText: { fontSize: '12px', color: '#9ca3af', margin: 0 },
};