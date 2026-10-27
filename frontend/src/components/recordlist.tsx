// components/recordlist.tsx — UC008: danh sách hồ sơ bệnh án của bệnh nhân.
// Gọi API-11 MỘT lần, lọc phía client: tìm kiếm, chuyên khoa, ngày khám. Bấm "Xem chi tiết" mới gọi API-12.
// Bố cục như UC007/trang Bác sĩ: thẻ bộ lọc nổi lên banner, bên dưới mỗi hàng là 1 hồ sơ.
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import RecordRow from './recordrow';
import RecordDetail from './recorddetail';
import { medicalRecordService } from '../services/medicalrecordservice';
import { ApiError } from '../services/apierror';
import { useDoctorDirectory } from '../utils/usedoctordirectory';
import { normalize } from '../utils/text';
import { formatDate } from '../utils/helpers';
import { recordStyles as s } from '../styles/records';
import type { AuthUser } from '../types';
import type { MedicalRecordSummary } from '../types/medical';

const PAGE_SIZE = 6;
const ALL = 'Tất cả chuyên khoa';

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={s.inputGroup}>
    <label style={s.label}>{label}</label>
    {children}
  </div>
);

const Hint = ({ children }: { children: ReactNode }) => (
  <section style={s.listSection}>{children}</section>
);

interface RecordListProps {
  user?: AuthUser | null;
  onLogin: () => void;
  onSchedule: () => void;
}

export default function RecordList({ user, onLogin, onSchedule }: RecordListProps) {
  const isPatient = user?.role === 'PATIENT';
  const { doctorMap, featuredIds } = useDoctorDirectory(isPatient);

  const [list, setList] = useState<MedicalRecordSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const [keyword, setKeyword] = useState('');
  const [specialty, setSpecialty] = useState(ALL);
  const [date, setDate] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<MedicalRecordSummary | null>(null);

  // Tải danh sách (API-11). Đổi tài khoản / bấm "Thử lại" / hồ sơ đã cũ (404) thì tải lại.
  useEffect(() => {
    if (!isPatient) {
      setList([]);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    medicalRecordService
      .getMyRecords()
      .then((data) => !cancelled && setList(data))
      .catch((err) => {
        if (cancelled) return;
        setList([]);
        setError(err instanceof ApiError && err.message ? err.message : 'Không thể tải hồ sơ bệnh án, vui lòng thử lại sau.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isPatient, user?.id, retry]);

  // Đổi bộ lọc thì quay về trang đầu
  useEffect(() => setVisible(PAGE_SIZE), [keyword, specialty, date]);

  const specialties = useMemo(
    () => [...new Set(list.map((r) => r.doctor.specialty))].sort((a, b) => a.localeCompare(b, 'vi')),
    [list]
  );

  const filtered = useMemo(() => {
    const kw = normalize(keyword.trim());
    return list
      .filter((r) => {
        if (specialty !== ALL && r.doctor.specialty !== specialty) return false;
        if (date && r.appointment_date !== date) return false;
        if (!kw) return true;
        const haystack = normalize(
          [r.doctor.full_name, r.doctor.specialty, r.diagnosis, formatDate(r.appointment_date)].join(' ')
        );
        return haystack.includes(kw);
      })
      .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date)); // mới nhất lên trên
  }, [list, keyword, specialty, date]);

  const hasFilter = !!(keyword || specialty !== ALL || date);
  const resetFilters = () => {
    setKeyword('');
    setSpecialty(ALL);
    setDate('');
  };

  // ---------- Chưa đăng nhập / không phải bệnh nhân ----------
  if (!user) {
    return (
      <Hint>
        <div style={s.hintBox}>
          Vui lòng <span style={s.link} onClick={onLogin}>đăng nhập</span> để xem hồ sơ bệnh án của bạn.
        </div>
      </Hint>
    );
  }
  if (!isPatient) {
    return <Hint><div style={s.hintBox}>Hồ sơ bệnh án chỉ dành cho tài khoản bệnh nhân.</div></Hint>;
  }

  // ---------- Đang tải (lần đầu) / lỗi ----------
  if (loading && list.length === 0) {
    return <Hint><div style={s.hintBox}>Đang tải hồ sơ bệnh án...</div></Hint>;
  }
  if (error) {
    return (
      <Hint>
        <div style={{ ...s.hintBox, color: '#b91c1c', borderColor: '#fecaca' }}>
          <div style={{ marginBottom: 10 }}>{error}</div>
          <button className="mh-btn" onClick={() => setRetry((n) => n + 1)} style={s.btnLine}>Thử lại</button>
        </div>
      </Hint>
    );
  }

  // ---------- Chưa có hồ sơ (SRS UC008 luồng 2a) ----------
  if (list.length === 0) {
    return (
      <Hint>
        <div style={s.hintBox}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🩺</div>
          <div style={{ marginBottom: 4 }}>Không tìm thấy hồ sơ bệnh án</div>
          <div style={{ marginBottom: 12, fontSize: 13 }}>Hồ sơ được tạo sau khi bác sĩ hoàn tất buổi khám của bạn.</div>
          <button className="mh-btn" onClick={onSchedule} style={s.btnPrimary}>Xem lịch khám</button>
        </div>
      </Hint>
    );
  }

  const shown = filtered.slice(0, visible);

  return (
    <>
      <section style={s.filterSection}>
        <div style={s.filterCard}>
          <div style={s.filterGrid}>
            <Group label="🔍 Tìm kiếm hồ sơ">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tên bác sĩ, chuyên khoa, chẩn đoán..."
                style={s.input}
              />
            </Group>
            <Group label="🩺 Chuyên khoa">
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={s.select}>
                <option value={ALL}>{ALL}</option>
                {specialties.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
              </select>
            </Group>
            <Group label="📅 Ngày khám">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={s.input} />
            </Group>
          </div>

          {hasFilter && (
            <div style={s.resetWrap}>
              <button onClick={resetFilters} style={s.resetBtn}>🔄 Xóa bộ lọc</button>
            </div>
          )}
        </div>
      </section>

      <section style={s.listSection}>
        <div style={s.titleRow}>
          <div style={s.resultSummary}>
            {hasFilter ? (
              <>Tìm thấy <b>{filtered.length}</b> / {list.length} hồ sơ</>
            ) : (
              <>Tổng cộng <b>{list.length}</b> hồ sơ bệnh án</>
            )}
          </div>
          <button className="mh-btn" onClick={onSchedule} style={s.btnLine}>Xem lịch khám</button>
        </div>

        {filtered.length === 0 ? (
          <div style={s.hintBox}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
            <div style={{ marginBottom: 12 }}>Không có hồ sơ nào phù hợp với bộ lọc.</div>
            <button onClick={resetFilters} style={s.btnLine}>Xóa bộ lọc</button>
          </div>
        ) : (
          <>
            <div style={s.rows}>
              {shown.map((r) => (
                <RecordRow
                  key={r.id}
                  record={r}
                  doctor={doctorMap[String(r.doctor.id)]}
                  featured={featuredIds.has(String(r.doctor.id))}
                  onOpen={() => setSelected(r)}
                />
              ))}
            </div>
            {filtered.length > visible && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button className="mh-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)} style={s.btnLine}>
                  Xem thêm ({filtered.length - visible})
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selected && (
        <RecordDetail
          summary={selected}
          doctor={doctorMap[String(selected.doctor.id)]}
          featured={featuredIds.has(String(selected.doctor.id))}
          onClose={() => setSelected(null)}
          onStale={() => setRetry((n) => n + 1)}
        />
      )}
    </>
  );
}