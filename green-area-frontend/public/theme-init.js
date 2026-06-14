// Apply the saved/preferred colour theme before first paint (no flash).
// Kept as a same-origin file (not inline) so the enforced Content-Security-Policy
// `script-src 'self'` allows it without needing 'unsafe-inline' or a per-build hash.
// Must stay render-blocking in <head> (no defer/async) to run before first paint.
(function () {
  try {
    // Default to light; only go dark when the user has explicitly chosen it.
    var saved = localStorage.getItem('theme');
    var dark = saved === 'dark';
    var t = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
  } catch (e) { /* ignore */ }
})();
