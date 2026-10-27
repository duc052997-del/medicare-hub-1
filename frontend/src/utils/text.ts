// utils/text.ts
// Bỏ dấu + chữ thường để gõ "tim mach" vẫn khớp "Tim mạch", "duc" khớp "Đức".
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();