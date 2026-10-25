// utils/image.ts
// Xử lý ảnh phía trình duyệt, dùng chung cho mọi nơi cần tải ảnh lên.

// Đọc ảnh, cắt vuông ở giữa, thu nhỏ còn size x size, trả về data URL JPEG (nhẹ, khoảng 20-40KB với 256px).
export const imageToSquareDataUrl = (file: File, size: number, quality = 0.85): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });