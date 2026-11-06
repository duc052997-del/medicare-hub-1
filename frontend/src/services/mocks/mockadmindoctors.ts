// services/mocks/mockadmindoctors.ts — Giả lập API-15 … API-19 (UC010 Admin).
// Kho riêng localStorage, không sửa MOCK_DOCTORS công khai.

import { ApiError } from '../apierror';
import type { AdminDoctor, AdminDoctorListParams, AdminDoctorPayload, DoctorSchedule } from '../../types/admindoctor';
import { MOCK_DOCTORS, MOCK_SCHEDULES } from './mockdata';
import { loadAppointments } from './mockstore';
import { delay, flag } from './mockutils';
import { mockCurrentUser } from './mockauth';
import { EMAIL_REGEX, PHONE_REGEX } from '../../utils/profileform';
import { toMinutes } from '../../utils/schedule';

const KEY = 'mock_admin_doctors';
const FORBIDDEN = 'Bạn không có quyền truy cập chức năng này';
const NOT_FOUND = 'Không tìm thấy bác sĩ';
const INVALID = 'Thông tin không hợp lệ';
const SERVER_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';

const EMAILS: Record<string, string> = {
  'BS. Phạm Minh Đức': 'duc@medicare.test',
  'BS. Hoàng Thu Hà': 'ha@medicare.test',
  'BS. Vũ Quang Huy': 'huy@medicare.test',
  'BS. Đặng Mai Lan': 'lan@medicare.test',
  'BS. Bùi Anh Tuấn': 'tuan@medicare.test',
  'BS. Ngô Thanh Mai': 'mai@medicare.test',
  'BS. Lý Văn Nam': 'nam@medicare.test',
};
const PHONES: Record<string, string> = {
  'BS. Phạm Minh Đức': '0944444441',
  'BS. Hoàng Thu Hà': '0944444442',
  'BS. Vũ Quang Huy': '0944444443',
  'BS. Đặng Mai Lan': '0944444444',
  'BS. Bùi Anh Tuấn': '0944444445',
  'BS. Ngô Thanh Mai': '0944444446',
  'BS. Lý Văn Nam': '0944444447',
};

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const seedSchedules = (doctorId: string | number): DoctorSchedule[] =>
  MOCK_SCHEDULES.filter((s) => String(s.doctor_id) === String(doctorId)).map((s, i) => ({
    id: uid(5000 + i + Number(String(doctorId).slice(-4) || 0)),
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    slot_minutes: s.slot_minutes,
    valid_from: null,
    valid_to: null,
  }));

const buildSeed = (): AdminDoctor[] =>
  MOCK_DOCTORS.map((d) => ({
    id: String(d.id),
    full_name: d.full_name,
    specialty: d.specialty,
    email: EMAILS[d.full_name] ?? `${String(d.id).slice(-4)}@medicare.test`,
    phone: PHONES[d.full_name] ?? '0900000000',
    avatar_url: d.avatar_url,
    bio: d.bio,
    is_featured: d.is_featured,
    is_active: d.is_active,
    schedules: d.is_active ? seedSchedules(d.id) : [],
  }));

let memory: AdminDoctor[] | null = null;

const load = (): AdminDoctor[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AdminDoctor[];
    const seed = buildSeed();
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return (memory ??= buildSeed());
  }
};

const save = (list: AdminDoctor[]) => {
  memory = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* bỏ qua */
  }
  // Báo phía user (danh sách / đặt lịch) biết kho bác sĩ đã đổi
  try {
    window.dispatchEvent(new CustomEvent('mh-doctors-catalog-changed'));
  } catch {
    /* non-browser */
  }
};

/**
 * Catalog công khai (UC005/006/007 mock): cùng nguồn với Admin UC010.
 * Thêm/sửa/ngừng ở Admin → list & lịch phía user đọc qua các hàm này.
 */
export const getCatalogDoctors = (): Array<{
  id: string;
  full_name: string;
  specialty: string;
  avatar_url: string | null;
  bio: string | null;
  is_featured: boolean;
  is_active: boolean;
}> =>
  load().map((d) => ({
    id: String(d.id),
    full_name: d.full_name,
    specialty: d.specialty,
    avatar_url: d.avatar_url,
    bio: d.bio,
    is_featured: d.is_featured,
    is_active: d.is_active,
  }));

