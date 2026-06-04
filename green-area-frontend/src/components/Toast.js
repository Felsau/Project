import { useEffect, useRef, useState } from 'react';
import { subscribeToast } from '../utils/toast';

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = (id) => {
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
    setToasts(prev => prev.filter(x => x.id !== id));
  };

  useEffect(() => {
    const timers = timersRef.current;
    const unsub = subscribeToast(toast => {
      setToasts(prev => [...prev, toast]);
      const timerId = setTimeout(() => {
        timers.delete(toast.id);
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, toast.duration);
      timers.set(toast.id, timerId);
    });

    return () => {
      unsub();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: 52, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 340,
      }}
    >
      {toasts.map(t => {
        const isErr = t.type === 'error';
        return (
          <div
            key={t.id}
            role={isErr ? 'alert' : 'status'}
            style={{
              background: '#ffffff',
              border: '1px solid #cdd1ca',
              borderLeft: `2px solid ${isErr ? '#a02020' : '#1f6f43'}`,
              color: '#1f2421',
              borderRadius: 3, padding: '10px 12px',
              fontSize: 12.5, lineHeight: 1.5,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b736d', fontSize: 14, padding: 0, lineHeight: 1 }}
              aria-label="ปิดข้อความ"
            >×</button>
          </div>
        );
      })}
    </div>
  );
}
