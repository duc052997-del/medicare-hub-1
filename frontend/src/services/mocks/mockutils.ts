// services/mocks/mockUtils.ts
// Tiện ích dùng chung cho các mock.

// Độ trễ giả 300-600ms để test trạng thái "đang tải"
export const delay = (min = 300, max = 600) =>
  new Promise<void>((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));

// Giống getTodayInVietnam() ở backend (UTC+7)
export const getTodayInVietnam = () => {
  const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
};

// Đọc cờ bật/tắt từ localStorage để tester ép mock trả trạng thái đặc biệt
export const flag = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