/** Khung giờ trong ngày (đã lọc valid_from / valid_to), chưa trừ slot đã đặt */
export const getCatalogDaySlots = (
  doctorId: string | number,
  dayYmd: string
): { start: string; end: string }[] => {
  const doc = load().find((d) => String(d.id) === String(doctorId) && d.is_active);
  if (!doc) return [];
  const dayOfWeek = new Date(`${dayYmd}T00:00:00Z`).getUTCDay();
  const blocks = (doc.schedules ?? []).filter((s) => {
    if (s.day_of_week !== dayOfWeek) return false;
    const from = s.valid_from?.trim() || null;
    const to = s.valid_to?.trim() || null;
    if (from && dayYmd < from) return false;
    if (to && dayYmd > to) return false;
    return true;
  });
  const out: { start: string; end: string }[] = [];
  for (const b of blocks) {
    const step = b.slot_minutes > 0 ? b.slot_minutes : 30;
    const startM = toMinutes(b.start_time.slice(0, 5));
    const endM = toMinutes(b.end_time.slice(0, 5));
    for (let t = startM; t < endM; t += step) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');
      const eh = String(Math.floor((t + step) / 60)).padStart(2, '0');
      const em = String((t + step) % 60).padStart(2, '0');
      out.push({ start: `${hh}:${mm}`, end: `${eh}:${em}` });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
};

const requireAdmin = () => {
  if (flag('mock_error_500')) throw new ApiError(500, SERVER_ERROR);
  const user = mockCurrentUser();
  if (user.role !== 'ADMIN') throw new ApiError(403, FORBIDDEN);
  return user;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const mins = toMinutes;

const validate = (b: AdminDoctorPayload): string | null => {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return 'body';
  for (const k of ['full_name', 'specialty', 'email', 'phone'] as const) {
    if (typeof b[k] !== 'string' || !b[k].trim()) return k;
  }
  if (!EMAIL_REGEX.test(b.email.trim())) return 'email';
  if (!PHONE_REGEX.test(b.phone.trim())) return 'phone';
  if (b.is_featured !== undefined && typeof b.is_featured !== 'boolean') return 'is_featured';
  if (b.avatar_url != null && typeof b.avatar_url !== 'string') return 'avatar_url';
  if (b.bio != null && typeof b.bio !== 'string') return 'bio';
  if (b.schedules !== undefined) {
    if (!Array.isArray(b.schedules)) return 'schedules';
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    for (const s of b.schedules) {
      if (
        !s ||
        !Number.isInteger(s.day_of_week) ||
        s.day_of_week < 0 ||
        s.day_of_week > 6 ||
        !TIME_RE.test(s.start_time) ||
        !TIME_RE.test(s.end_time) ||
        !Number.isInteger(s.slot_minutes) ||
        s.slot_minutes <= 0 ||
        mins(s.end_time) <= mins(s.start_time) ||
        s.slot_minutes > mins(s.end_time) - mins(s.start_time)
      ) {
        return 'schedules';
      }
      const from = s.valid_from == null || s.valid_from === '' ? null : String(s.valid_from);
      const to = s.valid_to == null || s.valid_to === '' ? null : String(s.valid_to);
      if (from && !DATE_RE.test(from)) return 'schedules';
      if (to && !DATE_RE.test(to)) return 'schedules';
      if (from && to && from > to) return 'schedules';
    }
    // Trùng giờ chỉ lỗi khi cùng thứ VÀ khoảng hiệu lực giao nhau
    const rangesOverlap = (
      aFrom: string | null | undefined,
      aTo: string | null | undefined,
      bFrom: string | null | undefined,
      bTo: string | null | undefined
    ) => {
      const af = aFrom?.trim() || '0000-01-01';
      const at = aTo?.trim() || '9999-12-31';
      const bf = bFrom?.trim() || '0000-01-01';
      const bt = bTo?.trim() || '9999-12-31';
      return af <= bt && bf <= at;
    };
    for (let i = 0; i < b.schedules.length; i++) {
      for (let j = i + 1; j < b.schedules.length; j++) {
        const a = b.schedules[i];
        const c = b.schedules[j];
        if (
          a.day_of_week === c.day_of_week &&
          a.start_time < c.end_time &&
          c.start_time < a.end_time &&
          rangesOverlap(a.valid_from, a.valid_to, c.valid_from, c.valid_to)
        ) {
          return 'schedules';
        }
      }
    }
  }
  return null;
};

const toPayloadDoctor = (b: AdminDoctorPayload, id: string, is_active: boolean): AdminDoctor => ({
  id,
  full_name: b.full_name.trim(),
  specialty: b.specialty.trim(),
  email: b.email.trim().toLowerCase(),
  phone: b.phone.trim(),
  avatar_url: b.avatar_url ?? null,
  bio: b.bio ?? null,
  is_featured: b.is_featured ?? false,
  is_active,
  schedules: (b.schedules ?? []).map((s, i) => ({
    id: uid(6000 + i),
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    slot_minutes: s.slot_minutes,
    valid_from: s.valid_from?.trim() ? s.valid_from.trim() : null,
    valid_to: s.valid_to?.trim() ? s.valid_to.trim() : null,
  })),
});

export const mockList = async (params: AdminDoctorListParams = {}): Promise<AdminDoctor[]> => {
  await delay();
  requireAdmin();
  let list = load();
  if (!params.include_inactive) list = list.filter((d) => d.is_active);
  const q = params.q?.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (d) => d.full_name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q) || d.phone.includes(q)
    );
  }
  return list
    .slice()
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi') || a.id.localeCompare(b.id))
    .map(({ schedules: _s, ...rest }) => rest);
};

