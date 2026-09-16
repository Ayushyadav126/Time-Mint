import { isSameCalendarDay } from './AppStateContext.jsx';

/**
 * Returns true if the timestamp occurred within the last N days relative to `now`.
 * @param {number} timestamp - epoch ms
 * @param {number} n - number of days
 * @param {number} now - reference epoch ms (defaults to Date.now())
 * @returns {boolean}
 */
export function inLastNDays(timestamp, n, now = Date.now()) {
  if (!timestamp) return false;
  return timestamp >= now - n * 24 * 60 * 60 * 1000;
}

/**
 * Helper to check if a ledger entry is in scope.
 * - 'day': calendar day match with `now`
 * - 'week': in last 7 days relative to `now`
 * - 'month': in last 30 days relative to `now`
 */
function isEntryInScope(entry, scope, now) {
  if (!entry || !entry.timestamp) return false;
  if (scope === 'day') {
    return isSameCalendarDay(entry.timestamp, new Date(now));
  }
  if (scope === 'week') {
    return inLastNDays(entry.timestamp, 7, now);
  }
  if (scope === 'month') {
    return inLastNDays(entry.timestamp, 30, now);
  }
  return false;
}

/**
 * Focus trends selector.
 * Computes total focus time, average session duration, streaks, and hour/day-of-week patterns.
 */
export function getFocusTrends(ledger, scope = 'week', now = Date.now()) {
  const safeLedger = Array.isArray(ledger) ? ledger : [];

  // Streak looks at FULL ledger history, not filtered by scope
  const earnDateStrings = new Set();
  safeLedger.forEach((entry) => {
    if (entry && entry.type === 'earn' && entry.timestamp) {
      earnDateStrings.add(new Date(entry.timestamp).toDateString());
    }
  });

  // Longest streak across full history
  let longestStreakDays = 0;
  if (earnDateStrings.size > 0) {
    const uniqueDayMs = Array.from(earnDateStrings)
      .map((dateStr) => {
        const d = new Date(dateStr);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })
      .sort((a, b) => a - b);

    longestStreakDays = 1;
    let currentRun = 1;
    for (let i = 1; i < uniqueDayMs.length; i++) {
      const prev = new Date(uniqueDayMs[i - 1]);
      const expectedNext = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1).getTime();
      if (uniqueDayMs[i] === expectedNext) {
        currentRun++;
        if (currentRun > longestStreakDays) {
          longestStreakDays = currentRun;
        }
      } else {
        currentRun = 1;
      }
    }
  }

  // Current streak: counting backward from today only while consecutive days keep being present
  let currentStreakDays = 0;
  const checkDate = new Date(now);
  while (earnDateStrings.has(checkDate.toDateString())) {
    currentStreakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Filter earn entries within current scope
  let totalFocusedSeconds = 0;
  let earnCount = 0;
  const patternsByHour = new Array(24).fill(0);
  const patternsByDayOfWeek = new Array(7).fill(0);

  safeLedger.forEach((entry) => {
    if (entry && entry.type === 'earn' && isEntryInScope(entry, scope, now)) {
      const focused = (entry.meta && typeof entry.meta.focusedSeconds === 'number')
        ? entry.meta.focusedSeconds
        : 0;
      totalFocusedSeconds += focused;
      earnCount++;

      const d = new Date(entry.timestamp);
      const hour = d.getHours();
      const day = d.getDay();
      if (hour >= 0 && hour < 24) {
        patternsByHour[hour]++;
      }
      if (day >= 0 && day < 7) {
        patternsByDayOfWeek[day]++;
      }
    }
  });

  const averageSessionSeconds = earnCount > 0 ? totalFocusedSeconds / earnCount : 0;

  return {
    totalFocusedSeconds,
    averageSessionSeconds,
    longestStreakDays,
    currentStreakDays,
    patternsByHour,
    patternsByDayOfWeek,
  };
}

/**
 * Winning Time economy selector.
 * Computes earned, spent, expired totals and negative balance events for the given scope.
 */
export function getWinningTimeEconomy(ledger, scope = 'week', now = Date.now()) {
  const safeLedger = Array.isArray(ledger) ? ledger : [];

  let earnedTotal = 0;
  let spentTotal = 0;
  let expiredTotal = 0;
  let negativeCount = 0;
  let deepestNegative = 0;

  safeLedger.forEach((entry) => {
    if (!entry || !isEntryInScope(entry, scope, now)) return;

    const amount = typeof entry.amountSeconds === 'number' ? entry.amountSeconds : 0;

    if (entry.type === 'earn') {
      earnedTotal += amount;
    } else if (entry.type === 'spend' || entry.type === 'emergency') {
      spentTotal += amount;
    } else if (entry.type === 'rollover_expire') {
      expiredTotal += amount;
    }

    if (typeof entry.balanceAfter === 'number' && entry.balanceAfter < 0) {
      negativeCount++;
      if (entry.balanceAfter < deepestNegative) {
        deepestNegative = entry.balanceAfter;
      }
    }
  });

  return {
    earnedTotal,
    spentTotal,
    expiredTotal,
    negativeBalanceEvents: {
      count: negativeCount,
      deepestNegative,
    },
  };
}

/**
 * Disturbing apps breakdown selector.
 * Groups app spend and emergency unlocks by appId, and computes totals and emergency usage.
 */
