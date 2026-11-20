/**
 * UC008 - Xem hồ sơ bệnh án, đơn thuốc
 * GET /api/medical-records (API-11) - danh sách hồ sơ của bệnh nhân đang đăng nhập
 * GET /api/medical-records/:id (API-12) - chi tiết 1 hồ sơ, kèm đơn thuốc
 */

const supabase = require('../config/supabase.config');
const { success, fail, serverError } = require('../utils/response');
const { UUID_REGEX } = require('../utils/schedule');

// Đưa 1 dòng medical_records (đã join doctors + appointments) về đúng hình
// dạng rút gọn dùng trong danh sách (API-11).
const formatRecordSummary = (record) => ({
  id: record.id,
  appointment_id: record.appointment_id,
  appointment_date: record.appointment.appointment_date,
  doctor: record.doctor,
  diagnosis: record.diagnosis,
});

// Hình dạng đầy đủ dùng trong chi tiết (API-12), có thêm notes, created_at,
// và danh sách đơn thuốc.
const formatRecordDetail = (record) => ({
  id: record.id,
  appointment_id: record.appointment_id,
  appointment_date: record.appointment.appointment_date,
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
});

// GET /api/medical-records - danh sách hồ sơ bệnh án (UC008, API-11)
const getMyMedicalRecords = async (req, res) => {
  try {
    // Bước 1: JWT chứa users.id, cần patients.id tương ứng để lọc hồ sơ.
    // KHÔNG nhận patient_id từ client (đúng ghi chú hợp đồng: chỉ trả hồ sơ
    // của chính người đang đăng nhập).
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (patientError) throw patientError;

    // Chưa có hồ sơ patients (tài khoản cũ) -> chắc chắn chưa có hồ sơ bệnh án
    if (!patient) {
      return success(res, 200, 'Không tìm thấy hồ sơ bệnh án', { records: [] });
    }

    // Bước 2: lấy toàn bộ hồ sơ bệnh án của đúng bệnh nhân này, mới nhất
    // trước. Join appointments để lấy appointment_date, join doctors để lấy
    // tên/chuyên khoa - cả 2 đều cần hiển thị theo hợp đồng nhưng không lưu
    // trực tiếp trên medical_records.
    const { data: records, error } = await supabase
      .from('medical_records')
      .select(
        'id, appointment_id, diagnosis, created_at, ' +
          'appointment:appointments(appointment_date), ' +
          'doctor:doctors(id, full_name, specialty)'
      )
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Bước 3 (SRS 2a): chưa có hồ sơ bệnh án nào
    if (!records || records.length === 0) {
      return success(res, 200, 'Không tìm thấy hồ sơ bệnh án', { records: [] });
    }

    // Bước 4: trả danh sách đã chuẩn hóa
    return success(res, 200, 'Lấy danh sách hồ sơ bệnh án thành công', {
      records: records.map(formatRecordSummary),
    });
  } catch (error) {
    return serverError(res, 'UC008 - getMyMedicalRecords', error);
  }
};

// GET /api/medical-records/:id - chi tiết hồ sơ bệnh án + đơn thuốc (UC008, API-12)
const getMedicalRecordDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // id sai định dạng (không phải UUID) -> coi như không tìm thấy, tránh để
    // Supabase ném lỗi database rồi rơi xuống thành lỗi 500 (mẫu lỗi đã gặp
    // ở UC005/UC006).
    if (!UUID_REGEX.test(id)) {
      return fail(res, 404, 'Không tìm thấy hồ sơ bệnh án');
    }

    // Bước 1: JWT -> patients.id của người đang đăng nhập
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (patientError) throw patientError;

    if (!patient) {
      return fail(res, 404, 'Không tìm thấy hồ sơ bệnh án');
    }

    // Bước 2: lấy hồ sơ kèm đơn thuốc (prescription_items) trong 1 lượt gọi.
    // Cố tình CHƯA lọc theo patient_id ở đây để phân biệt được "không tồn
    // tại" với "tồn tại nhưng của người khác" trong code - nhưng cả 2 trường
    // hợp body trả về cho client PHẢI giống hệt nhau (404 "Không tìm thấy hồ
    // sơ bệnh án") để không lộ rằng hồ sơ có tồn tại (đúng yêu cầu bắt buộc
    // của hợp đồng: bệnh nhân A gọi id hồ sơ của B phải nhận 404 y hệt).
    const { data: record, error } = await supabase
      .from('medical_records')
      .select(
        'id, appointment_id, patient_id, diagnosis, notes, created_at, ' +
          'appointment:appointments(appointment_date), ' +
          'doctor:doctors(id, full_name, specialty), ' +
          'prescription_items(id, medicine_name, dosage, frequency, duration_days, instructions)'
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;

    if (!record || record.patient_id !== patient.id) {
      return fail(res, 404, 'Không tìm thấy hồ sơ bệnh án');
    }

    // Bước 3: trả chi tiết hồ sơ kèm đơn thuốc
    return success(res, 200, 'Lấy chi tiết hồ sơ bệnh án thành công', {
      record: formatRecordDetail(record),
    });
  } catch (error) {
    return serverError(res, 'UC008 - getMedicalRecordDetail', error);
  }
};

module.exports = {
  getMyMedicalRecords,
  getMedicalRecordDetail,
};