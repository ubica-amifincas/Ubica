import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get value from localStorage or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Listen for changes to this localStorage key from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage key "${key}":`, error);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}

// Hook for boolean values
export function useBooleanLocalStorage(key: string, initialValue: boolean = false) {
  const [value, setValue] = useLocalStorage(key, initialValue);
  
  const toggle = () => setValue(!value);
  const setTrue = () => setValue(true);
  const setFalse = () => setValue(false);
  
  return {
    value,
    setValue,
    toggle,
    setTrue,
    setFalse
  };
}

// Hook for array values
export function useArrayLocalStorage<T>(key: string, initialValue: T[] = []) {
  const [array, setArray] = useLocalStorage<T[]>(key, initialValue);
  
  const addItem = (item: T) => {
    setArray(prev => [...prev, item]);
  };
  
  const removeItem = (index: number) => {
    setArray(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeItemByValue = (item: T) => {
    setArray(prev => prev.filter(i => i !== item));
  };
  
  const updateItem = (index: number, newItem: T) => {
    setArray(prev => prev.map((item, i) => i === index ? newItem : item));
  };
  
  const clear = () => setArray([]);
  
  return {
    array,
    setArray,
    addItem,
    removeItem,
    removeItemByValue,
    updateItem,
    clear,
    length: array.length,
    isEmpty: array.length === 0
  };
}
