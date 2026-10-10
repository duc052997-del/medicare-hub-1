import React, { useState } from 'react';

interface SafeImageProps {
  src?: string;
  alt: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}

export default function SafeImage({
  src,
  alt,
  style,
  fallback = null,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}