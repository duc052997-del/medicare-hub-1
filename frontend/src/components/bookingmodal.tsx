// components/bookingmodal.tsx — Khung đặt lịch (UC006) đè lên trang đang mở; mở từ App.tsx khi bấm "Đặt lịch ngay".
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { doctorService } from '../services/doctorservice';
import { appointmentService } from '../services/appointmentservice';
import { ApiError } from '../services/apierror';
import { formatDate } from '../utils/helpers';
import {
  BOOKING_MIN_HOURS,
  formatDateTimeVN,
  isRealDate,
  isSlotBookable,
  maxBookingDate,
  minBookingDate,
  slotMinutes,
  slotOverlaps,
} from '../utils/schedule';
import type { Appointment, AppointmentStatus, AuthUser, Doctor, Slot } from '../types';

type FieldKey = 'doctor_id' | 'date' | 'time' | 'symptoms';
type Errors = Partial<Record<FieldKey, string>>;
type Banner = { kind: 'success' | 'error'; text: string } | null;
type SlotState = 'free' | 'taken' | 'soon';
type SlotView = { time: string; state: SlotState };

const FIELDS: FieldKey[] = ['doctor_id', 'date', 'time', 'symptoms'];
const MAX_SYMPTOMS = 500;
const HOLDING: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED'];
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

const Group = ({ label, error, required = true, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) => (
  <div style={styles.group}>
    <label style={styles.label}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
    {error && <span style={styles.error}>{error}</span>}
  </div>
);

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div style={styles.sumRow}>
    <span style={styles.sumLabel}>{label}</span>
    <span style={styles.sumValue}>{value}</span>
  </div>
);

interface BookingModalProps {
  user: AuthUser;
  presetDoctorId?: string;
  onClose: () => void;
  onBooked: () => void;
  onViewSchedule: () => void;
}

