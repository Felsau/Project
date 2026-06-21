import { useCallback, useState } from 'react';

// Landing gate — shown once per browser session. Shared deep-links
// (?p= ?d= ?tab= ?year=) must keep opening the dashboard directly, so their
// presence skips the gate. "Seen" state lives in sessionStorage so a new tab
// shows the landing again but in-session navigation doesn't.
export function useLandingGate() {
  const [showLanding, setShowLanding] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (['p', 'd', 'tab', 'year'].some(k => params.has(k))) return false;
    try { return sessionStorage.getItem('landing-seen') !== '1'; } catch { return true; }
  });

  const enterDashboard = useCallback(() => {
    try { sessionStorage.setItem('landing-seen', '1'); } catch { /* storage blocked — ignore */ }
    setShowLanding(false);
  }, []);

  const goToLanding = useCallback(() => {
    try { sessionStorage.removeItem('landing-seen'); } catch { /* storage blocked — ignore */ }
    setShowLanding(true);
  }, []);

  return { showLanding, enterDashboard, goToLanding };
}
