/**
 * UC011 (Admin) - Quản lý lịch hẹn phía Admin
 * GET   /api/admin/appointments                       (API-25) - xem tất cả lịch hẹn
 * PATCH /api/admin/appointments/:id/status             (API-26) - xác nhận/từ chối/hủy
 * POST  /api/admin/appointments/:id/medical-record      (API-27) - hoàn tất khám + lưu hồ sơ bệnh án
 * GET   /api/admin/appointments/:id/medical-record      (API-27, xem lại) - xem hồ sơ bệnh án đã lưu
 */

const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');
const { UUID_REGEX, isValidCalendarDate } = require('../utils/schedule');

const VALID_STATUSES = new Set(['PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED']);
const MAX_REASON_LENGTH = 255;

// Các bước chuyển trạng thái hợp lệ Admin được phép thực hiện qua API-26.
// COMPLETED chỉ đi qua API-27 (uc011_complete_appointment), không đi qua
// đường này - đúng ghi chú trong hợp đồng.
const ALLOWED_TRANSITIONS = {
  PENDING: new Set(['CONFIRMED', 'REJECTED']),
  CONFIRMED: new Set(['CANCELLED']),
};

const formatTime = (time) => (typeof time === 'string' ? time.slice(0, 5) : time);

// Hình dạng "appointment" dùng chung (giống appointment.controller.js) +
// thêm "patient" vì Admin cần biết lịch hẹn này của bệnh nhân nào.
const formatAdminAppointment = (appointment) => ({
  id: appointment.id,
  doctor: appointment.doctor,
  patient: appointment.patient,
  appointment_date: appointment.appointment_date,
  start_time: formatTime(appointment.start_time),
  end_time: formatTime(appointment.end_time),
  symptoms: appointment.symptoms,
  status: appointment.status,
  cancel_reason: appointment.cancel_reason,
  created_at: appointment.created_at,
});

const ADMIN_APPOINTMENT_SELECT =
  'id, appointment_date, start_time, end_time, symptoms, status, cancel_reason, created_at, ' +
  'doctor:doctors(id, full_name, specialty), ' +
  'patient:patients(id, patient_code, full_name, phone)';

// Escape ký tự đặc biệt của PostgREST ilike pattern (% _ \) trước khi nhét
// từ khóa người dùng gõ vào, tránh họ tự chèn wildcard phá lọc.
const likePattern = (keyword) => `%${keyword.replace(/[\\%_]/g, '\\$&')}%`;

// GET /api/admin/appointments - danh sách tất cả lịch hẹn, có thể lọc
// (UC011-Admin, API-25)
const listAppointments = async (req, res) => {
  try {
    const { status, date, doctor_id, q } = req.query;

    if (status !== undefined && (typeof status !== 'string' || !VALID_STATUSES.has(status))) {
      return fail(res, 400, 'Trạng thái không hợp lệ');
    }
    if (date !== undefined && (typeof date !== 'string' || !isValidCalendarDate(date))) {
      return fail(res, 400, 'Ngày không hợp lệ, định dạng đúng là YYYY-MM-DD');
    }

    // Lọc theo tên/mã BN/SĐT: tìm trước patients.id khớp, rồi lọc appointments
    // theo patient_id trong danh sách đó. Tách 2 bước để không phải phụ
    // thuộc cú pháp lọc trên bảng nhúng (embedded resource) của PostgREST.
    let patientIds = null;
    if (q !== undefined) {
      if (typeof q !== 'string' || !q.trim()) {
        return fail(res, 400, 'Thông tin không hợp lệ', { field: 'q' });
      }
      const pattern = likePattern(q.trim());
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id')
        .or(`full_name.ilike.${pattern},phone.ilike.${pattern},patient_code.ilike.${pattern}`);
      if (patientsError) throw patientsError;

      patientIds = (patients || []).map((p) => p.id);
      if (patientIds.length === 0) {
        return success(res, 200, 'Không có lịch hẹn nào', { appointments: [] });
      }
    }

    // doctor_id sai định dạng UUID -> chắc chắn không khớp lịch hẹn nào,
    // trả rỗng thay vì để Supabase ném lỗi database (mẫu lỗi đã gặp nhiều
    // lần ở các UC trước).
    if (doctor_id !== undefined && !UUID_REGEX.test(doctor_id)) {
      return success(res, 200, 'Không có lịch hẹn nào', { appointments: [] });
    }

    let query = supabase
      .from('appointments')
      .select(ADMIN_APPOINTMENT_SELECT)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (status !== undefined) query = query.eq('status', status);
    if (date !== undefined) query = query.eq('appointment_date', date);
    if (doctor_id !== undefined) query = query.eq('doctor_id', doctor_id);
    if (patientIds !== null) query = query.in('patient_id', patientIds);

    const { data: appointments, error } = await query;
    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return success(res, 200, 'Không có lịch hẹn nào', { appointments: [] });
    }

    return success(res, 200, 'Lấy danh sách lịch hẹn thành công', {
      appointments: appointments.map(formatAdminAppointment),
    });
  } catch (error) {
    return serverError(res, 'UC011-Admin - listAppointments', error);
  }
};

