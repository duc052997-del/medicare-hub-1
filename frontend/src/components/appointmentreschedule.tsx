// components/appointmentreschedule.tsx — UC011 (bệnh nhân): form ĐỔI LỊCH (API-21), hiện trong hộp thoại Chi tiết lịch hẹn.
// Chỉ đổi ngày/giờ, giữ nguyên bác sĩ. Khung giờ lấy từ API-08 của đúng bác sĩ; luật chọn giờ như đặt lịch UC006
// (từ ngày mai tới +30 ngày, trước giờ khám >= 24 giờ). Dựng danh sách ô giờ ở utils/reschedule.ts.
import { useEffect, useMemo, useState } from 'react';
import { appointmentService } from '../services/appointmentservice';
import { doctorService } from '../services/doctorservice';
import { ApiError, GENERIC_ERROR } from '../services/apierror';
import { formatDate } from '../utils/helpers';
import { BOOKING_MIN_HOURS, isRealDate, maxBookingDate, minBookingDate } from '../utils/schedule';
import { buildRescheduleSlots } from '../utils/reschedule';
import { detailStyles as s } from '../styles/appointmentdetail';
import type { Appointment, Slot } from '../types';
import type { AppointmentDetail } from '../types/appointmentdetail';

interface AppointmentRescheduleProps {
  appointment: AppointmentDetail;
  onBack: () => void;
  onDone: (updated: Appointment, message: string) => void;
  onStale: () => void; // lịch đã đổi ở nơi khác (404 / RESCHEDULE_NOT_ALLOWED): danh sách bên ngoài đã cũ
}

