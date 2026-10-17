// controllers/doctorCatalog.controller.js
// [UC005-BE] Danh sách bác sĩ (lọc theo chuyên khoa) + lịch trống theo bác sĩ.
// Tách riêng file này (không gộp vào doctor.controller.js của đồng đội -
// file đó chỉ lo phần "bác sĩ nổi bật" ở trang chủ) để tránh đụng code khi
// 2 người cùng làm trên bảng `doctors`.

const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');
const {
  UUID_REGEX,
  isValidCalendarDate,
  getTodayInVietnam,
  getDayOfWeek,
  generateSlotsFromBlock
} = require('../utils/schedule');

// Trạng thái lịch hẹn vẫn còn "chiếm chỗ" (xem Quy ước chung trong hợp đồng
// API) - chỉ các trạng thái này mới khóa khung giờ của bác sĩ.
const SLOT_TAKEN_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED'];

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

    // id sai định dạng (không phải UUID) thì báo lỗi rõ ràng 400, không để
    // Supabase ném lỗi database rồi rơi xuống thành lỗi hệ thống chung (500).
    if (!UUID_REGEX.test(id)) {
      return fail(res, 400, 'ID bác sĩ không hợp lệ');
    }

    if (!isValidCalendarDate(date)) {
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

    // [UC006-BE] Giờ đã có bảng appointments: lấy các khung giờ của đúng
    // bác sĩ + đúng ngày đang còn "chiếm chỗ" (PENDING/CONFIRMED/COMPLETED -
    // CANCELLED/REJECTED thì không tính), để đánh dấu available=false đúng
    // như mock UI (gạch chéo). Trước đây luôn trả available=true vì chưa có
    // bảng này.
    const { data: bookedRows, error: bookedError } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('doctor_id', id)
      .eq('appointment_date', date)
      .in('status', SLOT_TAKEN_STATUSES);
    if (bookedError) throw bookedError;

    const bookedTimes = new Set(
      (bookedRows || []).map((row) => row.start_time.slice(0, 5))
    );

    const slots = times.map((time) => ({
      time,
      available: !bookedTimes.has(time)
    }));

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