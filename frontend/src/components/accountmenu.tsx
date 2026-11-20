// components/accountmenu.tsx — UC009: thanh tài khoản cá nhân, hiện ra khi rê chuột vào tài khoản trên Header.
// Dùng cho cả bệnh nhân và admin. Menu chỉ có 2 mục: Thông tin cá nhân và Đăng xuất.
// Hỗ trợ: rê chuột (có độ trễ nhỏ để không bị chớp), bàn phím (Tab, Esc), bấm/chạm (màn hình cảm ứng).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import SafeImage from './safeimage';
import { getRoleLabel } from '../utils/helpers';
import { layoutStyles as l } from '../styles/layout';
import type { AuthUser, NavHandlers } from '../types';

const CLOSE_DELAY_MS = 150;

interface AccountMenuProps {
  user: AuthUser;
  // onProfile: mở hộp thoại "Thông tin cá nhân" (UC009). Chưa có thì mục này tự ẩn.
  nav: NavHandlers & { onProfile?: () => void };
}

const Item = ({ icon, children, onClick, danger }: { icon: string; children: ReactNode; onClick: () => void; danger?: boolean }) => (
  <button type="button" role="menuitem" className={`mh-menu-item${danger ? ' mh-menu-item--danger' : ''}`} onClick={onClick} style={{ ...styles.item, ...(danger ? styles.itemDanger : {}) }}>
    <span style={styles.itemIcon}>{icon}</span>
    {children}
  </button>
);

export default function AccountMenu({ user, nav }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = user.username || user.email;
  const initial = displayName.charAt(0).toUpperCase();
  const avatar = user.avatar_url || undefined; // ảnh đại diện (UC009); không có thì hiện chữ cái đầu

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = () => {
    cancelClose();
    setOpen(true);
  };
  const hideSoon = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const go = useCallback((fn?: () => void) => () => {
    setOpen(false);
    fn?.();
  }, []);

  useEffect(() => cancelClose, []);

  // Esc để đóng; bấm ra ngoài để đóng (cho màn hình cảm ứng, nơi không có rê chuột)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      style={styles.root}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}
    >
      {/* Nút hiển thị trên Header: giữ đúng giao diện userBox cũ */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={show} // chỉ mở: trên cảm ứng, chạm sẽ bắn mouseenter rồi click, nếu đảo trạng thái thì menu mở xong bị đóng ngay
        onFocus={show}
        style={styles.trigger}
      >
        <SafeImage
          key={avatar ?? ''} // đổi ảnh thì dựng lại, để ảnh lỗi trước đó không chặn ảnh mới
          src={avatar}
          alt="Ảnh đại diện"
          style={styles.triggerImg}
          fallback={<div style={l.userAvatar}>{initial}</div>}
        />
        <div style={{ ...l.userInfo, textAlign: 'left' }}>
          <span style={l.userName}>{displayName}</span>
          <span style={l.roleBadge}>{getRoleLabel(user.role)}</span>
        </div>
        <span style={{ ...styles.caret, transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        // paddingTop tạo "cầu nối" để chuột đi từ nút xuống bảng không bị mất hover
        <div style={styles.bridge}>
          <div role="menu" aria-label="Tài khoản cá nhân" style={styles.panel}>
            <div style={styles.profile}>
              <SafeImage
                key={avatar ?? ''}
                src={avatar}
                alt="Ảnh đại diện"
                style={styles.bigImg}
                fallback={<div style={styles.bigAvatar}>{initial}</div>}
              />
              <div style={{ minWidth: 0 }}>
                <div style={styles.name}>{displayName}</div>
                <div style={styles.email}>{user.email}</div>
                <span style={l.roleBadge}>{getRoleLabel(user.role)}</span>
              </div>
            </div>

            {nav.onProfile && (
              <div style={styles.list}>
                <Item icon="👤" onClick={go(nav.onProfile)}>Thông tin cá nhân</Item>
              </div>
            )}

            <div style={{ ...styles.list, borderBottom: 'none' }}>
              <Item icon="🚪" danger onClick={go(nav.onLogout)}>Đăng xuất</Item>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: { position: 'relative' },
  trigger: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' },
  triggerImg: { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  bigImg: { width: 48, height: 48, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', border: '2px solid #dbeafe' },
  caret: { fontSize: 12, color: '#64748b', transition: 'transform .2s' },
  bridge: { position: 'absolute', top: '100%', right: 0, paddingTop: 8, zIndex: 100 },
  panel: { width: 280, backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: 14, boxShadow: '0 12px 32px rgba(15,23,42,.16)', overflow: 'hidden' },
  profile: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 14px', backgroundColor: '#f5faff', borderBottom: '1px solid #e2e8f0' },
  bigAvatar: { width: 48, height: 48, flexShrink: 0, borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: 20, background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  email: { fontSize: 12, color: '#64748b', margin: '2px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  list: { display: 'flex', flexDirection: 'column', padding: 6, borderBottom: '1px solid #f1f5f9' },
  item: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 600, color: '#334155', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
  itemDanger: { color: '#dc2626' },
  itemIcon: { width: 20, textAlign: 'center' },
};