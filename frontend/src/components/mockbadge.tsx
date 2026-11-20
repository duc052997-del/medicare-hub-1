import React from 'react';
import { env } from '../config/env';

// Nhãn nhỏ góc trái dưới khi đang chạy dữ liệu giả, để Tester biết mình đang test mock hay BE thật.
// Bấm vào nhãn để xóa dữ liệu mock (tài khoản đã đăng ký, phiên đăng nhập) và tải lại trang.
export default function MockBadge() {
  if (!env.USE_MOCK) return null;

  const reset = () => {
    if (!window.confirm('Xóa dữ liệu mock (tài khoản đã đăng ký, phiên đăng nhập) và tải lại trang?')) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('mock_'))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    window.location.reload();
  };

  const style: React.CSSProperties = {
    position: 'fixed',
    left: 12,
    bottom: 12,
    zIndex: 2000,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: 999,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,.12)',
  };

  return (
    <div style={style} onClick={reset} title="Đang dùng dữ liệu giả. Bấm để reset dữ liệu mock.">
      🧪 MOCK MODE
    </div>
  );
}
