/**
 * Security Shield: Anti-Inspect, Anti-DevTools & Client-Side Hardening
 * Protects application against unauthorized inspection, code tampering, and shortcuts.
 */

export function initSecurityShield() {
  if (typeof window === 'undefined') return;

  // 1. Disable Right Click Context Menu
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  // 2. Block DevTools Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S)
  window.addEventListener('keydown', (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const key = e.key ? e.key.toUpperCase() : '';
    const keyCode = e.keyCode || e.which;

    // F12 (keyCode 123)
    if (key === 'F12' || keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    // Ctrl+Shift+C / Cmd+Opt+C (Element Inspector)
    if (isCtrlOrCmd && isShift && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+U (View Page Source)
    if (isCtrlOrCmd && (key === 'U' || keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page)
    if (isCtrlOrCmd && (key === 'S' || keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  // 3. Disable Dragging of Images & Media
  window.addEventListener('dragstart', (e) => {
    if (e.target && e.target.nodeName === 'IMG') {
      e.preventDefault();
    }
  });

  // 4. Console Protection & Warning Banner
  const printSecurityBanner = () => {
    try {
      console.clear();
      console.log(
        '%c⛔ ACCESS RESTRICTED ⛔',
        'color: #ef4444; font-size: 28px; font-weight: 900; font-family: sans-serif; text-shadow: 2px 2px #000;'
      );
      console.log(
        '%cInspection, reverse engineering, and script injection are strictly prohibited by system security policy.',
        'color: #f59e0b; font-size: 14px; font-weight: 600;'
      );
    } catch (_) {}
  };

  printSecurityBanner();

  // 5. Anti-Debugging DevTools Trap
  // When DevTools is opened, the debugger pauses execution and deters inspection
  const antiDebugger = () => {
    try {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      (function () {}.constructor('debugger')());
      const end = performance.now();
      // If execution paused on debugger for more than 100ms, DevTools is actively open
      if (end - start > 100) {
        printSecurityBanner();
      }
    } catch (_) {}
  };

  const timer = setInterval(antiDebugger, 1500);

  // Clean-up handler if needed
  return () => clearInterval(timer);
}
