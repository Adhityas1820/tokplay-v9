import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ msg: '', type: 'success', show: false });
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(timerRef.current);
    setToast({ msg, type, show: true });
    timerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2500);
  }, []);

  return { toast, showToast };
}

export default function Toast({ msg, type, show }) {
  return (
    <div className={`toast ${show ? 'show' : ''} ${type}`}>
      {msg}
    </div>
  );
}
