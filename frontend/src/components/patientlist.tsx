// components/patientlist.tsx — UC012: danh sách + tìm kiếm bệnh nhân (Admin).
// Luồng theo SRS: mở trang -> hiện danh sách đầy đủ (API-28) -> gõ từ khóa thì gọi lại API-28 với ?q= ->
// bấm "Xem hồ sơ" mới gọi API-29 (PatientDetail).
//   5a : không khớp -> "Không tìm thấy bệnh nhân phù hợp" + gợi ý, có nút xóa từ khóa để xem lại toàn bộ danh sách
//   Lỗi tải dữ liệu -> hộp báo lỗi + "Thử lại"
// Ô tìm kiếm luôn nằm trên màn hình (không bị gỡ khi đang tải) để gõ liên tục không mất con trỏ.
import { useEffect, useState } from 'react';
import PatientRow from './patientrow';
import PatientDetail from './patientdetail';
import { usePatients } from '../utils/usepatients';
import { patientStyles as s } from '../styles/patients';
import type { AuthUser } from '../types';
import type { PatientSummary } from '../types/patient';

const PAGE_SIZE = 8;

interface PatientListProps {
  user?: AuthUser | null;
  onLogin: () => void;
}

export default function PatientList({ user, onLogin }: PatientListProps) {
  const isAdmin = user?.role === 'ADMIN';
  const { keyword, setKeyword, clearKeyword, list, total, loading, loaded, error, reload } = usePatients(isAdmin);

  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<PatientSummary | null>(null);

  // Đổi từ khóa thì quay về trang đầu
  useEffect(() => setVisible(PAGE_SIZE), [keyword]);

  // ---------- Chưa đăng nhập / không phải admin (phân quyền thật do BE chặn 403) ----------
  if (!user) {
    return (
      <section style={s.listSection}>
        <div style={s.hintBox}>
          Vui lòng <span style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }} onClick={onLogin}>đăng nhập</span> bằng tài khoản quản trị để quản lý bệnh nhân.
        </div>
      </section>
    );
  }
  if (!isAdmin) {
    return (
      <section style={s.listSection}>
        <div style={s.hintBox}>Chức năng quản lý bệnh nhân chỉ dành cho quản trị viên.</div>
      </section>
    );
  }

  const searching = keyword.trim().length > 0;
  const shown = list.slice(0, visible);
  const firstLoad = loading && !loaded;

  return (
    <>
      {/* Ô tìm kiếm (nổi lên dải banner như các trang khác) */}
      <section style={s.filterSection}>
        <div style={s.filterCard}>
          <div style={s.inputGroup}>
            <label htmlFor="patient-search" style={s.label}>🔍 Tìm kiếm bệnh nhân</label>
            <input
              id="patient-search"
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập họ tên, mã bệnh nhân hoặc số điện thoại..."
              style={s.input}
              autoComplete="off"
            />
            <span style={s.filterHint}>Ví dụ: “Nguyễn Văn An”, “BN000001” hoặc “0911111111”.</span>
          </div>

          {searching && (
            <div style={s.resetWrap}>
              <button type="button" onClick={clearKeyword} style={s.resetBtn}>🔄 Xóa từ khóa</button>
            </div>
          )}
        </div>
      </section>

      <section style={s.listSection}>
        {/* Lỗi tải dữ liệu (SRS hình 3.41) */}
        {error && (
          <div role="alert" style={s.errorBox}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <div style={{ ...s.hintTitle, color: '#b91c1c' }}>Lỗi tải dữ liệu</div>
            <div style={{ marginBottom: 14 }}>{error}</div>
            <button type="button" className="mh-btn" onClick={reload} style={s.btnLine}>Thử lại</button>
          </div>
        )}

        {/* Đang tải lần đầu */}
        {!error && firstLoad && <div style={s.hintBox}>Đang tải danh sách bệnh nhân...</div>}

        {/* Đã có dữ liệu (kể cả khi đang tìm lại: giữ danh sách cũ, làm mờ nhẹ) */}
        {!error && loaded && (
          <>
            <div style={s.titleRow}>
              <div style={s.resultSummary}>
                {loading ? (
                  <>Đang tìm kiếm...</>
                ) : searching ? (
                  <>Tìm thấy <b>{list.length}</b>{total !== null ? ` / ${total}` : ''} bệnh nhân</>
                ) : (
                  <>Tổng cộng <b>{list.length}</b> bệnh nhân</>
                )}
              </div>
            </div>

            {list.length === 0 ? (
              searching ? (
                // SRS 5a.1: thông báo + gợi ý; 5a.2: sửa từ khóa hoặc xóa để xem toàn bộ
                <div style={{ ...s.hintBox, opacity: loading ? 0.6 : 1 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
                  <div style={s.hintTitle}>Không tìm thấy bệnh nhân phù hợp</div>
                  <div style={{ marginBottom: 14 }}>Hãy kiểm tra lại từ khóa hoặc thử tìm bằng mã bệnh nhân / số điện thoại.</div>
                  <button type="button" onClick={clearKeyword} style={s.btnLine}>Xóa từ khóa</button>
                </div>
              ) : (
                <div style={s.hintBox}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🧑‍⚕️</div>
                  <div style={s.hintTitle}>Chưa có bệnh nhân nào</div>
                  <div>Bệnh nhân sẽ xuất hiện ở đây sau khi đăng ký tài khoản.</div>
                </div>
              )
            ) : (
              <>
                <div style={{ ...s.rows, opacity: loading ? 0.55 : 1 }}>
                  {shown.map((p) => (
                    <PatientRow key={p.id} patient={p} onOpen={() => setSelected(p)} />
                  ))}
                </div>
                {list.length > visible && (
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button type="button" className="mh-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)} style={s.btnLine}>
                      Xem thêm ({list.length - visible})
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      {selected && (
        <PatientDetail summary={selected} onClose={() => setSelected(null)} onStale={reload} />
      )}
    </>
  );
}
