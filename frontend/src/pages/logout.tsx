import React, { useState } from 'react';

interface LogoutProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function Logout({ isOpen, onClose, onConfirm }: LogoutProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // GỌI API ĐẾN BACKEND (UC003) kèm token để đưa vào tokenBlacklist
      await fetch('http://localhost:5000/api/auth/logout', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Xóa toàn bộ thông tin phiên đăng nhập ở client
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');

      onConfirm();
    } catch (err) {
      console.error('Đăng xuất thất bại', err);
      // Vẫn tiến hành xóa cache ở client dù mất kết nối mạng
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>Xác nhận đăng xuất</h2>
        
        <p style={styles.question}>
          Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?
        </p>
        <p style={styles.subtitle}>
          Phiên đăng nhập hiện tại sẽ kết thúc.
        </p>

        <div style={styles.buttonGroup}>
          <button 
            type="button" 
            onClick={onClose} 
            style={styles.cancelButton}
            disabled={loading}
          >
            Hủy
          </button>
          <button 
            type="button" 
            onClick={handleLogout} 
            style={{
              ...styles.confirmButton,
              backgroundColor: loading ? '#9ca3af' : '#111827',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Đăng xuất'}
          </button>
        </div>

        <p style={styles.footerText}>
          Bạn sẽ được chuyển về trang đăng nhập sau khi xác nhận
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: '16px',
    marginTop: '0',
  },
  question: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '24px',
    marginTop: '0',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  confirmButton: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
};