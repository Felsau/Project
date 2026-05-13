// Simple pub/sub toast — hook ไหน catch error ก็เรียก pushError(msg)
// Toast.js subscribe เพื่อแสดงผล
const subscribers = new Set();

export function subscribeToast(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function pushError(message, opts = {}) {
  const toast = {
    id: Date.now() + Math.random(),
    type: 'error',
    message,
    duration: opts.duration ?? 5000,
  };
  subscribers.forEach(fn => fn(toast));
}

export function pushInfo(message, opts = {}) {
  const toast = {
    id: Date.now() + Math.random(),
    type: 'info',
    message,
    duration: opts.duration ?? 3000,
  };
  subscribers.forEach(fn => fn(toast));
}
