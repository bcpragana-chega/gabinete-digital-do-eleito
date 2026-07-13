import { useEffect, useRef, useState } from "react";

type UseAutoSaveOptions<T> = {
  initialValue: T;
  delay?: number;
  onSave: (value: T) => void | Promise<void>;
};

export function useAutoSave<T>({ initialValue, delay = 500, onSave }: UseAutoSaveOptions<T>) {
  const [value, setValue] = useState<T>(initialValue);
  const firstRender = useRef(true);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      void onSave(value);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [value, delay, onSave]);

  return [value, setValue] as const;
}
