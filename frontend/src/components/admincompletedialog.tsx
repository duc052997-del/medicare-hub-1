// components/admincompletedialog.tsx — UC011 (Admin): hoàn tất lịch khám = nhập kết luận + ghi chú + đơn thuốc (API-27).

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, GENERIC_ERROR } from '../services/apierror';
import { formatDate } from '../utils/helpers';
import {
  COMPLETE_LIMITS, emptyCompleteForm, hasCompleteErrors, isCompleteFormDirty,
  newRxItem, toCompletePayload, validateCompleteForm,
} from '../utils/completeform';
import { adminActionStyles as s, adminCompleteStyles as c } from '../styles/adminappointments';
import type { AdminAppointment, CompleteErrors, CompleteForm, CompletePayload, RxField } from '../types/adminappointment';

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div style={s.sumRow}>
    <span style={s.sumLabel}>{label}</span>
    <span style={s.sumValue}>{value}</span>
  </div>
);

const Field = ({ label, required, error, hint, wide, children }: {
  label: string; required?: boolean; error?: string; hint?: string; wide?: boolean; children: ReactNode;
}) => (
  <div style={{ ...c.group, ...(wide ? c.rxWide : {}) }}>
    <label style={s.label}>{label} {required && <span style={c.required}>*</span>}</label>
    {children}
    {error ? <span role="alert" style={c.error}>{error}</span> : hint ? <span style={c.hint}>{hint}</span> : null}
  </div>
);

const inputStyle = (error?: string) => ({ ...c.input, ...(error ? c.inputError : {}) });

interface AdminCompleteDialogProps {
  appointment: AdminAppointment;
  onClose: () => void;
  onSubmit: (payload: CompletePayload) => Promise<void>; // ném ApiError nếu thất bại; thành công thì nơi gọi đóng hộp thoại
  onStale: () => void; // gọi khi đóng sau lỗi "lịch đã đổi": danh sách trên màn hình đã cũ
}

