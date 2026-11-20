// utils/adminappointment.ts
// UC011 (Admin): phần THUẦN (không React, không gọi API) của màn hình quản lý lịch hẹn:
// nhãn/màu trạng thái, đếm, lọc, sắp xếp, và QUY TẮC xử lý lịch (ai được bấm nút gì).
// "Hoàn tất" (API-27) cũng nằm ở đây như một hành động của lịch đã xác nhận, nhưng mở form kết luận + đơn thuốc.
import { formatDate } from './helpers';
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from './appointmentstatus';
import { timeNowVN, todayVN } from './schedule';
import { normalize } from './text';
import type { AppointmentStatus } from '../types';
import type { AdminAppointment, AdminAppointmentFilter, AdminRowAction, AdminStatusAction } from '../types/adminappointment';

// Nhãn/màu trạng thái dùng chung với phía bệnh nhân -> utils/appointmentstatus.ts (re-export để import cũ vẫn chạy)
export { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER };

export const EMPTY_FILTER: AdminAppointmentFilter = { keyword: '', status: '', doctorId: '', date: '' };

export const hasActiveFilter = (f: AdminAppointmentFilter) => !!(f.keyword.trim() || f.status || f.doctorId || f.date);

export const countByStatus = (list: AdminAppointment[]) => {
  const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<AppointmentStatus, number>;
  list.forEach((a) => (c[a.status] += 1));
  return c;
};

// Lọc phía client. Tìm kiếm không phân biệt dấu/hoa thường: "an" khớp "Nguyễn Văn An", "tim mach" khớp "Tim mạch".
export const filterAdminAppointments = (list: AdminAppointment[], f: AdminAppointmentFilter) => {
  const kw = normalize(f.keyword.trim());
  return list.filter((a) => {
    if (f.status && a.status !== f.status) return false;
    if (f.doctorId && String(a.doctor.id) !== f.doctorId) return false;
    if (f.date && a.appointment_date !== f.date) return false;
    if (!kw) return true;
    const haystack = normalize(
      [
        a.patient.full_name ?? '', a.patient.patient_code, a.patient.phone ?? '',
        a.doctor.full_name, a.doctor.specialty, a.symptoms ?? '',
        STATUS_LABEL[a.status], formatDate(a.appointment_date),
      ].join(' ')
    );
    return haystack.includes(kw);
  });
};

// "Còn xử lý": lịch chưa kết thúc (Chờ xác nhận, Đã xác nhận)
const OPEN: AppointmentStatus[] = ['PENDING', 'CONFIRMED'];
export const isOpenStatus = (status: AppointmentStatus) => OPEN.includes(status);

const when = (a: AdminAppointment) => `${a.appointment_date} ${a.start_time}`;

// Thứ tự hiển thị: lịch cần xử lý (Chờ xác nhận, rồi Đã xác nhận) lên đầu, giờ khám gần nhất trước;
// lịch đã kết thúc (Hoàn tất / Từ chối / Đã hủy) xuống dưới, mới nhất trước.
export const sortForAdmin = (list: AdminAppointment[]) =>
  [...list].sort((a, b) => {
    const openA = isOpenStatus(a.status);
    const openB = isOpenStatus(b.status);
    if (openA !== openB) return openA ? -1 : 1;
    if (openA) {
      if (a.status !== b.status) return a.status === 'PENDING' ? -1 : 1;
      return when(a).localeCompare(when(b));
    }
    return when(b).localeCompare(when(a));
  });

// ---------- Quy tắc xử lý lịch (khớp API-26) ----------
export const MAX_REASON = 255;

// Từ trạng thái nào, Admin được đưa sang trạng thái nào. Lịch đã kết thúc thì không còn nút nào.
// COMPLETED chỉ đi qua form hoàn tất (API-27), không đi qua API-26.
// Lịch đã Hoàn tất thì nút "Hoàn tất" được thay bằng nút "Bệnh án" (xem hồ sơ đã ghi, không sửa).
const ACTIONS_BY_STATUS: Partial<Record<AppointmentStatus, AdminRowAction[]>> = {
  PENDING: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['RECORD'],
};

export const getAdminActions = (a: AdminAppointment): AdminRowAction[] => ACTIONS_BY_STATUS[a.status] ?? [];

// Giờ bắt đầu của lịch đã qua (theo giờ Việt Nam)
export const isPastAppointment = (a: AdminAppointment) => when(a) <= `${todayVN()} ${timeNowVN()}`;

// Lý do không cho bấm (null = được bấm).
//  - Xác nhận: lịch chờ xác nhận mà đã quá giờ khám thì chỉ nên Từ chối.
//  - Hoàn tất: buổi khám phải đã bắt đầu mới kết luận được (chưa đến giờ thì chưa có gì để ghi hồ sơ).
export const getActionBlockReason = (a: AdminAppointment, action: AdminRowAction): string | null => {
  if (action === 'CONFIRMED' && isPastAppointment(a)) return 'Đã quá giờ khám, không thể xác nhận. Hãy từ chối lịch này.';
  if (action === 'COMPLETED' && !isPastAppointment(a)) return 'Chưa đến giờ khám, chưa thể hoàn tất lịch này.';
  return null;
};

export const COMPLETE_LABEL = 'Hoàn tất';
export const RECORD_LABEL = 'Bệnh án';

// Chữ trên nút ở hàng cho mọi hành động (3 hành động API-26 lấy từ ACTION_META)
export const getActionLabel = (action: AdminRowAction): string =>
  action === 'COMPLETED' ? COMPLETE_LABEL : action === 'RECORD' ? RECORD_LABEL : ACTION_META[action].label;

export interface ActionMeta {
  label: string; // chữ trên nút ở hàng
  title: string; // tiêu đề hộp thoại
  question: string;
  hint: string;
  reasonLabel?: string; // có = hộp thoại có ô nhập lý do
  reasonPlaceholder?: string;
  submitText: string;
  busyText: string;
  danger: boolean;
}

export const ACTION_META: Record<AdminStatusAction, ActionMeta> = {
  CONFIRMED: {
    label: 'Xác nhận',
    title: 'Xác nhận lịch hẹn',
    question: 'Xác nhận lịch khám này cho bệnh nhân?',
    hint: 'Lịch chuyển sang "Đã xác nhận"; bệnh nhân sẽ không tự hủy được nữa.',
    submitText: 'Xác nhận lịch',
    busyText: 'Đang xác nhận...',
    danger: false,
  },
  REJECTED: {
    label: 'Từ chối',
    title: 'Từ chối lịch hẹn',
    question: 'Bạn có chắc chắn muốn từ chối lịch khám này?',
    hint: 'Khung giờ được giải phóng cho bệnh nhân khác. Nên ghi lý do để bệnh nhân biết.',
    reasonLabel: 'Lý do từ chối (không bắt buộc, nên có)',
    reasonPlaceholder: 'Ví dụ: Bác sĩ nghỉ đột xuất, vui lòng chọn khung giờ khác',
    submitText: 'Từ chối lịch',
    busyText: 'Đang từ chối...',
    danger: true,
  },
  CANCELLED: {
    label: 'Hủy lịch',
    title: 'Hủy lịch hẹn',
    question: 'Bạn có chắc chắn muốn hủy lịch khám đã xác nhận này?',
    hint: 'Khung giờ được giải phóng. Lịch đã hủy không thể khôi phục.',
    reasonLabel: 'Lý do hủy (không bắt buộc)',
    reasonPlaceholder: 'Ví dụ: Bệnh nhân báo bận việc đột xuất',
    submitText: 'Xác nhận hủy',
    busyText: 'Đang hủy...',
    danger: true,
  },
};