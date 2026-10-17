// utils/schedule.js
// Các hằng số và hàm tính lịch làm việc dùng chung cho UC005 (xem lịch
// trống) và UC006 (đặt lịch khám), để 2 chỗ không viết trùng logic rồi lệch
// nhau dần theo thời gian.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm", 00:00-23:59
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Chỉ đúng định dạng YYYY-MM-DD thôi chưa đủ: "2026-13-45" cũng khớp regex
// trên nhưng tháng 13 / ngày 45 không có thật. new Date() của JS lại tự động
// "cuộn" ngày sai thành 1 ngày khác hợp lệ (không báo lỗi), nên phải tự kiểm
// tra lại xem ngày/tháng/năm dựng lại từ Date có khớp với số người dùng
// truyền vào hay không.
const isValidCalendarDate = (dateStr) => {
  if (!DATE_REGEX.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// Ngày hôm nay theo giờ Việt Nam (UTC+7), dùng làm mặc định khi FE không
// truyền ?date= - khớp với mock UI để sẵn "Ngày khám: Hôm nay".
const getTodayInVietnam = () => {
  const now = new Date();
  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const vnTime = new Date(now.getTime() + vnOffsetMs);
  return vnTime.toISOString().slice(0, 10); // "YYYY-MM-DD"
};

// Thu trong tuan cua 1 ngay (0 = Chu Nhat, 1 = Thu Hai, ..., 6 = Thu Bay).
// Dung mang UTC de ket qua on dinh, khong phu thuoc mui gio server dang chay.
const getDayOfWeek = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();

// "08:00:00" -> 480 (so phut tinh tu 00:00)
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// 480 -> "08:00"
const minutesToTime = (totalMinutes) => {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
};

// Sinh danh sach khung gio tu 1 dong lich lam viec (start_time -> end_time,
// buoc nhay la slot_minutes). VD 08:00-12:00, slot_minutes=30 ->
// 08:00, 08:30, 09:00, ..., 11:30 (khong bao gom chinh end_time).
const generateSlotsFromBlock = (block) => {
  const start = timeToMinutes(block.start_time);
  const end = timeToMinutes(block.end_time);
  const step = block.slot_minutes > 0 ? block.slot_minutes : 30;

  const times = [];
  for (let t = start; t < end; t += step) {
    times.push(minutesToTime(t));
  }
  return times;
};

// Tìm khối lịch làm việc (block) có chứa đúng khung giờ `time` được yêu cầu,
// và trả về luôn end_time của riêng khung giờ đó (start + slot_minutes của
// đúng block chứa nó - 1 bác sĩ có thể có nhiều block/ngày với slot_minutes
// khác nhau, vd sáng 30 phút/lượt, chiều 20 phút/lượt). Dùng cho UC006 khi
// đặt lịch, để biết appointment kết thúc lúc mấy giờ.
const findSlotInSchedule = (blocks, time) => {
  for (const block of blocks) {
    const slots = generateSlotsFromBlock(block);
    if (slots.includes(time)) {
      const endMinutes = timeToMinutes(time) + (block.slot_minutes > 0 ? block.slot_minutes : 30);
      return { time, end_time: minutesToTime(endMinutes) };
    }
  }
  return null;
};

module.exports = {
  DATE_REGEX,
  TIME_REGEX,
  UUID_REGEX,
  isValidCalendarDate,
  getTodayInVietnam,
  getDayOfWeek,
  timeToMinutes,
  minutesToTime,
  generateSlotsFromBlock,
  findSlotInSchedule
};