
jest.mock('../src/config/supabase.config', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase.config');
const { getFeaturedDoctors } = require('../src/controllers/doctor.controller');

describe('UC004 - GET /api/doctors/featured', () => {
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
      eq: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };

    supabase.from.mockReturnValue(query);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TC04 - Có bác sĩ nổi bật
  test('TC04 - Trả về HTTP 200 và danh sách bác sĩ', async () => {
    const doctors = [
      {
        id: 'doctor-1',
        full_name: 'Nguyễn Văn A',
        specialty: 'Nội khoa',
        avatar_url: null,
        bio: 'Bác sĩ chuyên khoa',
      },
    ];

    query.order.mockResolvedValue({
      data: doctors,
      error: null,
    });

    await getFeaturedDoctors(req, res);

    expect(supabase.from).toHaveBeenCalledWith('doctors');
    expect(query.eq).toHaveBeenCalledWith('is_featured', true);
    expect(query.eq).toHaveBeenCalledWith('is_active', true);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Lấy danh sách bác sĩ nổi bật thành công',
      doctors,
    });
  });

  // TC05 - Không có bác sĩ nổi bật
  test('TC05 - Trả về mảng rỗng khi không có bác sĩ', async () => {
    query.order.mockResolvedValue({
      data: [],
      error: null,
    });

    await getFeaturedDoctors(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Chưa có danh sách bác sĩ',
      doctors: [],
    });
  });

  // TC06 - Bác sĩ bị soft delete
  test('TC06 - Truy vấn chỉ lấy bác sĩ đang hoạt động', async () => {
    const activeDoctor = {
      id: 'doctor-1',
      full_name: 'Nguyễn Văn A',
      specialty: 'Nội khoa',
      avatar_url: null,
      bio: 'Bác sĩ đang hoạt động',
    };

    // Giả lập Supabase đã lọc bỏ bác sĩ is_active = false
    query.order.mockResolvedValue({
      data: [activeDoctor],
      error: null,
    });

    await getFeaturedDoctors(req, res);

    expect(query.eq).toHaveBeenCalledWith('is_active', true);
    expect(query.eq).toHaveBeenCalledWith('is_featured', true);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Lấy danh sách bác sĩ nổi bật thành công',
      doctors: [activeDoctor],
    });
  });

  // TC07 - Lỗi database
  test('TC07 - Trả về HTTP 500 khi Supabase lỗi', async () => {
    query.order.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    await getFeaturedDoctors(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
    });
  });
});
