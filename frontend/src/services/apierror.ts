// services/apiError.ts
// Lỗi chuẩn của FE. Dù gọi BE thật hay mock, mọi service đều ném ApiError
// theo khuôn lỗi trong hợp đồng: { success:false, message, code?, field? }.

export class ApiError extends Error {
  status: number; // 0 = không kết nối được máy chủ
  code?: string; // TOKEN_EXPIRED, SLOT_TAKEN...
  field?: string; // tên ô nhập bị lỗi (email, password...)

  constructor(status: number, message: string, code?: string, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.field = field;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const GENERIC_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại sau';

export const toApiError = (err: unknown): ApiError =>
  err instanceof ApiError ? err : new ApiError(0, GENERIC_ERROR);
