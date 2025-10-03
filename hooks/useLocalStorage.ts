
import { useState, useEffect } from 'react';

export function useLocalStorage<T,>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const savedValue = localStorage.getItem(key);
      if (savedValue !== null) {
        return JSON.parse(savedValue);
      }
    } catch (error) {
      console.error('Error parsing JSON from localStorage', error);
      localStorage.removeItem(key);
    }
    return initialValue instanceof Function ? initialValue() : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item to localStorage', error);
    }
  }, [key, value]);

  return [value, setValue];
}
