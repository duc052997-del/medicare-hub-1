/**
 * UC006 - Đặt lịch khám (POST /api/appointments, hợp đồng API-09)
 * UC007 - Xem lịch sử đặt lịch của bệnh nhân đang đăng nhập (GET /api/appointments/my)
 */

const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');
const {
  UUID_REGEX,
  TIME_REGEX,
  isValidCalendarDate,
  getTodayInVietnam,
  getDayOfWeek,
  findSlotInSchedule
} = require('../utils/schedule');

const VALID_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
]);

const MAX_SYMPTOMS_LENGTH = 500;

// Chuẩn hóa thời gian từ HH:mm:ss sang HH:mm
// Theo hợp đồng API-09 / API-10
const formatTime = (time) => {
  if (typeof time !== 'string') {
    return time;
  }

  return time.slice(0, 5);
};

// Đưa 1 dòng appointments (vừa join doctors) về đúng hình dạng "appointment"
// dùng chung trong hợp đồng API.
const formatAppointment = (appointment) => ({
  id: appointment.id,
  doctor: appointment.doctor,
  appointment_date: appointment.appointment_date,
  start_time: formatTime(appointment.start_time),
  end_time: formatTime(appointment.end_time),
  symptoms: appointment.symptoms,
  status: appointment.status,
  cancel_reason: appointment.cancel_reason,
  created_at: appointment.created_at,
});

const APPOINTMENT_SELECT =
  'id, appointment_date, start_time, end_time, symptoms, status, cancel_reason, created_at, doctor:doctors(id, full_name, specialty)';

// POST /api/appointments - đặt lịch khám (UC006, luồng chính bước 1-7)
const createAppointment = async (req, res) => {
  try {
    const { doctor_id, date, time, symptoms } = req.body || {};

    // Bước 1 (SRS 6a / hợp đồng API-09): kiểm tra các trường bắt buộc
    if (typeof doctor_id !== 'string' || !doctor_id.trim()) {
      return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin đặt lịch', { field: 'doctor_id' });
    }
    if (typeof date !== 'string' || !date.trim()) {
      return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin đặt lịch', { field: 'date' });
    }
    if (typeof time !== 'string' || !time.trim()) {
      return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin đặt lịch', { field: 'time' });
    }
    if (typeof symptoms !== 'string' || !symptoms.trim()) {
      return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin đặt lịch', { field: 'symptoms' });
    }

    const trimmedSymptoms = symptoms.trim();
    if (trimmedSymptoms.length > MAX_SYMPTOMS_LENGTH) {
      return fail(res, 400, `Triệu chứng không được vượt quá ${MAX_SYMPTOMS_LENGTH} ký tự`, {
        field: 'symptoms'
      });
    }

    // id sai định dạng (không phải UUID) -> coi như không tìm thấy bác sĩ,
    // tránh để Supabase ném lỗi database rồi rơi xuống thành lỗi 500 (đã gặp
    // đúng kiểu lỗi này khi làm UC005, xem doctorCatalog.controller.js).
    if (!UUID_REGEX.test(doctor_id)) {
      return fail(res, 404, 'Không tìm thấy bác sĩ');
    }

    // Bước 2: ngày/giờ đúng định dạng và là ngày/giờ có thật
    if (!isValidCalendarDate(date) || !TIME_REGEX.test(time)) {
      return fail(res, 400, 'Ngày giờ không hợp lệ');
    }

    // Bước 3 (SRS): không được đặt lịch trong quá khứ. Hợp đồng chỉ yêu cầu
    // chặn theo NGÀY (không yêu cầu so cả giờ trong ngày hôm nay).
    const todayVN = getTodayInVietnam();
    if (date < todayVN) {
      return fail(res, 400, 'Không thể đặt lịch trong quá khứ');
    }

    // Bước 4: bác sĩ phải tồn tại và đang hoạt động
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, full_name, specialty')
      .eq('id', doctor_id)
      .eq('is_active', true)
      .maybeSingle();
    if (doctorError) throw doctorError;

    if (!doctor) {
      return fail(res, 404, 'Không tìm thấy bác sĩ');
    }

    // Bước 5: khung giờ yêu cầu phải nằm trong lịch làm việc thật của bác sĩ
    // vào đúng thứ của ngày đó (doctor_schedules là lịch lặp lại theo tuần,
    // xem giải thích đầy đủ trong doctorCatalog.controller.js).
    const dayOfWeek = getDayOfWeek(date);

    const { data: blocks, error: blocksError } = await supabase
      .from('doctor_schedules')
      .select('start_time, end_time, slot_minutes')
      .eq('doctor_id', doctor_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);
    if (blocksError) throw blocksError;

    const matchedSlot = blocks ? findSlotInSchedule(blocks, time) : null;

    if (!matchedSlot) {
      return fail(res, 400, 'Khung giờ này bác sĩ không làm việc', {
        code: 'SLOT_NOT_IN_SCHEDULE'
      });
    }

    // Bước 6: bệnh nhân đang đăng nhập - JWT chứa users.id, cần patients.id
    // tương ứng để ghi vào appointments.patient_id (FK trỏ tới patients,
    // không phải users). Tạo hộ 1 dòng patients nếu vì lý do gì đó tài khoản
    // này chưa có (tài khoản cũ trước khi patients được tạo tự động lúc
    // đăng ký) để không chặn luồng đặt lịch.
    let { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (patientError) throw patientError;

    if (!patient) {
      const { data: newPatient, error: createPatientError } = await supabase
        .from('patients')
        .insert({ user_id: req.user.id })
        .select('id')
        .single();
      if (createPatientError) throw createPatientError;
      patient = newPatient;
    }

    // Bước 7 (SRS luồng chính): tạo lịch hẹn, trạng thái mặc định PENDING.
    // Chống đặt trùng giờ dựa vào 2 unique index ở DB (xem migration
    // 003_create_appointments.sql): 1 bác sĩ không thể có 2 lịch hẹn còn
    // hiệu lực cùng ngày+giờ bắt đầu, và 1 bệnh nhân cũng không thể tự đặt
    // trùng giờ với chính mình. Supabase báo lỗi 23505 khi vi phạm.
    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        patient_id: patient.id,
        doctor_id,
        appointment_date: date,
        start_time: matchedSlot.time,
        end_time: matchedSlot.end_time,
        symptoms: trimmedSymptoms
      })
      .select(APPOINTMENT_SELECT)
      .single();

    if (insertError) {
      // SRS luồng thay thế 6a: khung giờ vừa bị người khác đặt mất trong
      // lúc mình đang điền form (race condition) -> báo đúng lỗi để FE cho
      // chọn lại, không phải lỗi hệ thống chung.
      if (insertError.code === '23505') {
        return fail(res, 409, 'Khung giờ đã có người đặt, vui lòng chọn khung giờ khác', {
          code: 'SLOT_TAKEN'
        });
      }
      throw insertError;
    }

    // Bước 8: báo thành công, chờ Admin xác nhận
    return success(
      res,
      201,
      'Đặt lịch thành công, vui lòng chờ xác nhận',
      { appointment: formatAppointment(newAppointment) }
    );
  } catch (error) {
    return serverError(res, 'UC006 - createAppointment', error);
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const { status } = req.query;

    // Bước 1: Kiểm tra trạng thái hợp lệ
    if (
      status !== undefined &&
      (typeof status !== 'string' || !VALID_STATUSES.has(status))
    ) {
      return fail(res, 400, 'Trạng thái không hợp lệ');
    }

    // Bước 2: JWT chứa users.id, tìm patients.id tương ứng
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

    // Bước 3: Chỉ truy vấn lịch hẹn của bệnh nhân đăng nhập
    let query = supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('patient_id', patient.id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    // Bước 4: Lọc theo trạng thái nếu được cung cấp
    if (status !== undefined) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {
      throw error;
    }

    // Bước 5: Chưa có lịch sử đặt lịch
    if (!appointments || appointments.length === 0) {
      return success(
        res,
        200,
        'Bạn chưa có lịch sử đặt lịch khám',
        { appointments: [] }
      );
    }

    // Bước 6: Chuẩn hóa thời gian theo hợp đồng API-10
    // PostgreSQL trả HH:mm:ss, API cần trả HH:mm
    const formattedAppointments = appointments.map(formatAppointment);

    // Bước 7: Trả về lịch sử đặt lịch
    return success(
      res,
      200,
      'Lấy lịch sử đặt lịch thành công',
      { appointments: formattedAppointments }
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
  createAppointment,
  getMyAppointments,
};