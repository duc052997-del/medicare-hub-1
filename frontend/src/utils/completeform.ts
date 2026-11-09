// utils/completeform.ts
// UC011 (Admin) - Hoàn tất lịch khám: phần THUẦN (không React, không gọi API) của form kết luận + đơn thuốc:
// giá trị mặc định, kiểm tra dữ liệu, đổi form -> payload API-27. Dễ viết test, dễ thêm trường mới.
import type {
  CompleteErrors, CompleteForm, CompletePayload, PrescriptionInput, RxField, RxFormItem,
} from '../types/adminappointment';

// Giới hạn do FE đề xuất (hợp đồng API-27 chưa nêu độ dài), cần chốt lại với BE
export const COMPLETE_LIMITS = {
  diagnosisMax: 1000,
  notesMax: 2000,
  medicineMax: 100,
  dosageMax: 100,
  frequencyMax: 100,
  instructionsMax: 255,
  durationMax: 365, // ngày
  itemsMax: 20, // số dòng thuốc
} as const;

let seq = 0;
export const newRxItem = (): RxFormItem => ({
  key: `rx${++seq}`,
  medicine_name: '',
  dosage: '',
  frequency: '',
  duration_days: '',
  instructions: '',
});

export const emptyCompleteForm = (): CompleteForm => ({ diagnosis: '', notes: '', items: [] });

const RX_FIELDS: RxField[] = ['medicine_name', 'dosage', 'frequency', 'duration_days', 'instructions'];

// Dòng thuốc để trống hoàn toàn thì bỏ qua (không báo lỗi, không gửi)
const isBlank = (i: RxFormItem) => RX_FIELDS.every((f) => !i[f].trim());

export const hasCompleteErrors = (e: CompleteErrors) => !!(e.diagnosis || e.notes || Object.keys(e.items).length);

export const isCompleteFormDirty = (f: CompleteForm) => !!(f.diagnosis.trim() || f.notes.trim() || f.items.some((i) => !isBlank(i)));

const validateItem = (i: RxFormItem): Partial<Record<RxField, string>> => {
  const e: Partial<Record<RxField, string>> = {};
  const L = COMPLETE_LIMITS;
  if (!i.medicine_name.trim()) e.medicine_name = 'Vui lòng nhập tên thuốc!';
  else if (i.medicine_name.trim().length > L.medicineMax) e.medicine_name = `Tối đa ${L.medicineMax} ký tự!`;
  if (i.dosage.trim().length > L.dosageMax) e.dosage = `Tối đa ${L.dosageMax} ký tự!`;
  if (i.frequency.trim().length > L.frequencyMax) e.frequency = `Tối đa ${L.frequencyMax} ký tự!`;
  if (i.instructions.trim().length > L.instructionsMax) e.instructions = `Tối đa ${L.instructionsMax} ký tự!`;
  const days = i.duration_days.trim();
  if (days) {
    const n = Number(days);
    if (!/^\d+$/.test(days) || n < 1 || n > L.durationMax) e.duration_days = `Số nguyên từ 1 đến ${L.durationMax}!`;
  }
  return e;
};

// Rỗng = hợp lệ. Kết luận bắt buộc; ghi chú, đơn thuốc không bắt buộc.
export const validateCompleteForm = (f: CompleteForm): CompleteErrors => {
  const errs: CompleteErrors = { items: {} };
  const diagnosis = f.diagnosis.trim();
  if (!diagnosis) errs.diagnosis = 'Vui lòng nhập kết luận của bác sĩ!';
  else if (diagnosis.length > COMPLETE_LIMITS.diagnosisMax) errs.diagnosis = `Kết luận tối đa ${COMPLETE_LIMITS.diagnosisMax} ký tự!`;
  if (f.notes.trim().length > COMPLETE_LIMITS.notesMax) errs.notes = `Ghi chú tối đa ${COMPLETE_LIMITS.notesMax} ký tự!`;
  f.items.forEach((i) => {
    if (isBlank(i)) return;
    const e = validateItem(i);
    if (Object.keys(e).length) errs.items[i.key] = e;
  });
  return errs;
};

// Ô không điền thì bỏ khóa, không gửi chuỗi rỗng
export const toCompletePayload = (f: CompleteForm): CompletePayload => {
  const text = (v: string) => v.trim() || undefined;
  const prescriptions: PrescriptionInput[] = f.items
    .filter((i) => !isBlank(i))
    .map((i) => ({
      medicine_name: i.medicine_name.trim(),
      dosage: text(i.dosage),
      frequency: text(i.frequency),
      duration_days: i.duration_days.trim() ? Number(i.duration_days) : undefined,
      instructions: text(i.instructions),
    }));
  return { diagnosis: f.diagnosis.trim(), notes: text(f.notes), prescriptions };
};