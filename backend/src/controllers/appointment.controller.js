
/**
 * UC007 - Xem lịch sử đặt lịch của bệnh nhân đang đăng nhập.
 * GET /api/appointments/my
 */

const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');

const VALID_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
]);

const getMyAppointments = async (req, res) => {
  try {
    const { status } = req.query;

    // Kiểm tra trạng thái hợp lệ
    if (
      status !== undefined &&
      (typeof status !== 'string' || !VALID_STATUSES.has(status))
    ) {
      return fail(res, 400, 'Trạng thái không hợp lệ');
    }

    // JWT chứa users.id, cần tìm patients.id tương ứng
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (patientError) {
      throw patientError;
    }

    // Bệnh nhân chưa có hồ sơ
    if (!patient) {
      return success(
        res,
        200,
        'Bạn chưa có lịch sử đặt lịch khám',
        { appointments: [] }
      );
    }

    // Chỉ truy vấn lịch hẹn của bệnh nhân đăng nhập
    let query = supabase
      .from('appointments')
      .select(
        'id, appointment_date, start_time, end_time, symptoms, status, cancel_reason, created_at, doctor:doctors(id, full_name, specialty)'
      )
      .eq('patient_id', patient.id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    // Lọc theo trạng thái nếu được cung cấp
    if (status !== undefined) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {
      throw error;
    }

    // Chưa có lịch sử đặt lịch
    if (!appointments || appointments.length === 0) {
      return success(
        res,
        200,
        'Bạn chưa có lịch sử đặt lịch khám',
        { appointments: [] }
      );
    }

    return success(
      res,
      200,
      'Lấy lịch sử đặt lịch thành công',
      { appointments }
    );
  } catch (error) {
    return serverError(
      res,
      'UC007 - getMyAppointments',
      error
    );
  }
};

module.exports = {
  getMyAppointments,
};