export const mockDetail = async (id: string): Promise<AdminDoctor> => {
  await delay();
  requireAdmin();
  const found = load().find((d) => d.id === id);
  if (!found) throw new ApiError(404, NOT_FOUND);
  return {
    ...found,
    schedules: (found.schedules ?? []).map((s) => ({
      ...s,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
    })),
  };
};

export const mockCreate = async (
  payload: AdminDoctorPayload
): Promise<{ message: string; doctor: AdminDoctor }> => {
  await delay();
  requireAdmin();
  const field = validate(payload);
  if (field) throw new ApiError(400, INVALID, undefined, field);
  const email = payload.email.trim().toLowerCase();
  const list = load();
  if (list.some((d) => d.email === email)) throw new ApiError(409, 'Email bác sĩ đã tồn tại', undefined, 'email');
  const doctor = toPayloadDoctor(payload, uid(3000 + list.length + 1), true);
  save([...list, doctor]);
  return { message: 'Thêm bác sĩ thành công', doctor };
};

export const mockUpdate = async (
  id: string,
  payload: AdminDoctorPayload
): Promise<{ message: string; doctor: AdminDoctor }> => {
  await delay();
  requireAdmin();
  const field = validate(payload);
  if (field) throw new ApiError(400, INVALID, undefined, field);
  const list = load();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) throw new ApiError(404, NOT_FOUND);
  const email = payload.email.trim().toLowerCase();
  if (list.some((d) => d.email === email && d.id !== id)) {
    throw new ApiError(409, 'Email bác sĩ đã tồn tại', undefined, 'email');
  }
  const prev = list[idx];
  const doctor = toPayloadDoctor(payload, id, prev.is_active);
  if (payload.schedules === undefined) doctor.schedules = prev.schedules ?? [];
  const next = list.slice();
  next[idx] = doctor;
  save(next);
  return { message: 'Cập nhật bác sĩ thành công', doctor };
};

/** soft = ngừng; hard = xóa hẳn khỏi kho (chỉ khi đã is_active=false hoặc hard=true) */
export const mockRemove = async (
  id: string,
  opts?: { hard?: boolean }
): Promise<{ message: string }> => {
  await delay();
  requireAdmin();
  const list = load();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) throw new ApiError(404, NOT_FOUND);
  const doc = list[idx];
  const holding = loadAppointments().some(
    (a) => String(a.doctor_id) === String(id) && (a.status === 'PENDING' || a.status === 'CONFIRMED')
  );
  if (holding) throw new ApiError(409, 'Bác sĩ còn lịch hẹn chưa hoàn tất', 'FUTURE_APPOINTMENTS');

  // Xóa triệt để: bác sĩ đã ngừng, hoặc gọi kèm hard
  if (opts?.hard || !doc.is_active) {
    const next = list.filter((d) => d.id !== id);
    save(next);
    return { message: 'Đã xóa triệt để bác sĩ' };
  }

  // Lần 1: soft delete
  const next = list.slice();
  next[idx] = { ...doc, is_active: false };
  save(next);
  return { message: 'Đã ngừng hoạt động bác sĩ' };
};

export const mockReactivate = async (
  id: string
): Promise<{ message: string; doctor: AdminDoctor }> => {
  await delay();
  requireAdmin();
  const list = load();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) throw new ApiError(404, NOT_FOUND);
  if (list[idx].is_active) {
    return { message: 'Bác sĩ đang hoạt động', doctor: list[idx] };
  }
  const next = list.slice();
  next[idx] = { ...next[idx], is_active: true };
  save(next);
  return { message: 'Đã kích hoạt lại bác sĩ', doctor: next[idx] };
};