export default function BookingModal({ user, presetDoctorId = '', onClose, onBooked, onViewSchedule }: BookingModalProps) {
  const minDate = minBookingDate(); // ngày mai
  const maxDate = maxBookingDate(); // ngày mai + 30
  const isPatient = user.role === 'PATIENT';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const [avail, setAvail] = useState<Record<string, Slot[]>>({});
  const [availLoading, setAvailLoading] = useState(false);
  const [availLoaded, setAvailLoaded] = useState(false);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [mine, setMine] = useState<Appointment[]>([]);

  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    return () => { cancelled = true; };
  }, [presetDoctorId]);

  const loadMine = useCallback(() => {
    appointmentService.getMyAppointments().then(setMine).catch(() => setMine([]));
  }, []);
  useEffect(() => {
    if (isPatient) loadMine();
  }, [isPatient, loadMine]);

  const rangeError =
    date && (!isRealDate(date) || date < minDate || date > maxDate)
      ? `Chỉ được chọn ngày từ ${formatDate(minDate)} đến ${formatDate(maxDate)}`
      : '';
  const dateKnown = !!date && !rangeError;

  useEffect(() => {
    if (!dateKnown || doctors.length === 0) {
      setAvail({});
      setAvailLoaded(false);
      setAvailLoading(false);
      return;
    }
    let cancelled = false;
    setAvailLoading(true);
    setAvailLoaded(false);
    let failed = 0;
    Promise.all(
      doctors.map((d) =>
        doctorService.getSchedule(d.id, date)
          .then((r) => [String(d.id), r.slots] as const)
          .catch(() => {
            failed += 1;
            return [String(d.id), [] as Slot[]] as const;
          })
      )
    ).then((entries) => {
      if (cancelled) return;
      setAvailLoading(false);
      if (failed === doctors.length) {
        setAvail({});
        setBanner({ kind: 'error', text: 'Không thể tải lịch làm việc của bác sĩ, vui lòng thử lại sau.' });
        return;
      }
      setAvail(Object.fromEntries(entries));
      setAvailLoaded(true);
    });
    return () => { cancelled = true; };
  }, [dateKnown, date, doctors, slotsVersion]);

  // Kiểm tra trạng thái khung giờ: nếu đã có người đặt (available = false) -> chuyển thành 'taken' (màu xám, bị disable)
  const viewsByDoctor = useMemo(() => {
    const out: Record<string, SlotView[]> = {};
    for (const [did, list] of Object.entries(avail)) {
      const step = slotMinutes(list);
      const blocking = mine.filter(
        (a) => HOLDING.includes(a.status) && a.appointment_date === date && String(a.doctor.id) !== did
      );
      out[did] = list
        .filter((s) => !blocking.some((a) => slotOverlaps(s.time, step, a)))
        .map((s): SlotView => ({
          time: s.time,
          state: !s.available ? 'taken' : !isSlotBookable(date, s.time) ? 'soon' : 'free',
        }));
    }
    return out;
  }, [avail, mine, date]);

  const availableIds = useMemo(
    () => new Set(Object.keys(viewsByDoctor).filter((did) => viewsByDoctor[did].some((s) => s.state === 'free'))),
    [viewsByDoctor]
  );
  const filterByDate = dateKnown && availLoaded;

  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty))].sort((a, b) => a.localeCompare(b, 'vi')), [doctors]);
  
  const doctorOptions = doctors.filter(
    (d) => (!specialty || d.specialty === specialty) && (!filterByDate || availableIds.has(String(d.id)))
  );
  const selectedDoctor = doctors.find((d) => String(d.id) === doctorId);

  useEffect(() => {
    if (!filterByDate || !doctorId || availableIds.has(doctorId)) return;
    const name = doctors.find((d) => String(d.id) === doctorId)?.full_name ?? 'Bác sĩ đã chọn';
    setDoctorId('');
    setTime('');
    setErrors((e) => ({ ...e, doctor_id: `${name} không còn khung giờ đặt được ngày này, vui lòng chọn bác sĩ khác!` }));
  }, [filterByDate, doctorId, availableIds, doctors]);

  const slotViews = viewsByDoctor[doctorId] ?? [];
  const hasGrey = slotViews.some((s) => s.state !== 'free');

  const emptyDayMsg =
    filterByDate && availableIds.size === 0
      ? 'Ngày này không có bác sĩ nào làm việc hoặc đã hết khung giờ có thể đặt, vui lòng chọn ngày khác.'
      : '';
  const dateError = rangeError || emptyDayMsg || errors.date;

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
    clearError('doctor_id');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const errs: Errors = {};
    if (!date) errs.date = 'Vui lòng chọn ngày khám!';
    else if (rangeError) errs.date = rangeError;
    else if (emptyDayMsg) errs.date = emptyDayMsg;
    if (!doctorId) errs.doctor_id = 'Vui lòng chọn bác sĩ!';
    if (!time) errs.time = 'Vui lòng chọn khung giờ khám!';
    else if (!slotViews.some((s) => s.state === 'free' && s.time === time)) errs.time = 'Khung giờ này không còn khả dụng hoặc đã có người đặt, vui lòng chọn lại!';
    if (!symptoms.trim()) errs.symptoms = 'Vui lòng nhập triệu chứng!';
    else if (symptoms.length > MAX_SYMPTOMS) errs.symptoms = `Triệu chứng tối đa ${MAX_SYMPTOMS} ký tự!`;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setSubmitting(true);
      const result = await appointmentService.book({ doctor_id: doctorId, date, time, symptoms: symptoms.trim() });
      setBooked(result.appointment);
      setBanner({ kind: 'success', text: result.message || 'Đặt lịch thành công, vui lòng chờ xác nhận' });
      loadMine();
      onBooked();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setBanner({ kind: 'error', text: apiErr?.message || 'Đã có lỗi xảy ra, vui lòng thử lại sau' });
      if (apiErr?.field && (FIELDS as string[]).includes(apiErr.field)) setErrors({ [apiErr.field]: apiErr.message });
      if (apiErr?.code === 'SLOT_TAKEN' || apiErr?.code === 'SLOT_NOT_IN_SCHEDULE') {
        setTime('');
        setSlotsVersion((v) => v + 1);
        loadMine();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const bookAnother = () => {
    setBooked(null);
    setBanner(null);
    setDoctorId('');
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
              <div role="alert" style={{ ...styles.banner, ...styles.bannerOk, ...styles.okBox }}>
                <span style={styles.check}>✓</span>
                <div>
                  <div style={{ fontWeight: 800 }}>Đặt lịch thành công</div>
                  <div style={{ fontSize: 13 }}>{banner?.text || 'Vui lòng chờ xác nhận lịch khám'}</div>
                </div>
              </div>
              <div style={styles.summary}>
                <Row label="Bác sĩ" value={<b>{booked.doctor.full_name}</b>} />
                <Row label="Chuyên khoa" value={booked.doctor.specialty} />
                <Row label="Ngày khám" value={formatDate(booked.appointment_date)} />
                <Row label="Giờ khám" value={`${booked.start_time} - ${booked.end_time}`} />
                {booked.symptoms && <Row label="Triệu chứng" value={booked.symptoms} />}
                <Row label="Trạng thái" value={STATUS_LABEL[booked.status] ?? booked.status} />
                <Row label="Đặt lúc" value={formatDateTimeVN(booked.created_at)} />
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
                <select 
                  value={doctorId} 
                  onChange={(e) => changeDoctor(e.target.value)} 
                  style={{ ...styles.input, ...(errors.doctor_id ? styles.inputError : {}) }} 
                  disabled={doctorsLoading || availLoading}
                >
                  <option value="">
                    {doctorsLoading 
                      ? 'Đang tải danh sách bác sĩ...' 
                      : availLoading 
                        ? 'Đang tải bác sĩ làm việc ngày này...' 
                        : doctorOptions.length === 0 
                          ? 'Không có bác sĩ phù hợp' 
                          : 'Chọn bác sĩ'}
                  </option>
                  {doctorOptions.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.full_name} - {d.specialty}
                    </option>
                  ))}
                </select>
                {filterByDate && doctorOptions.length > 0 && (
                  <span style={styles.hint}>Chỉ hiện bác sĩ còn khung giờ đặt được ngày {formatDate(date)}.</span>
                )}
              </Group>

              <div style={styles.row}>
                <Group label="Ngày khám" error={dateError}>
                  <input 
                    type="date" 
                    value={date} 
                    min={minDate} 
                    max={maxDate} 
                    onChange={(e) => changeDate(e.target.value)} 
                    style={{ ...styles.input, ...(dateError ? styles.inputError : {}) }} 
                  />
                </Group>
              </div>

              {/* Lưới hiển thị các khung giờ khám (Giờ đã có người đặt sẽ hiển thị màu xám và bị khóa) */}
              <Group label="Giờ khám" error={errors.time}>
                {!dateKnown || !doctorId ? (
                  <div style={styles.slotNote}>Chọn ngày khám và bác sĩ trước</div>
                ) : availLoading ? (
                  <div style={styles.slotNote}>Đang tải khung giờ...</div>
                ) : slotViews.length > 0 ? (
                  <>
                    <div style={styles.slotGrid} role="group" aria-label="Khung giờ khám">
                      {slotViews.map((s) => {
                        const selected = s.time === time;
                        const disabled = s.state !== 'free';
                        return (
                          <button
                            key={s.time}
                            type="button"
                            disabled={disabled}
                            aria-pressed={selected}
                            title={s.state === 'taken' ? 'Đã có người đặt' : s.state === 'soon' ? `Phải đặt trước giờ khám ít nhất ${BOOKING_MIN_HOURS} giờ` : undefined}
                            onClick={() => { setTime(s.time); clearError('time'); }}
                            style={{ ...styles.slot, ...(selected ? styles.slotOn : {}), ...(disabled ? styles.slotOff : {}) }}
                          >
                            {s.time}
                          </button>
                        );
                      })}
                    </div>
                    {hasGrey && <span style={styles.hint}>Giờ màu xám: đã có người đặt hoặc không đủ {BOOKING_MIN_HOURS} giờ trước giờ khám.</span>}
                  </>
                ) : (
                  <div style={styles.slotNote}>Bác sĩ không có lịch làm việc trong ngày này</div>
                )}
              </Group>

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
  row: { display: 'grid', gridTemplateColumns: '1fr', gap: 12 },
  group: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 14, fontWeight: 700, color: '#1e293b' },
  input: { padding: '10px 12px', fontSize: 14, borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', borderRadius: 8, outline: 'none', backgroundColor: '#fff', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' },
  inputError: { borderColor: '#ef4444' },
  error: { fontSize: 12, color: '#ef4444' },
  hint: { fontSize: 12, color: '#64748b' },
  slotNote: { padding: '10px 12px', fontSize: 13, color: '#94a3b8', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8 },
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 },
  slot: { padding: '8px 0', fontSize: 13, fontWeight: 600, color: '#1e293b', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
  slotOn: { color: '#fff', backgroundColor: '#2563eb', borderColor: '#2563eb' },
  slotOff: { color: '#94a3b8', backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', cursor: 'not-allowed', textDecoration: 'line-through' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  btnPrimary: { padding: '10px 26px', fontSize: 14, fontWeight: 600, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg,#4f9cf9,#3b82f6)' },
  btnLine: { padding: '10px 22px', fontSize: 14, fontWeight: 600, color: '#2563eb', backgroundColor: '#fff', border: '1.5px solid #2563eb', borderRadius: 8, cursor: 'pointer' },
  banner: { padding: '12px 14px', marginBottom: 14, borderRadius: 8, fontSize: 14 },
  bannerOk: { color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' },
  bannerError: { color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' },
  okBox: { display: 'flex', alignItems: 'center', gap: 12 },
  check: { flexShrink: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', backgroundColor: '#16a34a', borderRadius: '50%' },
  summary: { display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', fontSize: 14, color: '#334155', backgroundColor: '#f5faff', border: '1px solid #dbeafe', borderRadius: 8 },
  sumRow: { display: 'grid', gridTemplateColumns: '104px 1fr', gap: 8 },
  sumLabel: { color: '#64748b' },
  sumValue: { color: '#0f172a', overflowWrap: 'anywhere' },
};