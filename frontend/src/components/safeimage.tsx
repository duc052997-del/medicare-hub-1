import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface SafeImageProps {
  src?: string;
  alt: string;
  style?: CSSProperties;
  fallback?: ReactNode;
}

// Ảnh lỗi hoặc không có src -> hiện fallback
export default function SafeImage({ src, alt, style, fallback = null }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />;
}