// PATCH /api/admin/appointments/:id/status - xác nhận/từ chối/hủy
// (UC011-Admin, API-26)
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body || {};

    if (!UUID_REGEX.test(id)) {
      return fail(res, 404, 'Không tìm thấy lịch hẹn');
    }
    if (typeof status !== 'string' || !['CONFIRMED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return fail(res, 400, 'Chuyển trạng thái không hợp lệ', { code: 'INVALID_STATUS_TRANSITION' });
    }
    if (reason !== undefined && reason !== null) {
      if (typeof reason !== 'string' || reason.length > MAX_REASON_LENGTH) {
        return fail(res, 400, 'Chuyển trạng thái không hợp lệ', { code: 'INVALID_STATUS_TRANSITION' });
      }
    }

    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!appointment) {
      return fail(res, 404, 'Không tìm thấy lịch hẹn');
    }

    // Chỉ các bước chuyển hợp lệ ghi trong hợp đồng mới được thực hiện qua
    // API này (PENDING->CONFIRMED|REJECTED ; CONFIRMED->CANCELLED).
    const allowedTargets = ALLOWED_TRANSITIONS[appointment.status];
    if (!allowedTargets || !allowedTargets.has(status)) {
      return fail(res, 400, 'Chuyển trạng thái không hợp lệ', { code: 'INVALID_STATUS_TRANSITION' });
    }

    const trimmedReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
    const nowIso = new Date().toISOString();
    const updatePayload = { status, updated_at: nowIso };
    // Lưu lý do vào cancel_reason cho cả 2 trường hợp từ chối/hủy - dùng
    // chung 1 cột với luồng hủy phía Patient (UC011, API-22). Riêng HỦY
    // (CANCELLED) ghi thêm thời điểm hủy vào cancelled_at như phía Patient.
    if (status === 'REJECTED' || status === 'CANCELLED') {
      updatePayload.cancel_reason = trimmedReason;
    }
    if (status === 'CANCELLED') {
      updatePayload.cancelled_at = nowIso;
    }

    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select(ADMIN_APPOINTMENT_SELECT)
      .single();
    if (updateError) throw updateError;

    return success(res, 200, 'Cập nhật trạng thái lịch hẹn thành công', {
      appointment: formatAdminAppointment(updated),
    });
  } catch (error) {
    return serverError(res, 'UC011-Admin - updateAppointmentStatus', error);
  }
};

// POST /api/admin/appointments/:id/medical-record - hoàn tất khám, lưu hồ
// sơ bệnh án + đơn thuốc, chuyển appointment sang COMPLETED
// (UC011-Admin, API-27). Toàn bộ nghiệp vụ nằm trong 1 RPC transaction
// (uc011_complete_appointment, xem migration 007) để tránh race condition
// khi 2 admin cùng bấm "hoàn tất" 1 lịch hẹn.
const completeAppointmentWithRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, notes, prescriptions } = req.body || {};

    if (!UUID_REGEX.test(id)) {
      return fail(res, 404, 'Không tìm thấy lịch hẹn');
    }
    if (typeof diagnosis !== 'string' || !diagnosis.trim()) {
      return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin', { field: 'diagnosis' });
    }
    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin', { field: 'notes' });
    }

    let items = [];
    if (prescriptions !== undefined && prescriptions !== null) {
      if (!Array.isArray(prescriptions)) {
        return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin', { field: 'prescriptions' });
      }
      for (const item of prescriptions) {
        if (!item || typeof item.medicine_name !== 'string' || !item.medicine_name.trim()) {
          return fail(res, 400, 'Vui lòng nhập đầy đủ thông tin', { field: 'prescriptions' });
        }
      }
      items = prescriptions.map((item) => ({
        medicine_name: item.medicine_name.trim(),
        dosage: typeof item.dosage === 'string' ? item.dosage.trim() : null,
        frequency: typeof item.frequency === 'string' ? item.frequency.trim() : null,
        duration_days: Number.isInteger(item.duration_days) ? item.duration_days : null,
        instructions: typeof item.instructions === 'string' ? item.instructions.trim() : null,
      }));
    }

    const { data: record, error } = await supabase.rpc('uc011_complete_appointment', {
      p_appointment_id: id,
      p_diagnosis: diagnosis.trim(),
      p_notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      p_prescriptions: items,
    });

    if (error) {
      if (error.message === 'UC011_APPOINTMENT_NOT_FOUND') {
        return fail(res, 404, 'Không tìm thấy lịch hẹn');
      }
      if (error.message === 'UC011_INVALID_STATUS') {
        return fail(res, 400, 'Chỉ lịch hẹn đã xác nhận mới được hoàn tất', {
          code: 'INVALID_STATUS_TRANSITION'
        });
      }
      // Phòng trường hợp 2 request cùng lọt qua check trạng thái (hiếm, vì
      // RPC đã khóa dòng appointment), UNIQUE(appointment_id) ở DB vẫn chặn.
      if (error.code === '23505') {
        return fail(res, 409, 'Lịch hẹn này đã có hồ sơ bệnh án');
      }
      throw error;
    }

    return success(res, 201, 'Hoàn tất lịch khám và lưu hồ sơ bệnh án thành công', {
      record,
    });
  } catch (error) {
    return serverError(res, 'UC011-Admin - completeAppointmentWithRecord', error);
  }
};

// GET /api/admin/appointments/:id/medical-record - xem lại hồ sơ bệnh án + đơn
// thuốc đã lưu ở API-27 (UC011-Admin). Chỉ đọc, trả hình dạng như API-12.
const getAppointmentMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const NOT_FOUND = 'Không tìm thấy hồ sơ bệnh án';

    // id sai định dạng UUID -> 404, tránh lỗi database 500.
    if (!UUID_REGEX.test(id)) {
      return fail(res, 404, NOT_FOUND);
    }

    // Admin xem được mọi hồ sơ nên không lọc theo bệnh nhân.
    // appointment_id là UNIQUE trong medical_records nên tối đa 1 dòng.
    const { data: record, error } = await supabase
      .from('medical_records')
      .select(
        'id, appointment_id, diagnosis, notes, created_at, ' +
          'appointment:appointments(appointment_date), ' +
          'doctor:doctors(id, full_name, specialty), ' +
          'prescription_items(id, medicine_name, dosage, frequency, duration_days, instructions)'
      )
      .eq('appointment_id', id)
      .maybeSingle();
    if (error) throw error;

    // Lịch hẹn không tồn tại hoặc chưa có hồ sơ -> cùng 1 thông báo 404.
    if (!record) {
      return fail(res, 404, NOT_FOUND);
    }

    return success(res, 200, 'Lấy hồ sơ bệnh án thành công', {
      record: {
        id: record.id,
        appointment_id: record.appointment_id,
        appointment_date: record.appointment ? record.appointment.appointment_date : null,
        doctor: record.doctor,
        diagnosis: record.diagnosis,
        notes: record.notes,
        created_at: record.created_at,
        prescriptions: (record.prescription_items || []).map((item) => ({
          id: item.id,
          medicine_name: item.medicine_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration_days: item.duration_days,
          instructions: item.instructions,
        })),
      },
    });
  } catch (error) {
    return serverError(res, 'UC011-Admin - getAppointmentMedicalRecord', error);
  }
};

module.exports = {
  listAppointments,
  updateAppointmentStatus,
  completeAppointmentWithRecord,
  getAppointmentMedicalRecord,
};