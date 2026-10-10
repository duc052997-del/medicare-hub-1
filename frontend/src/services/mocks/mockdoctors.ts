// services/mocks/mockdoctors.ts
// Giả lập API-06 (featured), API-07 (danh sách + lọc chuyên khoa), API-08 (lịch trống).
// Logic sinh slot copy từ backend/controllers/doctorCatalog.controller.js.

import { ApiError } from '../apierror';
import type { Doctor, ScheduleResult } from '../../types';
import { MOCK_BOOKED_SLOTS, MOCK_DOCTORS, MOCK_SCHEDULES, MockScheduleBlock } from './mockdata';
import { delay, flag, getTodayInVietnam } from './mockutils';
import { toMinutes, toTime } from '../../utils/schedule';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';

const toPublic = ({ id, full_name, specialty, avatar_url, bio }: Doctor): Doctor => ({
  id, full_name, specialty, avatar_url, bio,
});

const generateSlots = (block: MockScheduleBlock): string[] => {
  const step = block.slot_minutes > 0 ? block.slot_minutes : 30;
  const times: string[] = [];
  for (let t = toMinutes(block.start_time); t < toMinutes(block.end_time); t += step) times.push(toTime(t));
  return times;
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
  if (!DATE_REGEX.test(day)) throw new ApiError(400, 'Ngày không hợp lệ, định dạng đúng là YYYY-MM-DD');

  const doctor = MOCK_DOCTORS.find((d) => String(d.id) === String(doctorId) && d.is_active);
  if (!doctor) throw new ApiError(404, 'Không tìm thấy bác sĩ');

  const dayOfWeek = new Date(`${day}T00:00:00Z`).getUTCDay();
  const times = MOCK_SCHEDULES.filter((b) => b.doctor_id === doctor.id && b.day_of_week === dayOfWeek)
    .flatMap(generateSlots)
    .sort();

  const slots = times.map((time) => ({
    time,
    available: !MOCK_BOOKED_SLOTS.some(
      (b) => b.doctor_id === doctor.id && b.appointment_date === day && b.start_time === time
    ),
  }));

  return { doctor: { id: doctor.id, full_name: doctor.full_name, specialty: doctor.specialty }, date: day, slots };
};