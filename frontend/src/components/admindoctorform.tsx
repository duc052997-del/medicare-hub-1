// components/admindoctorform.tsx — Form thêm/sửa bác sĩ + lịch làm việc lặp theo tuần (UC010).
// SRS v8: lịch chỉ gồm các dòng thứ + giờ bắt đầu/kết thúc + thời lượng; không có mốc ngày/giai đoạn.
import { useEffect, useRef, useState } from 'react';
import AvatarPicker from './avatarpicker';
import { ApiError } from '../services/apierror';
import { adminDoctorService } from '../services/admindoctorservice';
import { adminDoctorStyles as s } from '../styles/admindoctors';
import type { AdminDoctor, AdminDoctorPayload, DoctorSchedule } from '../types/admindoctor';
import { DOCTOR_SPECIALTIES } from '../config/constants';
import { isValidEmail, isValidPhone } from '../utils/profileform';
import { toMinutes, WEEKDAY_LABELS, WEEKDAY_ORDER_MON_FIRST, weekdaySortKey } from '../utils/schedule';

// Tái sử dụng constants / utils chung (không nhân bản SPECIALTIES, regex, nhãn thứ)
const SPECIALTIES = DOCTOR_SPECIALTIES;
const DAY_LABEL = WEEKDAY_LABELS;
const DAY_ORDER = [...WEEKDAY_ORDER_MON_FIRST];
const daySortKey = weekdaySortKey;

const Req = () => <span style={s.reqStar}>*</span>;

type SlotRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
};

/** Sắp xếp T2→T7→CN, cùng thứ thì theo giờ bắt đầu */
const sortSlots = (slots: SlotRow[]): SlotRow[] =>
  [...slots].sort((a, b) => {
    const da = daySortKey(a.day_of_week);
    const db = daySortKey(b.day_of_week);
    if (da !== db) return da - db;
    return a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time);
  });

const emptySlot = (): SlotRow => ({
  day_of_week: 1,
  start_time: '08:00',
  end_time: '12:00',
  slot_minutes: 30,
});

/** Lịch từ BE → các dòng khung giờ (bỏ qua mọi mốc ngày cũ nếu có) */
const toSlots = (rows: DoctorSchedule[] | undefined): SlotRow[] =>
  rows?.length
    ? sortSlots(
        rows.map((x) => ({
          day_of_week: x.day_of_week,
          start_time: x.start_time.slice(0, 5),
          end_time: x.end_time.slice(0, 5),
          slot_minutes: x.slot_minutes,
        }))
      )
    : [emptySlot()];

const slotsToSchedules = (slots: SlotRow[]): AdminDoctorPayload['schedules'] =>
  slots.map((slot) => ({
    day_of_week: slot.day_of_week,
    start_time: slot.start_time,
    end_time: slot.end_time,
    slot_minutes: slot.slot_minutes,
  }));

type FieldErrors = Partial<
  Record<'full_name' | 'specialty' | 'email' | 'phone' | 'avatar_url' | 'schedules', string>
>;

