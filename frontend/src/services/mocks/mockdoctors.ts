// services/mocks/mockdoctors.ts
// Giả lập API-06 (featured), API-07 (danh sách + lọc chuyên khoa), API-08 (lịch trống).
// Nguồn bác sĩ/lịch: cùng kho Admin UC010 (mockadmindoctors) → Admin thêm/sửa/ngừng sẽ hiện phía user.

import { ApiError } from '../apierror';
import type { Doctor, ScheduleResult } from '../../types';
import { isSlotTaken } from './mockstore';
import { delay, flag, getTodayInVietnam } from './mockutils';
import { isRealDate } from '../../utils/schedule';
import { getCatalogDaySlots, getCatalogDoctors } from './mockadmindoctors';

const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';

const toPublic = (d: {
  id: string;
  full_name: string;
  specialty: string;
  avatar_url: string | null;
  bio: string | null;
}): Doctor => ({
  id: d.id,
  full_name: d.full_name,
  specialty: d.specialty,
  avatar_url: d.avatar_url,
  bio: d.bio,
});

// Các khung giờ làm việc của 1 bác sĩ trong 1 ngày (CHƯA trừ khung đã đặt).
// mockappointments dùng hàm này để kiểm tra lỗi SLOT_NOT_IN_SCHEDULE.
export const getDaySlots = (doctorId: string | number, day: string) => getCatalogDaySlots(doctorId, day);

const maybeFail = () => {
  if (flag('mock_error_500')) throw new ApiError(500, SERVER_ERROR);
};

export const mockGetFeatured = async (): Promise<Doctor[]> => {
  await delay();
  maybeFail();
  return getCatalogDoctors()
    .filter((d) => d.is_featured && d.is_active)
    .map(toPublic);
};

export const mockGetDoctors = async (specialty?: string): Promise<Doctor[]> => {
  await delay();
  maybeFail();
  const keyword = (specialty ?? '').trim().toLowerCase();
  return getCatalogDoctors()
    .filter((d) => d.is_active && (!keyword || d.specialty.toLowerCase().includes(keyword)))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))
    .map(toPublic);
};

export const mockGetSchedule = async (doctorId: string | number, date?: string): Promise<ScheduleResult> => {
  await delay(150, 400);
  const day = date || getTodayInVietnam();
  if (!isRealDate(day)) throw new ApiError(400, 'Ngày không hợp lệ, định dạng đúng là YYYY-MM-DD');

  const doctor = getCatalogDoctors().find((d) => String(d.id) === String(doctorId) && d.is_active);
  if (!doctor) throw new ApiError(404, 'Không tìm thấy bác sĩ');

  const slots = getDaySlots(doctor.id, day).map(({ start }) => ({
    time: start,
    available: !isSlotTaken(doctor.id, day, start),
  }));

  return { doctor: { id: doctor.id, full_name: doctor.full_name, specialty: doctor.specialty }, date: day, slots };
};
