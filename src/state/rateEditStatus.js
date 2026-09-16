export const RATE_LIVE_WINDOW_MS = 5 * 60 * 1000;          // 5 minutes
export const RATE_LOCK_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Returns derived rate edit status:
 * - 'editable': if rateChangedAt is null (never changed), or within the 5-minute live window,
 *               or if 7 days have passed since the last change
 * - 'locked': between 5 minutes and 7 days after the last change
 *
 * @param {number|null} rateChangedAt - epoch ms of the most recent rate change
 * @param {number} [now=Date.now()] - current reference epoch ms
 * @returns {'editable' | 'locked'}
 */
export function getRateEditStatus(rateChangedAt, now = Date.now()) {
  if (rateChangedAt === null || rateChangedAt === undefined) return 'editable';
  const elapsed = now - rateChangedAt;
  if (elapsed < RATE_LIVE_WINDOW_MS) return 'editable';        // live window
  if (elapsed < RATE_LOCK_PERIOD_MS) return 'locked';          // locked
  return 'editable';  // 7 days passed, opens again
}

/**
 * Formats the remaining time in the 5-minute live window as MM:SS (e.g. 04:12)
 *
 * @param {number|null} rateChangedAt - epoch ms
 * @param {number} [now=Date.now()] - current epoch ms
 * @returns {string}
 */
export function formatRateLiveCountdown(rateChangedAt, now = Date.now()) {
  if (rateChangedAt === null || rateChangedAt === undefined) return '05:00';
  const elapsed = now - rateChangedAt;
  const remainingMs = Math.max(0, RATE_LIVE_WINDOW_MS - elapsed);
  const totalSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Formats the locked-until date (e.g. "Sep 20, 2026")
 *
 * @param {number} targetDateMs - epoch ms of the target unlock time
 * @returns {string}
 */
export function formatLockedUntil(targetDateMs) {
  if (!targetDateMs) return '';
  const d = new Date(targetDateMs);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
