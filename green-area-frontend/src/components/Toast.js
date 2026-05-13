import { useEffect, useState } from 'react';
import { subscribeToast } from '../utils/toast';

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToast(toast => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, toast.duration);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: '70px', right: '16px', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
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
          <span>{t.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontSize: '0.9rem', padding: 0 }}
            aria-label="close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
