// utils/response.js
// Chuan hoa dinh dang response de FE xu ly thong nhat, va de khong lo
// chi tiet loi noi bo (ten bang, ten cot, stack trace...) ra ngoai.

const success = (res, status, message, data = undefined) => {
  const body = { success: true, message };
  if (data !== undefined) Object.assign(body, data);
  return res.status(status).json(body);
};

const fail = (res, status, message, extra = undefined) => {
  const body = { success: false, message };
  if (extra !== undefined) Object.assign(body, extra);
  return res.status(status).json(body);
};

// Loi ngoai y muon: log day du o server, tra ve client cau chung chung
const serverError = (res, context, error) => {
  console.error(`[${context}]`, error);
  return fail(res, 500, 'Đã có lỗi xảy ra, vui lòng thử lại sau');
};

module.exports = { success, fail, serverError };
