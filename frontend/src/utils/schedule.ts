// utils/schedule.ts
// Xử lý khung giờ: đổi giờ <-> phút, gom khung giờ thành ca làm việc.
// Dùng cho trang Bác sĩ và mock (mockdoctors).

import type { Slot } from '../types';

export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const toTime = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

export interface Shift {
  label: string;
  start: string;
  end: string;
  availableCount: number; // số khung giờ còn trống
}

// Backend chỉ trả danh sách khung giờ, không trả tên ca nên FE chia theo buổi.
const SHIFT_DEFS = [
  { label: 'Ca sáng', from: 0, to: 12 * 60 },
  { label: 'Ca chiều', from: 12 * 60, to: 18 * 60 },
  { label: 'Ca tối', from: 18 * 60, to: 24 * 60 },
];

const DEFAULT_STEP = 30; // phút, trùng mặc định của backend

// Độ dài 1 khung = khoảng cách nhỏ nhất giữa 2 khung liền kề
const detectStep = (minutes: number[]) => {
  const diffs = minutes.slice(1).map((v, i) => v - minutes[i]).filter((d) => d > 0);
  return diffs.length ? Math.min(...diffs) : DEFAULT_STEP;
};

export const buildShifts = (slots: Slot[]): Shift[] => {
  if (!slots.length) return [];
  const sorted = [...slots].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const globalStep = detectStep(sorted.map((s) => toMinutes(s.time)));

  return SHIFT_DEFS.flatMap(({ label, from, to }) => {
    const inShift = sorted.filter((s) => {
      const m = toMinutes(s.time);
      return m >= from && m < to;
    });
    if (!inShift.length) return [];

    const mins = inShift.map((s) => toMinutes(s.time));
    const step = mins.length > 1 ? detectStep(mins) : globalStep;
    return [
      {
        label,
        start: toTime(mins[0]),
        end: toTime(mins[mins.length - 1] + step), // khung cuối + độ dài 1 khung
        availableCount: inShift.filter((s) => s.available).length,
      },
    ];
  });
};

// ---------- Ngày/giờ theo giờ Việt Nam (UTC+7), dùng cho đặt lịch ----------
const vietnamNow = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
export const todayVN = () => vietnamNow().slice(0, 10); // YYYY-MM-DD
export const timeNowVN = () => vietnamNow().slice(11, 16); // HH:mm

// Đúng định dạng VÀ là ngày có thật: '2026-13-45', '2026-02-30' -> false (Lệch #7 trong hợp đồng)
export const isRealDate = (day: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
};