interface DoctorFormProps {
  doctorId: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export default function AdminDoctorForm({ doctorId, onClose, onSaved }: DoctorFormProps) {
  const [form, setForm] = useState({
    full_name: '',
    specialty: SPECIALTIES[0],
    email: '',
    phone: '',
    avatar_url: '',
    bio: '',
    is_featured: false,
  });
  const [slots, setSlots] = useState<SlotRow[]>([emptySlot()]);
  const [loading, setLoading] = useState(!!doctorId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Lỗi từng dòng khung giờ: key = chỉ số dòng */
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const bodyRef = useRef<HTMLDivElement>(null);

  /** Cuộn trong khung form tới vùng có lỗi (field hoặc banner chung) */
  const scrollToError = (field?: keyof FieldErrors | 'form') => {
    requestAnimationFrame(() => {
      const root = bodyRef.current;
      if (!root) return;
      const sel =
        field && field !== 'form'
          ? `[data-field="${field}"]`
          : '[data-field="form-error"], [data-field="full_name"], [data-field="schedules"]';
      const el = root.querySelector(sel) as HTMLElement | null;
      (el || root).scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    setLoading(true);
    adminDoctorService
      .detail(doctorId)
      .then((d: AdminDoctor) => {
        if (cancelled) return;
        const specialty =
          SPECIALTIES.includes(d.specialty) || !d.specialty ? d.specialty || SPECIALTIES[0] : d.specialty;
        setForm({
          full_name: d.full_name,
          specialty,
          email: d.email,
          phone: d.phone,
          avatar_url: d.avatar_url ?? '',
          bio: d.bio ?? '',
          is_featured: d.is_featured,
        });
        setSlots(toSlots(d.schedules));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError && err.message ? err.message : 'Không tải được thông tin bác sĩ.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      if (key in next) delete next[key as keyof FieldErrors];
      return next;
    });
  };

  const clearScheduleError = () =>
    setErrors((e) => {
      const n = { ...e };
      delete n.schedules;
      return n;
    });

  const updateSlot = (si: number, patch: Partial<SlotRow>) => {
    setSlots((prev) => sortSlots(prev.map((sl, j) => (j === si ? { ...sl, ...patch } : sl))));
    setSlotErrors((e) => {
      const n = { ...e };
      delete n[String(si)];
      return n;
    });
    clearScheduleError();
  };

  const addSlot = () => {
    // Mặc định khi + Thêm khung giờ: CN 13:00–17:00
    const defaultNew: SlotRow = { day_of_week: 0, start_time: '13:00', end_time: '17:00', slot_minutes: 30 };
    setSlots((prev) => sortSlots([...prev, defaultNew]));
  };

  /** Luôn giữ ít nhất một dòng (SRS v8 UC010) */
  const removeSlot = (si: number) => {
    setSlots((prev) => {
      const next = sortSlots(prev.filter((_, j) => j !== si));
      return next.length ? next : [emptySlot()];
    });
  };

  const validateLocal = (list: SlotRow[] = slots): { fields: FieldErrors; slots: Record<string, string> } => {
    const e: FieldErrors = {};
    const slotErr: Record<string, string> = {};
    const name = form.full_name.trim();
    const email = form.email.trim();
    const phone = form.phone.replace(/\s/g, '');
    if (!name) e.full_name = 'Vui lòng nhập họ tên.';
    if (!form.specialty.trim()) e.specialty = 'Vui lòng chọn chuyên khoa.';
    if (!email) e.email = 'Vui lòng nhập email.';
    else if (!isValidEmail(email)) e.email = 'Email không hợp lệ (vd: ten@domain.com).';
    if (!phone) e.phone = 'Vui lòng nhập số điện thoại.';
    else if (!isValidPhone(phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0.';

    const mins = toMinutes;
    const BAD = 'Có khung giờ không hợp lệ — xem dòng đỏ.';
    list.forEach((row, si) => {
      const key = String(si);
      if (!row.start_time || !row.end_time) slotErr[key] = 'Thiếu giờ bắt đầu hoặc kết thúc.';
      else if (mins(row.end_time) <= mins(row.start_time)) slotErr[key] = 'Giờ kết thúc phải sau giờ bắt đầu.';
      else if (!row.slot_minutes || row.slot_minutes <= 0) slotErr[key] = 'Thời lượng slot phải > 0 (phút).';
      else if (row.slot_minutes > mins(row.end_time) - mins(row.start_time))
        slotErr[key] = 'Slot (phút) không được lớn hơn độ dài khung giờ.';
      if (slotErr[key]) e.schedules = BAD;
    });
    // Trùng / giao giờ cùng thứ → đánh dấu dòng phía sau
    for (let si = 0; si < list.length; si++) {
      const a = list[si];
      if (!a.start_time || !a.end_time || mins(a.end_time) <= mins(a.start_time)) continue;
      for (let sj = si + 1; sj < list.length; sj++) {
        const b = list[sj];
        if (!b.start_time || !b.end_time || a.day_of_week !== b.day_of_week) continue;
        const sameExact = a.start_time === b.start_time && a.end_time === b.end_time;
        const overlap = a.start_time < b.end_time && b.start_time < a.end_time;
        if (!sameExact && !overlap) continue;
        const dayName = DAY_LABEL[b.day_of_week] ?? `ngày ${b.day_of_week}`;
        slotErr[String(sj)] = sameExact
          ? `Trùng khung giờ với dòng trước: ${dayName} ${a.start_time}–${a.end_time}. Hãy xóa hoặc đổi giờ.`
          : `Giao giờ với khung ${dayName} ${a.start_time}–${a.end_time}. Hãy chỉnh giờ bắt đầu/kết thúc.`;
        e.schedules = 'Có khung giờ trùng hoặc chồng nhau — xem dòng đỏ bên dưới.';
      }
    }
    return { fields: e, slots: slotErr };
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    // Sắp xếp lại khung giờ T2→CN trước khi lưu
    const ordered = sortSlots(slots);
    setSlots(ordered);

    const local = validateLocal(ordered);
    const hasField = Object.keys(local.fields).length > 0;
    const hasSlot = Object.keys(local.slots).length > 0;
    if (hasField || hasSlot) {
      setErrors(local.fields);
      setSlotErrors(local.slots);
      setSaving(false);
      if (hasSlot) {
        const firstKey = Object.keys(local.slots)[0];
        scrollToError('schedules');
        requestAnimationFrame(() => {
          bodyRef.current
            ?.querySelector(`[data-slot="${firstKey}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else {
        const first = (['full_name', 'specialty', 'email', 'phone', 'avatar_url', 'schedules'] as const).find(
          (k) => local.fields[k]
        );
        scrollToError(first || 'form');
      }
      return;
    }
    setErrors({});
    setSlotErrors({});
    const payload: AdminDoctorPayload = {
      full_name: form.full_name.trim(),
      specialty: form.specialty.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.replace(/\s/g, ''),
      avatar_url: form.avatar_url?.trim() ? form.avatar_url.trim() : null,
      bio: form.bio?.trim() ? form.bio.trim() : null,
      is_featured: !!form.is_featured,
      schedules: slotsToSchedules(ordered),
    };
    try {
      const result = doctorId
        ? await adminDoctorService.update(doctorId, payload)
        : await adminDoctorService.create(payload);
      onSaved(result.message);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const msg = apiErr?.message || 'Không lưu được, vui lòng thử lại.';
      // Banner + lỗi dưới từng ô (nếu BE chỉ field)
      let field: keyof FieldErrors | 'form' = 'form';
      if (apiErr?.field === 'email') {
        const text = msg.includes('tồn tại') ? 'Email đã được dùng bởi bác sĩ khác.' : msg;
        setErrors({ email: text });
        setError(text);
        field = 'email';
      } else if (apiErr?.field === 'phone') {
        setErrors({ phone: msg });
        setError(msg);
        field = 'phone';
      } else if (apiErr?.field === 'full_name') {
        setErrors({ full_name: msg });
        setError(msg);
        field = 'full_name';
      } else if (apiErr?.field === 'specialty') {
        setErrors({ specialty: msg });
        setError(msg);
        field = 'specialty';
      } else if (apiErr?.field === 'schedules') {
        const detail =
          msg === 'Thông tin không hợp lệ'
            ? 'Lịch làm việc không hợp lệ (trùng giờ hoặc sai khung). Kiểm tra các dòng được đánh dấu đỏ.'
            : msg;
        setErrors({ schedules: detail });
        setError(detail);
        field = 'schedules';
      } else if (msg === 'Thông tin không hợp lệ') {
        setError('Dữ liệu chưa đúng quy tắc. Kiểm tra các ô/dòng được đánh dấu đỏ bên dưới.');
        setErrors({});
        field = 'form';
      } else {
        setError(msg);
        setErrors({});
        field = 'form';
      }
      scrollToError(field);
    } finally {
      setSaving(false);
    }
  };

  const initialLetter = (form.full_name.trim().charAt(0) || 'B').toUpperCase();
  const specialtyOptions =
    form.specialty && !SPECIALTIES.includes(form.specialty) ? [form.specialty, ...SPECIALTIES] : SPECIALTIES;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.formModal} onClick={(e) => e.stopPropagation()}>
        <h2 style={s.modalTitle}>{doctorId ? 'Cập nhật bác sĩ' : 'Thêm bác sĩ'}</h2>
        {loading ? (
          <div style={s.hintBox}>Đang tải...</div>
        ) : (
          <>
            <div style={s.formModalBody} ref={bodyRef}>
              {error && (
                <div data-field="form-error" style={{ ...s.notice, ...s.noticeErr }}>
                  {error}
                </div>
              )}

              <div style={s.formGrid}>
                <div style={{ ...s.inputGroup, ...s.formFull }} data-field="avatar_url">
                  <AvatarPicker
                    value={form.avatar_url}
                    initial={initialLetter}
                    error={errors.avatar_url}
                    disabled={saving}
                    onChange={(url) => setField('avatar_url', url)}
                    onError={(msg) => setErrors((prev) => ({ ...prev, avatar_url: msg }))}
                  />
                </div>

                <div style={s.inputGroup} data-field="full_name">
                  <label style={s.label}>
                    Họ tên <Req />
                  </label>
                  <input style={s.input} value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} />
                  {errors.full_name && <span style={s.fieldError}>{errors.full_name}</span>}
                </div>

                <div style={s.inputGroup} data-field="specialty">
                  <label style={s.label}>
                    Chuyên khoa <Req />
                  </label>
                  <select style={s.select} value={form.specialty} onChange={(e) => setField('specialty', e.target.value)}>
                    {specialtyOptions.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                  {errors.specialty && <span style={s.fieldError}>{errors.specialty}</span>}
                </div>

                <div style={s.inputGroup} data-field="email">
                  <label style={s.label}>
                    Email <Req />
                  </label>
                  <input
                    style={s.input}
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="ten@domain.com"
                  />
                  {errors.email && <span style={s.fieldError}>{errors.email}</span>}
                </div>

                <div style={s.inputGroup} data-field="phone">
                  <label style={s.label}>
                    Số điện thoại <Req />
                  </label>
                  <input
                    style={s.input}
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="0xxxxxxxxx (10 số)"
                    inputMode="numeric"
                  />
                  {errors.phone && <span style={s.fieldError}>{errors.phone}</span>}
                </div>

                <div style={{ ...s.inputGroup, ...s.formFull }}>
                  <label style={s.label}>Giới thiệu</label>
                  <textarea
                    style={{ ...s.input, minHeight: 64, resize: 'vertical' }}
                    value={form.bio}
                    onChange={(e) => setField('bio', e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
                  <input
                    id="featured"
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setField('is_featured', e.target.checked)}
                  />
                  <label htmlFor="featured">Bác sĩ nổi bật</label>
                </div>

                {/* —— Lịch làm việc lặp theo tuần —— */}
                <div style={{ ...s.inputGroup, ...s.formFull }} data-field="schedules">
                  <label style={s.label}>Lịch làm việc hằng tuần</label>
                  <p style={s.scheduleHint}>
                    Mỗi dòng là một khung giờ lặp lại hằng tuần: <b>thứ</b>, giờ bắt đầu, giờ kết thúc và thời lượng mỗi lượt khám.
                  </p>

                  <div style={s.scheduleScroll}>
                    <div style={s.slotList}>
                      <div style={s.slotHead}>
                        <span>Thứ</span>
                        <span>Bắt đầu</span>
                        <span>Kết thúc</span>
                        <span>Slot (phút)</span>
                        <span />
                      </div>
                      {slots.map((row, si) => {
                        const sk = String(si);
                        const bad = !!slotErrors[sk];
                        return (
                          <div key={si} data-slot={sk} style={s.slotBlock}>
                            <div style={s.scheduleRow}>
                              <select
                                style={{ ...s.select, ...(bad ? s.inputError : {}) }}
                                value={row.day_of_week}
                                onChange={(e) => updateSlot(si, { day_of_week: Number(e.target.value) })}
                              >
                                {DAY_ORDER.map((dow) => (
                                  <option key={dow} value={dow}>
                                    {DAY_LABEL[dow]}
                                  </option>
                                ))}
                              </select>
                              <input
                                style={{ ...s.input, ...(bad ? s.inputError : {}) }}
                                type="time"
                                value={row.start_time}
                                onChange={(e) => updateSlot(si, { start_time: e.target.value })}
                              />
                              <input
                                style={{ ...s.input, ...(bad ? s.inputError : {}) }}
                                type="time"
                                value={row.end_time}
                                onChange={(e) => updateSlot(si, { end_time: e.target.value })}
                              />
                              <input
                                style={{ ...s.input, ...(bad ? s.inputError : {}) }}
                                type="number"
                                min={5}
                                step={5}
                                value={row.slot_minutes}
                                onChange={(e) => updateSlot(si, { slot_minutes: Number(e.target.value) || 30 })}
                              />
                              <button type="button" className="mh-btn" style={s.confirmBtnGhost} onClick={() => removeSlot(si)}>
                                Xóa
                              </button>
                            </div>
                            {bad && <span style={s.fieldError}>{slotErrors[sk]}</span>}
                          </div>
                        );
                      })}
                      <button type="button" className="mh-btn" style={s.confirmBtnGhost} onClick={addSlot}>
                        + Thêm khung giờ
                      </button>
                    </div>
                  </div>
                  {errors.schedules && <span style={s.fieldError}>{errors.schedules}</span>}
                </div>
              </div>
            </div>

            <div style={s.formModalFooter}>
              <button type="button" className="mh-btn" style={s.confirmBtnGhost} onClick={onClose} disabled={saving}>
                Hủy
              </button>
              <button type="button" className="mh-btn" style={s.confirmBtnPrimary} onClick={submit} disabled={saving}>
                {saving ? 'Đang lưu...' : doctorId ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
