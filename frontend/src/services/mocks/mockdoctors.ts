// services/mocks/mockdoctors.ts
// Giả lập API-06 (featured), API-07 (danh sách + lọc chuyên khoa), API-08 (lịch trống).
// Logic sinh slot copy từ backend/controllers/doctorCatalog.controller.js.
// Sprint 3: slot "đã đặt" đọc từ kho lịch hẹn (mockstore) thay cho danh sách cố định,
// nên đặt lịch xong khung giờ đó tự đổi available=false.

import { ApiError } from '../apierror';
import type { Doctor, ScheduleResult } from '../../types';
import { MOCK_DOCTORS, MOCK_SCHEDULES, MockScheduleBlock } from './mockdata';
import { isSlotTaken } from './mockstore';
import { delay, flag, getTodayInVietnam } from './mockutils';
import { isRealDate, toMinutes, toTime } from '../../utils/schedule';

const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';

const toPublic = ({ id, full_name, specialty, avatar_url, bio }: Doctor): Doctor => ({
  id, full_name, specialty, avatar_url, bio,
});

const generateSlots = (block: MockScheduleBlock): { start: string; end: string }[] => {
  const step = block.slot_minutes > 0 ? block.slot_minutes : 30;
  const slots: { start: string; end: string }[] = [];
  for (let t = toMinutes(block.start_time); t < toMinutes(block.end_time); t += step) {
    slots.push({ start: toTime(t), end: toTime(t + step) });
  }
  return slots;
};

// Các khung giờ làm việc của 1 bác sĩ trong 1 ngày (CHƯA trừ khung đã đặt).
// mockappointments dùng hàm này để kiểm tra lỗi SLOT_NOT_IN_SCHEDULE.
export const getDaySlots = (doctorId: string | number, day: string) => {
  const dayOfWeek = new Date(`${day}T00:00:00Z`).getUTCDay();
  return MOCK_SCHEDULES.filter((b) => String(b.doctor_id) === String(doctorId) && b.day_of_week === dayOfWeek)
    .flatMap(generateSlots)
    .sort((a, b) => a.start.localeCompare(b.start));
};

// Tester bật localStorage mock_error_500 = '1' để thử nhánh lỗi 500
const maybeFail = () => {
  if (flag('mock_error_500')) throw new ApiError(500, SERVER_ERROR);
};

export const mockGetFeatured = async (): Promise<Doctor[]> => {
  await delay();
  maybeFail();
  return MOCK_DOCTORS.filter((d) => d.is_featured && d.is_active).map(toPublic);
};

export const mockGetDoctors = async (specialty?: string): Promise<Doctor[]> => {
  await delay();
  maybeFail();
  const keyword = (specialty ?? '').trim().toLowerCase();
  return MOCK_DOCTORS.filter((d) => d.is_active && (!keyword || d.specialty.toLowerCase().includes(keyword)))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))
    .map(toPublic);
};

export const mockGetSchedule = async (doctorId: string | number, date?: string): Promise<ScheduleResult> => {
  await delay(150, 400);
  const day = date || getTodayInVietnam();
  // Lệch #7: kiểm tra ngày có thật, '2026-13-45' bị chặn
  if (!isRealDate(day)) throw new ApiError(400, 'Ngày không hợp lệ, định dạng đúng là YYYY-MM-DD');

  const doctor = MOCK_DOCTORS.find((d) => String(d.id) === String(doctorId) && d.is_active);
  if (!doctor) throw new ApiError(404, 'Không tìm thấy bác sĩ');

  const slots = getDaySlots(doctor.id, day).map(({ start }) => ({
    time: start,
    available: !isSlotTaken(doctor.id, day, start),
  }));

  return { doctor: { id: doctor.id, full_name: doctor.full_name, specialty: doctor.specialty }, date: day, slots };
};