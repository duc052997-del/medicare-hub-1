
jest.mock('../src/config/supabase.config', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase.config');
const { getClinicIntro } = require('../src/controllers/home.controller');

describe('UC004 - GET /api/home', () => {
  let req;
  let res;
  let query;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {};

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    query = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };

    supabase.from.mockReturnValue(query);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TC01 - Có thông tin phòng khám
  test('TC01 - Trả về HTTP 200 khi có dữ liệu', async () => {
    const clinic = {
      id: 'clinic-1',
      name: 'MediCare Hub',
      description: 'Phòng khám đa khoa',
      hotline: '0123456789',
      address: 'Hà Nội',
      email: 'contact@example.com',
      working_hours: '08:00 - 17:00',
    };

    query.maybeSingle.mockResolvedValue({
      data: clinic,
      error: null,
    });

    await getClinicIntro(req, res);

    // Kiểm tra truy vấn đúng bảng
    expect(supabase.from).toHaveBeenCalledWith('clinic_info');

    // Kiểm tra sắp xếp theo thời gian cập nhật mới nhất
    expect(query.order).toHaveBeenCalledWith(
      'updated_at',
      { ascending: false }
    );

    // Kiểm tra chỉ lấy tối đa 1 bản ghi
    expect(query.limit).toHaveBeenCalledWith(1);

    // Kiểm tra HTTP status
    expect(res.status).toHaveBeenCalledWith(200);

    // Kiểm tra JSON response
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Lấy thông tin phòng khám thành công',
      clinic,
    });
  });

  // TC02 - Không có thông tin phòng khám
  test('TC02 - Trả về HTTP 404 khi không có dữ liệu', async () => {
    query.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await getClinicIntro(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Chưa có thông tin giới thiệu phòng khám',
    });
  });

  // TC03 - Supabase trả về lỗi
  test('TC03 - Trả về HTTP 500 khi truy vấn lỗi', async () => {
    query.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    await getClinicIntro(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    });
  });
});
