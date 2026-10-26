// utils/usesyncprofile.ts
// UC009: lấy ảnh đại diện + tên/email mới nhất từ hồ sơ về phiên đăng nhập để Header/menu hiển thị (API-03 /auth/me không trả ảnh).
// Chạy mỗi khi người dùng đổi (đăng nhập, mở lại trang, lưu hồ sơ); chỉ ghi lại khi ảnh/tên khác để không lặp vô hạn.
// Lỗi mạng/BE chưa có API hồ sơ / Admin chưa có bản ghi patients (404) thì bỏ qua: Header vẫn hiện chữ cái đầu như cũ.
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
        setUser((u) => {
          if (!u || u.id !== user.id) return u;
          const nextUsername = p.full_name ?? u.username;
          const nextAvatar = p.avatar_url ?? undefined;
          const same =
            (u.username ?? null) === (nextUsername ?? null) &&
            u.email === p.email &&
            (u.avatar_url ?? undefined) === nextAvatar;
          return same ? u : { ...u, username: nextUsername, email: p.email, avatar_url: nextAvatar };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, setUser]);
}
