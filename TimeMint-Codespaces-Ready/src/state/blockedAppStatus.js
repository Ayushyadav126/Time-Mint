export const GRACE_PERIOD_MS = 5 * 60 * 1000;       // 5 minutes
export const LOCK_PERIOD_MS = 24 * 60 * 60 * 1000;  // 24 hours

/**
 * Returns derived blocker status:
 * - 'grace': within 5-minute window, removable with live countdown
 * - 'locked': between 5 minutes and 24 hours, locked / non-removable
 * - 'removable': past 24 hours, removable again but still blocking
 */
export function getBlockedAppStatus(addedAt) {
  const elapsed = Date.now() - addedAt;
  if (elapsed < GRACE_PERIOD_MS) return 'grace';
  if (elapsed < LOCK_PERIOD_MS) return 'locked';
  return 'removable';
}

/**
 * Formats remaining grace period as MM:SS (e.g. 04:36)
 */
export function formatGraceCountdown(addedAt) {
  const elapsed = Date.now() - addedAt;
  const remainingMs = Math.max(0, GRACE_PERIOD_MS - elapsed);
  const totalSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Formats remaining lock time as Xh Ym (e.g. 23h 58m)
 */
export function formatLockedCountdown(addedAt) {
  const elapsed = Date.now() - addedAt;
  const remainingMs = Math.max(0, LOCK_PERIOD_MS - elapsed);
  const totalSec = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  return `${hours}h ${mins}m`;
}
