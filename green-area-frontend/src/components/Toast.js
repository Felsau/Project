import { useEffect, useRef, useState } from 'react';
import { subscribeToast } from '../utils/toast';

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  // เก็บ timer id ต่อ toast id เพื่อ cleanup ตอน close/unmount
  const timersRef = useRef(new Map());

  const dismiss = (id) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    setToasts(prev => prev.filter(x => x.id !== id));
  };

  useEffect(() => {
    // capture ref ตอน mount — ESLint react-hooks/exhaustive-deps แนะนำ
    // เพราะ timersRef.current อาจถูก reassign ภายนอกได้
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
      // ตอน unmount เคลียร์ timer ทั้งหมดที่ค้าง — กัน setState บน unmounted component
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
        position: 'fixed', top: '70px', right: '16px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px',
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role={t.type === 'error' ? 'alert' : 'status'}
          style={{
            background: t.type === 'error' ? '#fce8e6' : '#e8f0fe',
            border: `1px solid ${t.type === 'error' ? '#f28b82' : '#aecbfa'}`,
            color: t.type === 'error' ? '#c5221f' : '#1967d2',
            borderRadius: '8px', padding: '10px 12px',
            fontSize: '0.82rem', lineHeight: 1.4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'start', gap: '8px',
          }}
        >
          <span aria-hidden="true">{t.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontSize: '0.9rem', padding: 0 }}
            aria-label="ปิดข้อความ"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