export function getDisturbingAppsBreakdown(ledger, scope = 'week', now = Date.now()) {
  const safeLedger = Array.isArray(ledger) ? ledger : [];

  const appMap = new Map();
  let totalDisturbingSeconds = 0;
  let emergencyCount = 0;

  safeLedger.forEach((entry) => {
    if (!entry || !isEntryInScope(entry, scope, now)) return;

    if (entry.type === 'spend' || entry.type === 'emergency') {
      const amount = typeof entry.amountSeconds === 'number' ? entry.amountSeconds : 0;
      totalDisturbingSeconds += amount;

      if (entry.type === 'emergency') {
        emergencyCount++;
      }

      const appId = (entry.meta && entry.meta.appId) ? String(entry.meta.appId) : 'unknown';
      const appName = (entry.meta && entry.meta.appName) ? String(entry.meta.appName) : appId;

      const existing = appMap.get(appId) || { appId, appName, amountSeconds: 0 };
      existing.amountSeconds += amount;
      if (entry.meta && entry.meta.appName) {
        existing.appName = entry.meta.appName;
      }
      appMap.set(appId, existing);
    }
  });

  const byApp = Array.from(appMap.values()).sort((a, b) => b.amountSeconds - a.amountSeconds);
  const { totalFocusedSeconds } = getFocusTrends(safeLedger, scope, now);

  return {
    byApp,
    totalDisturbingSeconds,
    totalFocusedSeconds,
    emergencyCount,
  };
}

/**
 * Weekly summary selector.
 * Always compares the last 7 days vs days 8-14 ago, independent of the active tab scope.
 */
export function getWeeklySummary(ledger, now = Date.now()) {
  const safeLedger = Array.isArray(ledger) ? ledger : [];

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  let currentEarned = 0;
  let currentSpent = 0;
  let currentFocused = 0;

  let prevEarned = 0;
  let prevSpent = 0;
  let prevFocused = 0;

  safeLedger.forEach((entry) => {
    if (!entry || !entry.timestamp) return;

    const ts = entry.timestamp;
    const isCurrentPeriod = ts >= sevenDaysAgo && ts <= now;
    const isPreviousPeriod = ts >= fourteenDaysAgo && ts < sevenDaysAgo;

    if (!isCurrentPeriod && !isPreviousPeriod) return;

    const amount = typeof entry.amountSeconds === 'number' ? entry.amountSeconds : 0;
    const focused = (entry.meta && typeof entry.meta.focusedSeconds === 'number')
      ? entry.meta.focusedSeconds
      : 0;

    if (isCurrentPeriod) {
      if (entry.type === 'earn') {
        currentEarned += amount;
        currentFocused += focused;
      } else if (entry.type === 'spend' || entry.type === 'emergency') {
        currentSpent += amount;
      }
    } else if (isPreviousPeriod) {
      if (entry.type === 'earn') {
        prevEarned += amount;
        prevFocused += focused;
      } else if (entry.type === 'spend' || entry.type === 'emergency') {
        prevSpent += amount;
      }
    }
  });

  return {
    thisWeek: {
      focusedSeconds: currentFocused,
      earnedSeconds: currentEarned,
      spentSeconds: currentSpent,
    },
    lastWeek: {
      focusedSeconds: prevFocused,
      earnedSeconds: prevEarned,
      spentSeconds: prevSpent,
    },
    deltas: {
      focusedSeconds: currentFocused - prevFocused,
      earnedSeconds: currentEarned - prevEarned,
      spentSeconds: currentSpent - prevSpent,
    },
  };
}

/**
 * Shared helper to calculate daily midnight rollover projection.
 * 33.3% carries forward (floor-divided by 3), remainder expires.
 *
 * @param {number} balanceSeconds - current spendable balance in seconds
 * @returns {{ carriesForward: number, expiring: number }}
 */
export function getRolloverProjection(balanceSeconds) {
  const bal = Math.max(0, Math.floor(balanceSeconds || 0));
  const carriesForward = Math.floor(bal / 3);
  const expiring = bal - carriesForward;
  return { carriesForward, expiring };
}

/**
 * Weekly chart data selector for WalletPage.
 * Returns an array of 7 entries, OLDEST first (6 days ago ... today).
 *
 * Each entry: { dateLabel, earnedSeconds, spentSeconds, expiredSeconds }
 * - dateLabel: short weekday format (e.g. 'Sun', 'Mon', 'Tue', ...)
 * - earnedSeconds: sum of 'earn' entries' amountSeconds for that calendar day
 * - spentSeconds: sum of 'spend' + 'emergency' entries for that day
 * - expiredSeconds: sum of 'rollover_expire' entries for that day
 *
 * @param {Array} ledger - state.ledger array
 * @param {number} [now=Date.now()] - reference epoch ms
 * @returns {Array<{ dateLabel: string, earnedSeconds: number, spentSeconds: number, expiredSeconds: number }>}
 */
export function getWeeklyChartData(ledger, now = Date.now()) {
  const safeLedger = Array.isArray(ledger) ? ledger : [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - i);
    const dateLabel = days[targetDate.getDay()];

    let earnedSeconds = 0;
    let spentSeconds = 0;
    let expiredSeconds = 0;

    safeLedger.forEach((entry) => {
      if (!entry || !entry.timestamp) return;
      if (isSameCalendarDay(entry.timestamp, targetDate)) {
        const amount = typeof entry.amountSeconds === 'number' ? entry.amountSeconds : 0;
        if (entry.type === 'earn') {
          earnedSeconds += amount;
        } else if (entry.type === 'spend' || entry.type === 'emergency') {
          spentSeconds += amount;
        } else if (entry.type === 'rollover_expire') {
          expiredSeconds += amount;
        }
      }
    });

    result.push({
      dateLabel,
      earnedSeconds,
      spentSeconds,
      expiredSeconds,
    });
  }

  return result;
}