export default function AppointmentReschedule({ appointment: a, onBack, onDone, onStale }: AppointmentRescheduleProps) {
  const minDate = minBookingDate();
  const maxDate = maxBookingDate();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [version, setVersion] = useState(0); // tăng để tải lại giờ trống (sau khi bị báo trùng giờ)
  const [mine, setMine] = useState<Appointment[]>([]);
  const [errors, setErrors] = useState<{ date?: string; time?: string }>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stale, setStale] = useState(false);

  // Các lịch khác của chính bệnh nhân: khung giờ trùng với chúng bị ẩn
  useEffect(() => {
    appointmentService.getMyAppointments().then(setMine).catch(() => setMine([]));
  }, [version]);

  const rangeError =
    date && (!isRealDate(date) || date < minDate || date > maxDate)
      ? `Chỉ được chọn ngày từ ${formatDate(minDate)} đến ${formatDate(maxDate)}`
      : '';
  const dateKnown = !!date && !rangeError;

  useEffect(() => {
    if (!dateKnown) {
      setSlots([]);
      setSlotsError('');
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError('');
    doctorService
      .getSchedule(a.doctor.id, date)
      .then((r) => !cancelled && setSlots(r.slots))
      .catch((err) => {
        if (cancelled) return;
        setSlots([]);
        setSlotsError(err instanceof ApiError && err.message ? err.message : 'Không thể tải lịch làm việc của bác sĩ.');
      })
      .finally(() => !cancelled && setSlotsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateKnown, date, a.doctor.id, version]);

  const views = useMemo(() => buildRescheduleSlots({ slots, date, current: a, mine }), [slots, date, a, mine]);
  const hasGrey = views.some((v) => v.state !== 'free');

  const changeDate = (v: string) => {
    setDate(v);
    setTime('');
    setErrors({});
    setError('');
  };

  const submit = async () => {
    const errs: { date?: string; time?: string } = {};
    if (!date) errs.date = 'Vui lòng chọn ngày khám mới!';
    else if (rangeError) errs.date = rangeError;
    if (!time) errs.time = 'Vui lòng chọn khung giờ mới!';
    else if (!views.some((v) => v.state === 'free' && v.time === time)) errs.time = 'Khung giờ này không còn khả dụng, vui lòng chọn lại!';
    setErrors(errs);
    if (errs.date || errs.time) return;

    setSubmitting(true);
    setError('');
    try {
      const result = await appointmentService.reschedule(a.id, { date, time });
      onDone(result.appointment, result.message || 'Đổi lịch hẹn thành công');
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setError(apiErr?.message || GENERIC_ERROR);
      if (apiErr?.field === 'date' || apiErr?.field === 'time') setErrors({ [apiErr.field]: apiErr.message });
      if (apiErr?.code === 'SLOT_TAKEN' || apiErr?.code === 'SLOT_NOT_IN_SCHEDULE') {
        setTime('');
        setVersion((v) => v + 1); // tải lại giờ trống để ô vừa bị chiếm chuyển xám
      }
      if (apiErr?.status === 404 || apiErr?.code === 'RESCHEDULE_NOT_ALLOWED') {
        setStale(true);
        onStale();
      }
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={s.summary}>
        <div style={s.sumRow}><span style={s.sumLabel}>Bác sĩ</span><span style={s.sumValue}><b>{a.doctor.full_name}</b> ({a.doctor.specialty})</span></div>
        <div style={s.sumRow}><span style={s.sumLabel}>Lịch hiện tại</span><span style={s.sumValue}>{a.start_time} - {a.end_time}, {formatDate(a.appointment_date)}</span></div>
      </div>

      <div style={s.group}>
        <label style={s.label}>Ngày khám mới <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          disabled={submitting || stale}
          onChange={(e) => changeDate(e.target.value)}
          style={{ ...s.input, ...(rangeError || errors.date ? s.inputError : {}) }}
        />
        {(rangeError || errors.date) && <span role="alert" style={s.error}>{rangeError || errors.date}</span>}
      </div>

      <div style={s.group}>
        <label style={s.label}>Giờ khám mới <span style={{ color: '#ef4444' }}>*</span></label>
        {!dateKnown ? (
          <div style={s.slotNote}>Chọn ngày khám mới trước</div>
        ) : slotsLoading ? (
          <div style={s.slotNote}>Đang tải khung giờ...</div>
        ) : slotsError ? (
          <div role="alert" style={{ ...s.notice, ...s.noticeError }}>{slotsError}</div>
        ) : views.length === 0 ? (
          <div style={s.slotNote}>Bác sĩ không có lịch làm việc trong ngày này</div>
        ) : (
          <>
            <div style={s.slotGrid} role="group" aria-label="Khung giờ khám mới">
              {views.map((v) => {
                const disabled = v.state !== 'free' || submitting || stale;
                return (
                  <button
                    key={v.time}
                    type="button"
                    disabled={disabled}
                    aria-pressed={v.time === time}
                    title={
                      v.state === 'taken' ? 'Đã có người đặt'
                      : v.state === 'soon' ? `Phải đặt trước giờ khám ít nhất ${BOOKING_MIN_HOURS} giờ`
                      : v.state === 'current' ? 'Khung giờ hiện tại của lịch này'
                      : undefined
                    }
                    onClick={() => { setTime(v.time); setErrors((e) => ({ ...e, time: undefined })); setError(''); }}
                    style={{
                      ...s.slot,
                      ...(v.time === time ? s.slotOn : {}),
                      ...(v.state === 'current' ? s.slotCurrent : v.state !== 'free' ? s.slotOff : {}),
                    }}
                  >
                    {v.time}
                  </button>
                );
              })}
            </div>
            {hasGrey && <span style={s.fieldHint}>Giờ màu xám: đã có người đặt hoặc không đủ {BOOKING_MIN_HOURS} giờ trước giờ khám; ô viền xanh là giờ hiện tại.</span>}
          </>
        )}
        {errors.time && <span role="alert" style={s.error}>{errors.time}</span>}
      </div>

      {error && <div role="alert" style={{ ...s.notice, ...s.noticeError }}>{error}</div>}

      <div style={s.actions}>
        <button type="button" className="mh-btn" onClick={onBack} disabled={submitting} style={s.btnLine}>{stale ? 'Đóng' : 'Quay lại'}</button>
        {!stale && (
          <button type="button" className="mh-btn" onClick={submit} disabled={submitting} style={{ ...s.btnPrimary, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Đang đổi lịch...' : 'Xác nhận đổi lịch'}
          </button>
        )}
      </div>
    </>
  );
}