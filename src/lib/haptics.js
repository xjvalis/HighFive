// Haptic feedback for mobile devices
export function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  switch (type) {
    case 'light':   navigator.vibrate(10); break;
    case 'medium':  navigator.vibrate(25); break;
    case 'heavy':   navigator.vibrate(50); break;
    case 'success': navigator.vibrate([10, 50, 10]); break;
    case 'error':   navigator.vibrate([50, 30, 50]); break;
    default:        navigator.vibrate(10);
  }
}
