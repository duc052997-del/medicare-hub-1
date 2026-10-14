// components/bookingmodal.tsx — Khung đặt lịch (UC006) đè lên trang đang mở; mở từ App.tsx khi bấm "Đặt lịch ngay".
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { doctorService } from '../services/doctorservice';
import { appointmentService } from '../services/appointmentservice';
import { ApiError } from '../services/apierror';
import { formatDate } from '../utils/helpers';
import { timeNowVN, todayVN } from '../utils/schedule';
import type { Appointment, AuthUser, Doctor, Slot } from '../types';

// UC006 Đặt lịch khám dạng khung nhỏ đè lên trang đang mở (SRS hình 3.13):
// chuyên khoa (chỉ lọc) -> bác sĩ -> ngày -> giờ trống -> triệu chứng.

type FieldKey = 'doctor_id' | 'date' | 'time' | 'symptoms';
type Errors = Partial<Record<FieldKey, string>>;
type Banner = { kind: 'success' | 'error'; text: string } | null;

const FIELDS: FieldKey[] = ['doctor_id', 'date', 'time', 'symptoms'];
const MAX_SYMPTOMS = 500;

const Group = ({ label, error, required = true, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) => (
  <div style={styles.group}>
    <label style={styles.label}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
    {error && <span style={styles.error}>{error}</span>}
  </div>
);

interface BookingModalProps {
  user: AuthUser;
  presetDoctorId?: string; // bấm "Đặt lịch" ở thẻ bác sĩ -> chọn sẵn bác sĩ đó
  onClose: () => void;
  onBooked: () => void; // báo App để trang Lịch khám tải lại danh sách
  onViewSchedule: () => void;
}

export default function BookingModal({ user, presetDoctorId = '', onClose, onBooked, onViewSchedule }: BookingModalProps) {
  const today = todayVN();
  const isPatient = user.role === 'PATIENT';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsVersion, setSlotsVersion] = useState(0);

  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Esc để đóng + khóa cuộn trang phía sau
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Danh sách bác sĩ (API-07), chọn sẵn nếu có presetDoctorId
  useEffect(() => {
    let cancelled = false;
    doctorService
      .getDoctors()
      .then((list) => {
        if (cancelled) return;
        setDoctors(list);
        const preset = list.find((d) => String(d.id) === String(presetDoctorId));
        if (preset) {
          setDoctorId(String(preset.id));
          setSpecialty(preset.specialty);
        }
      })
      .catch((err) => !cancelled && setBanner({ kind: 'error', text: err instanceof ApiError ? err.message : 'Không thể tải danh sách bác sĩ.' }))
      .finally(() => !cancelled && setDoctorsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [presetDoctorId]);

  // Khung giờ của bác sĩ trong ngày (API-08)
  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    doctorService
      .getSchedule(doctorId, date)
      .then((r) => !cancelled && setSlots(r.slots))
      .catch((err) => {
        if (cancelled) return;
        setSlots([]);
        setBanner({ kind: 'error', text: err instanceof ApiError ? err.message : 'Không thể tải khung giờ trống.' });
      })
      .finally(() => !cancelled && setSlotsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId, date, slotsVersion]);

  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty))].sort((a, b) => a.localeCompare(b, 'vi')), [doctors]);
  const doctorOptions = specialty ? doctors.filter((d) => d.specialty === specialty) : doctors;
  const freeSlots = slots.filter((s) => s.available && (date !== today || s.time > timeNowVN()));
  const selectedDoctor = doctors.find((d) => String(d.id) === doctorId);

  const clearError = (k: FieldKey) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  const changeSpecialty = (v: string) => {
    setSpecialty(v);
    if (selectedDoctor && v && selectedDoctor.specialty !== v) {
      setDoctorId('');
      setTime('');
    }
  };
  const changeDoctor = (v: string) => {
    setDoctorId(v);
    setTime('');
    clearError('doctor_id');
    const d = doctors.find((x) => String(x.id) === v);
    if (d) setSpecialty(d.specialty);
  };
  const changeDate = (v: string) => {
    setDate(v);
    setTime('');
    clearError('date');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const errs: Errors = {};
    if (!doctorId) errs.doctor_id = 'Vui lòng chọn bác sĩ!';
    if (!date) errs.date = 'Vui lòng chọn ngày khám!';
    else if (date < today) errs.date = 'Không thể đặt lịch trong quá khứ!';
    if (!time) errs.time = 'Vui lòng chọn khung giờ khám!';
    if (!symptoms.trim()) errs.symptoms = 'Vui lòng nhập triệu chứng!';
    else if (symptoms.length > MAX_SYMPTOMS) errs.symptoms = `Triệu chứng tối đa ${MAX_SYMPTOMS} ký tự!`;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setSubmitting(true);
      const result = await appointmentService.book({ doctor_id: doctorId, date, time, symptoms: symptoms.trim() });
      setBooked(result.appointment);
      setBanner({ kind: 'success', text: result.message || 'Đặt lịch thành công, vui lòng chờ xác nhận' });
      onBooked();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setBanner({ kind: 'error', text: apiErr?.message || 'Đã có lỗi xảy ra, vui lòng thử lại sau' });
      if (apiErr?.field && (FIELDS as string[]).includes(apiErr.field)) setErrors({ [apiErr.field]: apiErr.message });
      // SRS luồng 6a: trùng giờ -> quay lại bước chọn giờ, tải lại khung trống (giữ nguyên triệu chứng)
      if (apiErr?.code === 'SLOT_TAKEN' || apiErr?.code === 'SLOT_NOT_IN_SCHEDULE') {
        setTime('');
        setSlotsVersion((v) => v + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Đặt thêm lịch: xóa kết quả, giữ bác sĩ/ngày để chọn giờ khác
  const bookAnother = () => {
    setBooked(null);
    setBanner(null);
    setTime('');
    setSymptoms('');
    setSlotsVersion((v) => v + 1);
  };

  return (
    <div style={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Đặt lịch khám" style={styles.dialog}>
        <div style={styles.head}>
          <div>
            <h2 style={styles.title}>Đặt lịch khám</h2>
            <p style={styles.sub}>Chọn bác sĩ, ngày và khung giờ còn trống</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" style={styles.close}>×</button>
        </div>

        <div style={styles.body}>
          {!isPatient ? (
            <div style={{ ...styles.banner, ...styles.bannerError }}>Chỉ tài khoản bệnh nhân mới đặt được lịch khám.</div>
          ) : booked ? (
            <>
              {banner && <div role="alert" style={{ ...styles.banner, ...styles.bannerOk }}>{banner.text}</div>}
              <div style={styles.summary}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{booked.doctor.full_name} · {booked.doctor.specialty}</div>
                <div>Ngày {formatDate(booked.appointment_date)}, {booked.start_time} - {booked.end_time}</div>
              </div>
              <div style={styles.actions}>
                <button type="button" className="mh-btn" onClick={bookAnother} style={styles.btnLine}>Đặt thêm lịch</button>
                <button type="button" className="mh-btn" onClick={onViewSchedule} style={styles.btnPrimary}>Xem lịch khám</button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={styles.form} noValidate>
              {banner && <div role="alert" style={{ ...styles.banner, ...(banner.kind === 'success' ? styles.bannerOk : styles.bannerError), marginBottom: 0 }}>{banner.text}</div>}

              <Group label="Chuyên khoa" required={false}>
                <select value={specialty} onChange={(e) => changeSpecialty(e.target.value)} style={styles.input} disabled={doctorsLoading}>
                  <option value="">Tất cả chuyên khoa</option>
                  {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Group>

              <Group label="Bác sĩ" error={errors.doctor_id}>
                <select value={doctorId} onChange={(e) => changeDoctor(e.target.value)} style={{ ...styles.input, ...(errors.doctor_id ? styles.inputError : {}) }} disabled={doctorsLoading}>
                  <option value="">{doctorsLoading ? 'Đang tải danh sách bác sĩ...' : 'Chọn bác sĩ'}</option>
                  {doctorOptions.map((d) => <option key={d.id} value={String(d.id)}>{d.full_name} - {d.specialty}</option>)}
                </select>
              </Group>

              <div style={styles.row}>
                <Group label="Ngày khám" error={errors.date}>
                  <input type="date" value={date} min={today} onChange={(e) => changeDate(e.target.value)} style={{ ...styles.input, ...(errors.date ? styles.inputError : {}) }} />
                </Group>
                <Group label="Giờ khám" error={errors.time}>
                  <select
                    value={time}
                    onChange={(e) => { setTime(e.target.value); clearError('time'); }}
                    style={{ ...styles.input, ...(errors.time ? styles.inputError : {}) }}
                    disabled={!doctorId || !date || slotsLoading}
                  >
                    <option value="">{!doctorId || !date ? 'Chọn bác sĩ và ngày trước' : slotsLoading ? 'Đang tải...' : 'Chọn khung giờ trống'}</option>
                    {freeSlots.map((s) => <option key={s.time} value={s.time}>{s.time}</option>)}
                  </select>
                </Group>
              </div>
              {doctorId && date && !slotsLoading && freeSlots.length === 0 && (
                <span style={{ ...styles.hint, marginTop: -8 }}>Bác sĩ không còn khung giờ trống ngày này, vui lòng chọn ngày khác.</span>
              )}

              <Group label="Triệu chứng" error={errors.symptoms}>
                <textarea
                  value={symptoms}
                  onChange={(e) => { setSymptoms(e.target.value); clearError('symptoms'); }}
                  placeholder="Mô tả triệu chứng của bạn"
                  rows={3}
                  style={{ ...styles.input, resize: 'vertical', ...(errors.symptoms ? styles.inputError : {}) }}
                />
                <span style={styles.hint}>{symptoms.length}/{MAX_SYMPTOMS} ký tự</span>
              </Group>

              <div style={styles.actions}>
                <button type="button" className="mh-btn" onClick={onClose} style={styles.btnLine}>Đóng</button>
                <button type="submit" className="mh-btn" disabled={submitting} style={{ ...styles.btnPrimary, opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Đang đặt lịch...' : 'Đặt lịch'}
                </button>
              </div>
            </form>
          )}
          {!isPatient && (
            <div style={styles.actions}><button type="button" className="mh-btn" onClick={onClose} style={styles.btnLine}>Đóng</button></div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,.5)', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' },
  dialog: { width: '100%', maxWidth: 520, maxHeight: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(15,23,42,.3)', overflow: 'hidden' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 24px 14px', borderBottom: '1px solid #e2e8f0' },
  title: { margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  close: { width: 32, height: 32, fontSize: 22, lineHeight: 1, color: '#64748b', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer' },
  body: { padding: '18px 24px 22px', overflowY: 'auto' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  group: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 14, fontWeight: 700, color: '#1e293b' },
  input: { padding: '10px 12px', fontSize: 14, borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', borderRadius: 8, outline: 'none', backgroundColor: '#fff', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' },
  inputError: { borderColor: '#ef4444' },
  error: { fontSize: 12, color: '#ef4444' },
  hint: { fontSize: 12, color: '#64748b' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  btnPrimary: { padding: '10px 26px', fontSize: 14, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnLine: { padding: '10px 22px', fontSize: 14, fontWeight: 600, color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb', borderRadius: 8, cursor: 'pointer' },
  banner: { padding: '12px 14px', marginBottom: 14, borderRadius: 8, fontSize: 14 },
  bannerOk: { color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' },
  bannerError: { color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' },
  summary: { display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', fontSize: 14, color: '#334155', backgroundColor: '#f5faff', border: '1px solid #dbeafe', borderRadius: 8 },
};