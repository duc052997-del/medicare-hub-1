// utils/useform.ts
// Hook form dùng chung cho Login/Register: giữ giá trị + lỗi từng ô, gõ lại thì xóa lỗi ô đó.

import { useState } from 'react';
import type { ChangeEvent } from 'react';

export function useForm<T extends Record<string, string>>(initial: T) {
  type Errors = Record<keyof T, string>;
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Errors>(
    Object.fromEntries(Object.keys(initial).map((k) => [k, ''])) as Errors
  );

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => (er[name as keyof T] ? { ...er, [name]: '' } : er));
  };

  return { values, errors, setErrors, onChange };
}