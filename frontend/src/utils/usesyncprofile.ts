// utils/usesyncprofile.ts
// UC009: lấy ảnh đại diện + tên/email mới nhất từ hồ sơ về phiên đăng nhập để Header/menu hiển thị (API-03 /auth/me không trả ảnh).
// Chạy mỗi khi người dùng đổi (đăng nhập, mở lại trang, lưu hồ sơ); chỉ ghi lại khi ảnh khác để không lặp vô hạn.
// Lỗi mạng/BE chưa có API hồ sơ thì bỏ qua: Header vẫn hiện chữ cái đầu như cũ.
import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { profileService } from '../services/profileservice';
import type { AuthUser } from '../types';

export function useSyncProfile(user: AuthUser | null, setUser: Dispatch<SetStateAction<AuthUser | null>>) {
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    profileService
      .getProfile()
      .then((p) => {
        if (cancelled || !p) return;
        const next = { 
          username: p.username, 
          email: p.email, 
          avatar_url: p.avatar_url ?? undefined // <--- Đổi thành undefined
        };
        setUser((u) => {
          if (!u || u.id !== user.id) return u;
          const same = 
            u.username === next.username && 
            u.email === next.email && 
            (u.avatar_url ?? undefined) === next.avatar_url; // <--- Đổi thành undefined
          return same ? u : { ...u, ...next };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, setUser]);
}