export default function AdminCompleteDialog({ appointment: a, onClose, onSubmit, onStale }: AdminCompleteDialogProps) {
  const L = COMPLETE_LIMITS;
  const [form, setForm] = useState<CompleteForm>(emptyCompleteForm);
  const [errors, setErrors] = useState<CompleteErrors>({ items: {} });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);

  const close = useCallback(() => {
    if (submitting) return;
    if (!stale && isCompleteFormDirty(form) && !window.confirm('Bạn đã nhập dở nội dung. Đóng và bỏ các thông tin đã nhập?')) return;
    if (stale) onStale();
    onClose();
  }, [submitting, stale, form, onStale, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  // Sửa kết luận / ghi chú: xóa lỗi của ô đó
  const setText = (key: 'diagnosis' | 'notes', value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    setError('');
  };

  const setItem = (itemKey: string, field: RxField, value: string) => {
    setForm((f) => ({ ...f, items: f.items.map((i) => (i.key === itemKey ? { ...i, [field]: value } : i)) }));
    setErrors((e) => {
      if (!e.items[itemKey]?.[field]) return e;
      const { [field]: _removed, ...rest } = e.items[itemKey];
      const items = { ...e.items, [itemKey]: rest };
      if (!Object.keys(rest).length) delete items[itemKey];
      return { ...e, items };
    });
    setError('');
  };

  const addItem = () => setForm((f) => (f.items.length >= L.itemsMax ? f : { ...f, items: [...f.items, newRxItem()] }));
  const removeItem = (itemKey: string) => {
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.key !== itemKey) }));
    setErrors((e) => {
      const { [itemKey]: _removed, ...items } = e.items;
      return { ...e, items };
    });
  };

  const submit = async () => {
    const found = validateCompleteForm(form);
    setErrors(found);
    if (hasCompleteErrors(found)) {
      setError('Vui lòng kiểm tra lại các ô được đánh dấu đỏ.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(toCompletePayload(form));
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setError(apiErr?.message || GENERIC_ERROR);
      if (apiErr?.field === 'diagnosis') setErrors((e) => ({ ...e, diagnosis: apiErr.message }));
      if (apiErr?.status === 404 || apiErr?.status === 409 || apiErr?.code === 'INVALID_STATUS_TRANSITION') setStale(true);
      setSubmitting(false);
    }
  };

  return (
    // Cố ý không có onMouseDown đóng khi bấm ra ngoài: form dài, bấm nhầm sẽ mất dữ liệu
    <div style={s.overlay}>
      <div role="dialog" aria-modal="true" aria-label="Hoàn tất lịch khám" style={{ ...s.dialog, ...c.dialog }}>
        <h2 style={s.dialogTitle}>Hoàn tất lịch khám</h2>
        <p style={s.dialogText}>Nhập kết luận và đơn thuốc (nếu có). Hồ sơ sẽ hiện trong mục Hồ sơ bệnh án của bệnh nhân.</p>

        <div style={s.summary}>
          <Row label="Bệnh nhân" value={<b>{a.patient.full_name || 'Chưa cập nhật họ tên'}</b>} />
          <Row label="Bác sĩ" value={`${a.doctor.full_name} (${a.doctor.specialty})`} />
          <Row label="Thời gian" value={`${a.start_time} - ${a.end_time}, ${formatDate(a.appointment_date)}`} />
          <Row label="Triệu chứng" value={a.symptoms || 'Không có'} />
        </div>

        <div style={c.section}>
          <Field label="Kết luận / chẩn đoán" required error={errors.diagnosis} hint={`${form.diagnosis.length}/${L.diagnosisMax} ký tự`}>
            <textarea
              value={form.diagnosis}
              onChange={(e) => setText('diagnosis', e.target.value)}
              placeholder="Ví dụ: Viêm họng cấp"
              rows={3}
              disabled={submitting || stale}
              style={{ ...inputStyle(errors.diagnosis), resize: 'vertical' }}
            />
          </Field>
        </div>

        <div style={c.section}>
          <Field label="Ghi chú, lời dặn của bác sĩ" error={errors.notes} hint={`Không bắt buộc. ${form.notes.length}/${L.notesMax} ký tự`}>
            <textarea
              value={form.notes}
              onChange={(e) => setText('notes', e.target.value)}
              placeholder="Ví dụ: Súc họng nước muối ấm, tái khám sau 1 tuần nếu không đỡ"
              rows={3}
              disabled={submitting || stale}
              style={{ ...inputStyle(errors.notes), resize: 'vertical' }}
            />
          </Field>
        </div>

        <div style={c.section}>
          <div style={c.sectionHead}>
            <h3 style={c.sectionTitle}>Đơn thuốc ({form.items.length}/{L.itemsMax})</h3>
            <button
              type="button"
              className="mh-btn"
              onClick={addItem}
              disabled={submitting || stale || form.items.length >= L.itemsMax}
              style={c.btnSmall}
            >
              + Thêm thuốc
            </button>
          </div>

          {form.items.length === 0 ? (
            <div style={c.rxEmpty}>Chưa kê thuốc. Bỏ trống nếu lần khám này không kê đơn.</div>
          ) : (
            <div style={c.rxList}>
              {form.items.map((item, idx) => {
                const e = errors.items[item.key] ?? {};
                const dis = submitting || stale;
                return (
                  <div key={item.key} style={c.rxCard}>
                    <div style={c.rxHead}>
                      <span>Thuốc {idx + 1}</span>
                      <button type="button" disabled={dis} onClick={() => removeItem(item.key)} style={{ ...c.btnSmall, ...c.btnSmallDanger }}>
                        Xóa
                      </button>
                    </div>
                    <div style={c.rxGrid}>
                      <Field label="Tên thuốc" required error={e.medicine_name} wide>
                        <input type="text" value={item.medicine_name} disabled={dis} placeholder="Ví dụ: Amoxicillin 500mg"
                          onChange={(ev) => setItem(item.key, 'medicine_name', ev.target.value)} style={inputStyle(e.medicine_name)} />
                      </Field>
                      <Field label="Liều dùng" error={e.dosage}>
                        <input type="text" value={item.dosage} disabled={dis} placeholder="1 viên"
                          onChange={(ev) => setItem(item.key, 'dosage', ev.target.value)} style={inputStyle(e.dosage)} />
                      </Field>
                      <Field label="Tần suất" error={e.frequency}>
                        <input type="text" value={item.frequency} disabled={dis} placeholder="2 lần/ngày"
                          onChange={(ev) => setItem(item.key, 'frequency', ev.target.value)} style={inputStyle(e.frequency)} />
                      </Field>
                      <Field label="Số ngày" error={e.duration_days}>
                        <input type="number" min={1} max={L.durationMax} value={item.duration_days} disabled={dis} placeholder="7"
                          onChange={(ev) => setItem(item.key, 'duration_days', ev.target.value)} style={inputStyle(e.duration_days)} />
                      </Field>
                      <Field label="Hướng dẫn" error={e.instructions} wide>
                        <input type="text" value={item.instructions} disabled={dis} placeholder="Uống sau ăn"
                          onChange={(ev) => setItem(item.key, 'instructions', ev.target.value)} style={inputStyle(e.instructions)} />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!stale && (
          <div style={c.warn}>
            Sau khi lưu, lịch chuyển sang <b>Hoàn tất</b> và hồ sơ được gửi cho bệnh nhân. Hiện chưa có chức năng sửa hồ sơ, hãy kiểm tra kỹ trước khi lưu.
          </div>
        )}

        {error && <div role="alert" style={{ ...s.notice, ...s.noticeError, marginTop: 12, marginBottom: 0 }}>{error}</div>}

        <div style={s.dialogActions}>
          <button type="button" className="mh-btn" onClick={close} disabled={submitting} style={s.btnLine}>
            {stale ? 'Đóng' : 'Hủy'}
          </button>
          {!stale && (
            <button
              type="button"
              className="mh-btn"
              onClick={submit}
              disabled={submitting}
              style={{ ...s.btnPrimary, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Đang lưu...' : 'Hoàn tất & lưu hồ sơ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}