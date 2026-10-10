// controllers/doctorCatalog.controller.js
// [UC005-BE] Danh sách bác sĩ (lọc theo chuyên khoa) + lịch trống theo bác sĩ.
// Tách riêng file này (không gộp vào doctor.controller.js của đồng đội -
// file đó chỉ lo phần "bác sĩ nổi bật" ở trang chủ) để tránh đụng code khi
// 2 người cùng làm trên bảng `doctors`.

const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

// GET /api/doctors - danh sách đầy đủ, lọc theo chuyên khoa (UC005, bước 2)
// Query param tùy chọn: ?specialty=Noi+tong+quat
const getDoctors = async (req, res) => {
  try {
    const specialty = typeof req.query.specialty === 'string' ? req.query.specialty.trim() : '';

    let query = supabase
      .from('doctors')
      .select('id, full_name, specialty, avatar_url, bio')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    // Lọc gần đúng (không phân biệt hoa/thường) để khớp với cách người dùng
    // gõ vào dropdown chuyên khoa trên FE, không bắt buộc gõ đúng từng chữ hoa.
    if (specialty) {
      query = query.ilike('specialty', `%${specialty}%`);
    }

    const { data: doctors, error } = await query;
    if (error) throw error;

    // Luồng thay thế 2a: chưa có danh sách bác sĩ (hoặc không có bác sĩ nào
    // khớp với chuyên khoa đang lọc)
    if (!doctors || doctors.length === 0) {
      return success(res, 200, 'Chưa có danh sách bác sĩ', { doctors: [] });
    }

    return success(res, 200, 'Lấy danh sách bác sĩ thành công', { doctors });
  } catch (error) {
    return serverError(res, 'doctorCatalog.getDoctors', error);
  }
};

// GET /api/doctors/:id/schedule - lịch trống theo ngày/giờ của 1 bác sĩ
// (UC005, bước 3-4). Query param tùy chọn: ?date=YYYY-MM-DD (mặc định: hôm nay)
const getDoctorSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const date = req.query.date || getTodayInVietnam();

    if (!DATE_REGEX.test(date)) {
      return fail(res, 400, 'Ngày không hợp lệ, định dạng đúng là YYYY-MM-DD');
    }

    // Bác sĩ không tồn tại hoặc đã bị vô hiệu hóa -> coi như không tìm thấy
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, full_name, specialty')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();
    if (doctorError) throw doctorError;

    if (!doctor) {
      return fail(res, 404, 'Không tìm thấy bác sĩ');
    }

    // doctor_schedules la lich lam viec LAP LAI theo thu trong tuan (vd:
    // Thu Hai 08:00-12:00, slot 30 phut) - khong luu theo tung ngay cu the.
    // Tu ngay FE truyen len, tinh ra thu may trong tuan de tim dung cac
    // khoang gio lam viec cua bac si vao thu do.
    const dayOfWeek = getDayOfWeek(date);

    const { data: blocks, error: blocksError } = await supabase
      .from('doctor_schedules')
      .select('start_time, end_time, slot_minutes')
      .eq('doctor_id', id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .order('start_time', { ascending: true });
    if (blocksError) throw blocksError;

    // Luồng thay thế 3a: bác sĩ hiện không có lịch trống (thứ đó trong tuần
    // bác sĩ không làm việc, hoặc chưa được xếp lịch)
    if (!blocks || blocks.length === 0) {
      return success(res, 200, 'Bác sĩ hiện không có lịch trống', {
        doctor,
        date,
        slots: []
      });
    }

    // 1 ngay co the co nhieu khoang lam viec (vd sang + chieu), sinh het
    // slot tung khoang roi gop lai, sap theo thu tu thoi gian.
    const times = blocks.flatMap(generateSlotsFromBlock).sort();

    if (times.length === 0) {
      return success(res, 200, 'Bác sĩ hiện không có lịch trống', {
        doctor,
        date,
        slots: []
      });
    }

    // CHƯA CÓ bảng lịch hẹn đã đặt (appointments/bookings) trong hệ thống,
    // nên hiện tại KHÔNG xác định được khung giờ nào đã có người đặt - tất
    // cả slot sinh ra đều trả về available: true. Khi UC đặt lịch khám được
    // làm (có bảng appointments), chỗ này cần join thêm để set available
    // thành false cho khung giờ đã bị đặt, đúng như mock UI (gạch chéo).
    const slots = times.map((time) => ({ time, available: true }));

    return success(res, 200, 'Lấy lịch trống thành công', {
      doctor,
      date,
      slots
    });
  } catch (error) {
    return serverError(res, 'doctorCatalog.getDoctorSchedule', error);
  }
};

module.exports = { getDoctors, getDoctorSchedule };