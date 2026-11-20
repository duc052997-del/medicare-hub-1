
/**
 * Unit Test UC007 - Xem lịch sử đặt lịch
 * API: GET /api/appointments/my
 *
 * Mock Supabase, không truy vấn database thật.
 */

jest.mock('../src/config/supabase.config', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase.config');
const {
  getMyAppointments,
} = require('../src/controllers/appointment.controller');

describe('UC007 - GET /api/appointments/my', () => {
  let req;
  let res;
  let patientQuery;
  let appointmentQuery;
  let appointmentResult;

  const PATIENT_ID = 'patient-uuid-001';
  const USER_ID = 'user-uuid-001';

  const sampleAppointments = [
    {
      id: 'appointment-001',
      appointment_date: '2026-10-22',
      start_time: '10:00:00',
      end_time: '10:30:00',
      symptoms: 'Đau bụng',
      status: 'CONFIRMED',
      cancel_reason: null,
      created_at: '2026-10-14T05:17:45Z',
      doctor: {
        id: 'doctor-001',
        full_name: 'BS. Đặng Ngọc Mai',
        specialty: 'Sản phụ khoa',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: {
        id: USER_ID,
        role: 'PATIENT',
      },
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock truy vấn bảng patients
    patientQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: PATIENT_ID },
        error: null,
      }),
    };

    // Kết quả mặc định của truy vấn appointments
    appointmentResult = {
      data: sampleAppointments,
      error: null,
    };

    // Mock Supabase Query Builder
    // .order() và .eq() trả về query để gọi nối tiếp.
    // .then() mô phỏng kết quả khi await query.
    appointmentQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),

      then: jest.fn((resolve, reject) => {
        return Promise.resolve(appointmentResult).then(
          resolve,
          reject
        );
      }),
    };

    supabase.from.mockImplementation((table) => {
      if (table === 'patients') {
        return patientQuery;
      }

      if (table === 'appointments') {
        return appointmentQuery;
      }

      throw new Error(`Bảng không mong đợi: ${table}`);
    });

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =====================================================
  // UT01 - Bệnh nhân có lịch hẹn
  // =====================================================
  test('UT01 - Trả về HTTP 200 khi có lịch hẹn', async () => {
    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Lấy lịch sử đặt lịch thành công',
        appointments: expect.arrayContaining([
          expect.objectContaining({
            id: 'appointment-001',
            status: 'CONFIRMED',
          }),
        ]),
      })
    );
  });

  // =====================================================
  // UT02 - Bệnh nhân chưa có lịch hẹn
  // =====================================================
  test('UT02 - Trả về mảng rỗng khi chưa có lịch hẹn', async () => {
    appointmentResult = {
      data: [],
      error: null,
    };

    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Bạn chưa có lịch sử đặt lịch khám',
        appointments: [],
      })
    );
  });

  // =====================================================
  // UT03 - Lọc trạng thái COMPLETED
  // =====================================================
  test('UT03 - Lọc lịch hẹn theo trạng thái COMPLETED', async () => {
    req.query.status = 'COMPLETED';

    appointmentResult = {
      data: [
        {
          ...sampleAppointments[0],
          status: 'COMPLETED',
        },
      ],
      error: null,
    };

    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(appointmentQuery.eq).toHaveBeenCalledWith(
      'status',
      'COMPLETED'
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        appointments: expect.arrayContaining([
          expect.objectContaining({
            status: 'COMPLETED',
          }),
        ]),
      })
    );
  });

  // =====================================================
  // UT04 - Trạng thái không hợp lệ
  // =====================================================
  test('UT04 - Trả về HTTP 400 khi status không hợp lệ', async () => {
    req.query.status = 'INVALID';

    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Trạng thái không hợp lệ',
      })
    );

    expect(supabase.from).not.toHaveBeenCalled();
  });

  // =====================================================
  // UT05 - Không tìm thấy hồ sơ bệnh nhân
  // =====================================================
  test('UT05 - Trả về HTTP 200 khi chưa có hồ sơ bệnh nhân', async () => {
    patientQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Bạn chưa có lịch sử đặt lịch khám',
        appointments: [],
      })
    );

    expect(supabase.from).not.toHaveBeenCalledWith(
      'appointments'
    );
  });

  // =====================================================
  // UT06 - Lỗi truy vấn patients
  // =====================================================
  test('UT06 - Trả về HTTP 500 khi truy vấn patients lỗi', async () => {
    patientQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
      })
    );
  });

  // =====================================================
  // UT07 - Lỗi truy vấn appointments
  // =====================================================
  test('UT07 - Trả về HTTP 500 khi truy vấn appointments lỗi', async () => {
    appointmentResult = {
      data: null,
      error: { message: 'Database error' },
    };

    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
      })
    );
  });

  // =====================================================
  // UT08 - Chỉ lấy lịch của bệnh nhân đăng nhập
  // =====================================================
  test('UT08 - Lọc lịch hẹn bằng patient_id từ JWT', async () => {
    await getMyAppointments(req, res);

    expect(patientQuery.eq).toHaveBeenCalledWith(
      'user_id',
      USER_ID
    );

    expect(appointmentQuery.eq).toHaveBeenCalledWith(
      'patient_id',
      PATIENT_ID
    );
  });

  // =====================================================
  // UT09 - Sắp xếp lịch hẹn mới nhất trước
  // =====================================================
  test('UT09 - Sắp xếp theo ngày khám giảm dần', async () => {
    await getMyAppointments(req, res);

    expect(appointmentQuery.order).toHaveBeenCalledWith(
      'appointment_date',
      expect.objectContaining({
        ascending: false,
      })
    );

    expect(appointmentQuery.order).toHaveBeenCalledWith(
      'start_time',
      expect.objectContaining({
        ascending: false,
      })
    );

    expect(appointmentQuery.order).toHaveBeenCalledTimes(2);
  });

  // =====================================================
  // UT10 - Không chấp nhận status dạng mảng
  // =====================================================
  test('UT10 - Trả về HTTP 400 khi status là mảng', async () => {
    req.query.status = ['PENDING', 'CONFIRMED'];

    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Trạng thái không hợp lệ',
      })
    );

    expect(supabase.from).not.toHaveBeenCalled();
  });

  // =====================================================
  // UT11 - Chuẩn hóa thời gian theo hợp đồng API-10
  // =====================================================
  test('UT11 - Trả về start_time và end_time theo HH:mm', async () => {
    await getMyAppointments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Lấy lịch sử đặt lịch thành công',
        appointments: expect.arrayContaining([
          expect.objectContaining({
            id: 'appointment-001',
            start_time: '10:00',
            end_time: '10:30',
          }),
        ]),
      })
    );
  });
});
