// controllers/home.controller.js
// Xu ly UC004 - Xem trang chu: tra thong tin gioi thieu phong kham.

const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');

// GET /api/home - lay thong tin gioi thieu phong kham (UC004, buoc 2)
const getClinicIntro = async (req, res) => {
  try {
    const { data: clinic, error } = await supabase
      .from('clinic_info')
      .select('id, name, description, hotline, address, email, working_hours')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    // Luong thay the (UC004): khong tim thay trang chu / chua co du lieu gioi thieu
    if (!clinic) {
      return fail(res, 404, 'Chưa có thông tin giới thiệu phòng khám');
    }

    return success(res, 200, 'Lấy thông tin phòng khám thành công', { clinic });
  } catch (error) {
    return serverError(res, 'home.getClinicIntro', error);
  }
};

module.exports = { getClinicIntro };
