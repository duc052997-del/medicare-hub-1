// controllers/doctor.controller.js
// Xu ly phan "bac si noi bat" cua UC005 - Xem danh sach bac si va lich trong.
// Sprint 2 chi lam phan hien thi noi bat o trang chu; danh sach day du +
// xem lich trong theo tung bac si se lam o task rieng trong cung sprint.

const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');

// GET /api/doctors/featured - lay danh sach bac si noi bat (UC005, buoc 2)
const getFeaturedDoctors = async (req, res) => {
  try {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select('id, full_name, specialty, avatar_url, bio')
      .eq('is_featured', true)
      .eq('is_active', true) // bac si bi soft-delete (is_active = false) khong hien thi
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Luong thay the 2a/4a (UC005): chua co danh sach bac si
    if (!doctors || doctors.length === 0) {
      return success(res, 200, 'Chưa có danh sách bác sĩ', { doctors: [] });
    }

    return success(res, 200, 'Lấy danh sách bác sĩ nổi bật thành công', { doctors });
  } catch (error) {
    return serverError(res, 'doctor.getFeaturedDoctors', error);
  }
};

module.exports = { getFeaturedDoctors };
