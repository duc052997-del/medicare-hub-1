// types/admindoctor.ts — UC010 Quản lý bác sĩ (Admin). Khớp API-15 … API-19.
// Lịch làm việc hướng B: thêm valid_from / valid_to (YYYY-MM-DD), null = không giới hạn.

export interface DoctorSchedule {
  id?: string;
  day_of_week: number; // 0=CN … 6=Thứ 7
  start_time: string; // HH:mm
  end_time: string;
  slot_minutes: number;
  /** Ngày bắt đầu hiệu lực (YYYY-MM-DD). null/'' = từ trước đến nay */
  valid_from?: string | null;
  /** Ngày kết thúc hiệu lực (YYYY-MM-DD). null/'' = vô thời hạn */
  valid_to?: string | null;
}

export interface AdminDoctor {
  id: string;
  full_name: string;
  specialty: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  bio: string | null;
  is_featured: boolean;
  is_active: boolean;
  schedules?: DoctorSchedule[];
}

/** Body POST/PUT /api/admin/doctors (API-17, API-18) — schedules mở rộng valid_from/to */
export interface AdminDoctorPayload {
  full_name: string;
  specialty: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_featured?: boolean;
  schedules?: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    slot_minutes: number;
    valid_from?: string | null;
    valid_to?: string | null;
  }>;
}

export interface AdminDoctorListParams {
  q?: string;
  include_inactive?: boolean;
}

/** Lọc lịch áp dụng cho một ngày YYYY-MM-DD (hướng B). */
export function schedulesForDate(schedules: DoctorSchedule[] | undefined, dateYmd: string): DoctorSchedule[] {
  if (!schedules?.length) return [];
  return schedules.filter((s) => {
    const from = s.valid_from?.trim() || null;
    const to = s.valid_to?.trim() || null;
    if (from && dateYmd < from) return false;
    if (to && dateYmd > to) return false;
    return true;
  });
}
