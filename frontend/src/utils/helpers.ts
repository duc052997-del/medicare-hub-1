// utils/helpers.ts
// Hàm dùng chung cho nhiều trang: nhãn vai trò, lấy ảnh trong assets, định dạng ngày.

const ROLE_LABELS: Record<string, string> = {
  PATIENT: 'người dùng',
  ADMIN: 'Quản trị viên'
};

export const getRoleLabel = (role?: string) =>
  role ? ROLE_LABELS[role.toUpperCase()] ?? role : '';

const assets = import.meta.glob('../assets/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

// getAsset('2') -> đường dẫn ảnh assets/2.(png|jpg|jpeg|webp), không có thì undefined
export const getAsset = (name: string): string | undefined =>
  ['png', 'jpg', 'jpeg', 'webp'].map((ext) => assets[`../assets/${name}.${ext}`]).find(Boolean);

// "2026-10-05" -> "05/10/2026"
export const formatDate = (iso: string) => iso.split('-').reverse().join('/');