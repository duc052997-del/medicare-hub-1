// utils/reschedule.ts
// UC011 (API-21): dựng danh sách khung giờ cho form ĐỔI LỊCH. Phần THUẦN, không React, không gọi API.
import { isSlotBookable, slotMinutes, slotOverlaps } from './schedule';
import type { Appointment, AppointmentStatus, Slot } from '../types';

export type RescheduleSlotState = 'free' | 'taken' | 'soon' | 'current';
export interface RescheduleSlot {
  time: string;
  state: RescheduleSlotState;
}

const HOLDING: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED'];

interface Input {
  slots: Slot[]; // API-08 của đúng bác sĩ đang có lịch, đúng ngày đã chọn
  date: string;
  current: Pick<Appointment, 'id' | 'appointment_date' | 'start_time'>; // lịch đang đổi
  mine: Appointment[]; // mọi lịch của bệnh nhân (API-10)
}

// - free: chọn được
// - taken: đã có người đặt
// - soon: không đủ thời gian đặt trước (cùng luật UC006: >= 24 giờ)
// - current: đúng khung giờ hiện tại của lịch này (không phải "đổi")
// Khung trùng giờ với LỊCH KHÁC của chính bệnh nhân thì bỏ hẳn khỏi danh sách (như khung đặt lịch UC006).
export const buildRescheduleSlots = ({ slots, date, current, mine }: Input): RescheduleSlot[] => {
  const step = slotMinutes(slots);
  const others = mine.filter((a) => a.id !== current.id && HOLDING.includes(a.status) && a.appointment_date === date);
  return slots
    .filter((s) => !others.some((a) => slotOverlaps(s.time, step, a)))
    .map((s): RescheduleSlot => {
      const isCurrent = date === current.appointment_date && s.time === current.start_time;
      const state: RescheduleSlotState = isCurrent ? 'current' : !s.available ? 'taken' : !isSlotBookable(date, s.time) ? 'soon' : 'free';
      return { time: s.time, state };
    });
};