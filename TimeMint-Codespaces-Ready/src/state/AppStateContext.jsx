import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App as CapApp } from '@capacitor/app';
import { getRateEditStatus } from './rateEditStatus';

export { getRateEditStatus };

const STORAGE_KEY = 'timeMint.state';

export const getInitialState = () => ({
  isTimerRunning: false,
  timerStartedAt: null,          // epoch ms (Date.now()) when running
  todaysFocusedSeconds: 0,       // total focused seconds today
  todaysEarnedSeconds: 0,        // Winning Time earned today (seconds)
  balanceSeconds: 0,             // spendable Winning Time balance (seconds)
  conversionRate: { workMinutes: 60, winMinutes: 10 }, // default rate
  rateChangedAt: null,           // epoch ms of the most recent rate change; null = never changed since install
  blockedApps: [],               // array of { id: string, name: string, addedAt: number }
  activeUnlock: null,            // null | { appId: string, appName: string, startedAt: number, isEmergency?: boolean }
  pendingEmergencyDebtSeconds: 0,
  pendingEmergencyDebtIncurredDate: null, // date string or null
  emergencyMode: { lastUsedAt: null },   // epoch ms of last use
  lastKnownDate: new Date().toDateString(),
  ledger: [],                    // array of { id, type, amountSeconds, timestamp, meta }, NEWEST FIRST
});

export function isEmergencyUsedToday(lastUsedAt) {
  if (!lastUsedAt) return false;
  return new Date(lastUsedAt).toDateString() === new Date().toDateString();
}

export function isSameCalendarDay(timestamp, referenceDate) {
  if (!timestamp) return false;
  return new Date(timestamp).toDateString() === referenceDate.toDateString();
}

function makeLedgerEntry(type, amountSeconds, meta = {}, balanceAfter = undefined) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    amountSeconds,
    timestamp: Date.now(),
    meta,
  };
  if (balanceAfter !== undefined) {
    entry.balanceAfter = balanceAfter;
  }
  return entry;
}

function appReducer(state, action) {
  switch (action.type) {
    case 'START_TIMER': {
      return {
        ...state,
        isTimerRunning: true,
        timerStartedAt: action.startedAt || Date.now(),
      };
    }
    case 'STOP_TIMER': {
      if (!state.isTimerRunning || !state.timerStartedAt) {
        return state;
      }
      const now = action.stoppedAt || Date.now();
      const elapsedSeconds = (now - state.timerStartedAt) / 1000;
      const earnedSeconds = elapsedSeconds * (state.conversionRate.winMinutes / state.conversionRate.workMinutes);

      const today = new Date().toDateString();
      const debtIsDue = (state.pendingEmergencyDebtSeconds || 0) > 0
        && state.pendingEmergencyDebtIncurredDate !== null
        && state.pendingEmergencyDebtIncurredDate !== today;

      const debtToApply = debtIsDue ? state.pendingEmergencyDebtSeconds : 0;
      const netEarned = earnedSeconds - debtToApply;
      const finalBalance = state.balanceSeconds + netEarned;

      // KNOWN SIMPLIFICATION: the 'earn' ledger entry logs the gross earned amount,
      // not net-after-debt. A distinct 'debt_settled' entry type will be added in a future chunk.
      const earnEntry = makeLedgerEntry(
        'earn',
        earnedSeconds,
        { focusedSeconds: elapsedSeconds },
        finalBalance
      );

      return {
        ...state,
        isTimerRunning: false,
        timerStartedAt: null,
        todaysFocusedSeconds: state.todaysFocusedSeconds + elapsedSeconds,
        todaysEarnedSeconds: state.todaysEarnedSeconds + earnedSeconds,
        balanceSeconds: finalBalance,
        pendingEmergencyDebtSeconds: debtIsDue ? 0 : state.pendingEmergencyDebtSeconds,
        pendingEmergencyDebtIncurredDate: debtIsDue ? null : state.pendingEmergencyDebtIncurredDate,
        ledger: [earnEntry, ...state.ledger],
      };
    }
    case 'CHECK_ROLLOVER': {
      const today = new Date().toDateString();
      if (state.lastKnownDate === today) return state; // no-op, same day

      // KNOWN SIMPLIFICATION: if more than one midnight was crossed since the app
      // was last opened (e.g. gone 3 days), this applies the 33.3% rule once, not
      // compounded per day missed. Precise multi-day compounding is deliberately deferred.
      const carriedForward = Math.floor((state.balanceSeconds || 0) / 3);
      const expiredSeconds = (state.balanceSeconds || 0) - carriedForward;
      const updatedLedger = expiredSeconds > 0
        ? [makeLedgerEntry('rollover_expire', expiredSeconds, {}, carriedForward), ...state.ledger]
        : state.ledger;
      return {
        ...state,
        balanceSeconds: carriedForward,
        todaysFocusedSeconds: 0,
        todaysEarnedSeconds: 0,
        lastKnownDate: today,
        ledger: updatedLedger,
      };
    }
    case 'ADD_BLOCKED_APP': {
      if (state.blockedApps.some((app) => String(app.id) === String(action.id))) {
        return state;
      }
      return {
        ...state,
        blockedApps: [
          ...state.blockedApps,
          {
            id: String(action.id),
            name: action.name,
            addedAt: action.addedAt || Date.now(),
          },
        ],
      };
    }
    case 'REMOVE_BLOCKED_APP': {
      return {
        ...state,
        blockedApps: state.blockedApps.filter((app) => String(app.id) !== String(action.id)),
      };
    }
    case 'START_UNLOCK': {
      if (state.balanceSeconds <= 0) {
        return state;
      }
      return {
        ...state,
        activeUnlock: {
          appId: String(action.appId),
          appName: action.appName || '',
          startedAt: action.startedAt || Date.now(),
          isEmergency: false,
        },
      };
    }
    case 'START_EMERGENCY_UNLOCK': {
      const lastUsedAt = state.emergencyMode?.lastUsedAt;
      const usedToday = lastUsedAt && (new Date(lastUsedAt).toDateString() === new Date().toDateString());
      if (usedToday) {
        return state;
      }
      const now = action.startedAt || Date.now();
      const today = new Date().toDateString();

      // KNOWN SIMPLIFICATION: if Emergency Mode is used on two different days
      // without any Timer session in between to pay off the first debt, the two debt
      // amounts add together (existing behavior) but both become due starting from the
      // MORE RECENT incur-date, not staggered individually.
      const emergencyEntry = makeLedgerEntry('emergency', 5 * 60, {
        appId: String(action.appId),
        appName: action.appName || '',
      }, state.balanceSeconds || 0);

      return {
        ...state,
        emergencyMode: {
          ...state.emergencyMode,
          lastUsedAt: now,
        },
        pendingEmergencyDebtSeconds: (state.pendingEmergencyDebtSeconds || 0) + (5 * 60),
        pendingEmergencyDebtIncurredDate: today,
        activeUnlock: {
          appId: String(action.appId),
          appName: action.appName || '',
          startedAt: now,
          isEmergency: true,
        },
        ledger: [emergencyEntry, ...state.ledger],
      };
    }
    case 'STOP_UNLOCK': {
      if (!state.activeUnlock || !state.activeUnlock.startedAt) {
        return state;
      }
      if (state.activeUnlock.isEmergency) {
        // flat-rate debt was already recorded at start; do not touch
        // balanceSeconds here at all
        return {
          ...state,
          activeUnlock: null,
        };
      }
      const now = action.stoppedAt || Date.now();
      const elapsedSeconds = Math.max(0, (now - state.activeUnlock.startedAt) / 1000);
      const deduction = Math.min(state.balanceSeconds, elapsedSeconds);
      const newBalance = Math.max(0, state.balanceSeconds - deduction);
      const spendEntry = makeLedgerEntry('spend', deduction, {
        appId: state.activeUnlock.appId,
        appName: state.activeUnlock.appName,
      }, newBalance);
      return {
        ...state,
        balanceSeconds: newBalance,
        activeUnlock: null,
        ledger: [spendEntry, ...state.ledger],
      };
    }
    case 'UPDATE_CONVERSION_RATE': {
      if (getRateEditStatus(state.rateChangedAt) !== 'editable') {
        return state;
      }
      const rawWin = typeof action.winMinutes === 'number' ? action.winMinutes : Number(action.winMinutes);
      if (Number.isNaN(rawWin)) return state;
      const clamped = Math.min(30, Math.max(5, Math.round(rawWin)));
      const now = action.changedAt || Date.now();
      return {
        ...state,
        conversionRate: {
          workMinutes: 60,
          winMinutes: clamped,
        },
        rateChangedAt: now,
      };
    }
    case 'HYDRATE': {
      const defaultState = getInitialState();
      const raw = {
        ...defaultState,
        ...action.payload,
        rateChangedAt: action.payload?.rateChangedAt !== undefined
          ? action.payload.rateChangedAt
          : null,
        conversionRate: action.payload?.conversionRate && typeof action.payload.conversionRate.winMinutes === 'number'
          ? { workMinutes: 60, winMinutes: Math.min(30, Math.max(5, Math.round(action.payload.conversionRate.winMinutes))) }
          : defaultState.conversionRate,
        blockedApps: Array.isArray(action.payload?.blockedApps) ? action.payload.blockedApps : [],
        emergencyMode: action.payload?.emergencyMode || defaultState.emergencyMode,
        pendingEmergencyDebtSeconds: typeof action.payload?.pendingEmergencyDebtSeconds === 'number'
          ? action.payload.pendingEmergencyDebtSeconds
          : 0,
        pendingEmergencyDebtIncurredDate: action.payload?.pendingEmergencyDebtIncurredDate !== undefined
          ? action.payload.pendingEmergencyDebtIncurredDate
          : null,
        lastKnownDate: action.payload?.lastKnownDate || defaultState.lastKnownDate,
        ledger: Array.isArray(action.payload?.ledger) ? action.payload.ledger : [],
      };
      if (raw.activeUnlock && raw.activeUnlock.startedAt) {
        if (raw.activeUnlock.isEmergency) {
          // Emergency debt was already recorded in pendingEmergencyDebtSeconds at start;
          // simply clear the activeUnlock session without deducting from balanceSeconds
          raw.activeUnlock = null;
        } else {
          const now = action.now || Date.now();
          const elapsedSeconds = Math.max(0, (now - raw.activeUnlock.startedAt) / 1000);
          const deduction = Math.min(raw.balanceSeconds || 0, elapsedSeconds);
          raw.balanceSeconds = Math.max(0, (raw.balanceSeconds || 0) - deduction);
          raw.activeUnlock = null;
        }
      }
      return raw;
    }
    default:
      return state;
  }
}

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const customDispatch = useCallback((action) => {
    if (action.type === 'CHECK_ROLLOVER') {
      const currentState = action.baseState || stateRef.current;
      const nextState = appReducer(currentState, action);
      if (nextState !== currentState) {
        Preferences.set({
          key: STORAGE_KEY,
          value: JSON.stringify(nextState),
        }).catch((err) => {
          console.error('Failed to persist CHECK_ROLLOVER state:', err);
        });
        dispatch(action);
      }
      return;
    }

    if (action.type === 'START_TIMER') {
      const actionWithTimestamp = {
        ...action,
        startedAt: action.startedAt || Date.now(),
      };
      const nextState = appReducer(stateRef.current, actionWithTimestamp);
      Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(nextState),
      }).catch((err) => {
        console.error('Failed to persist START_TIMER state:', err);
      });
      dispatch(actionWithTimestamp);
      return;
    }

    if (action.type === 'STOP_TIMER') {
      const actionWithTimestamp = {
        ...action,
        stoppedAt: action.stoppedAt || Date.now(),
      };
      const nextState = appReducer(stateRef.current, actionWithTimestamp);
      Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(nextState),
      }).catch((err) => {
        console.error('Failed to persist STOP_TIMER state:', err);
      });
      dispatch(actionWithTimestamp);
      return;
    }

    if (action.type === 'START_UNLOCK') {
      if (stateRef.current.balanceSeconds <= 0) return;
      const actionWithTimestamp = {
        ...action,
        startedAt: action.startedAt || Date.now(),
      };
      const nextState = appReducer(stateRef.current, actionWithTimestamp);
      Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(nextState),
      }).catch((err) => {
        console.error('Failed to persist START_UNLOCK state:', err);
      });
      dispatch(actionWithTimestamp);
      return;
    }

    if (action.type === 'START_EMERGENCY_UNLOCK') {
      const lastUsedAt = stateRef.current.emergencyMode?.lastUsedAt;
      const usedToday = lastUsedAt && (new Date(lastUsedAt).toDateString() === new Date().toDateString());
      if (usedToday) return;
      const actionWithTimestamp = {
        ...action,
        startedAt: action.startedAt || Date.now(),
      };
      const nextState = appReducer(stateRef.current, actionWithTimestamp);
      Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(nextState),
      }).catch((err) => {
        console.error('Failed to persist START_EMERGENCY_UNLOCK state:', err);
      });
      dispatch(actionWithTimestamp);
      return;
    }

    if (action.type === 'STOP_UNLOCK') {
      if (!stateRef.current.activeUnlock) return;
      const actionWithTimestamp = {
        ...action,
        stoppedAt: action.stoppedAt || Date.now(),
      };
      const nextState = appReducer(stateRef.current, actionWithTimestamp);
      Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(nextState),
      }).catch((err) => {
        console.error('Failed to persist STOP_UNLOCK state:', err);
      });
      dispatch(actionWithTimestamp);
      return;
    }

    if (action.type === 'ADD_BLOCKED_APP') {
      const actionWithTimestamp = {
        ...action,
        addedAt: action.addedAt || Date.now(),
      };
      const nextState = appReducer(stateRef.current, actionWithTimestamp);
      Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(nextState),
      }).catch((err) => {
        console.error('Failed to persist ADD_BLOCKED_APP state:', err);
      });
      dispatch(actionWithTimestamp);
      return;
    }

    if (action.type === 'REMOVE_BLOCKED_APP') {
      const nextState = appReducer(stateRef.current, action);
      Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(nextState),
      }).catch((err) => {
        console.error('Failed to persist REMOVE_BLOCKED_APP state:', err);
      });
      dispatch(action);
      return;
    }

    if (action.type === 'UPDATE_CONVERSION_RATE') {
      const actionWithTimestamp = {
        ...action,
        changedAt: action.changedAt || Date.now(),
      };
      const nextState = appReducer(stateRef.current, actionWithTimestamp);
      if (nextState !== stateRef.current) {
        Preferences.set({
          key: STORAGE_KEY,
          value: JSON.stringify(nextState),
        }).catch((err) => {
          console.error('Failed to persist UPDATE_CONVERSION_RATE state:', err);
        });
        dispatch(actionWithTimestamp);
      }
      return;
    }

    dispatch(action);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let resumeHandle = null;

    async function hydrate() {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value && isMounted) {
          const parsed = JSON.parse(value);
          if (parsed.activeUnlock && parsed.activeUnlock.startedAt) {
            if (parsed.activeUnlock.isEmergency) {
              parsed.activeUnlock = null;
            } else {
              const now = Date.now();
              const elapsedSeconds = Math.max(0, (now - parsed.activeUnlock.startedAt) / 1000);
              const deduction = Math.min(parsed.balanceSeconds || 0, elapsedSeconds);
              parsed.balanceSeconds = Math.max(0, (parsed.balanceSeconds || 0) - deduction);
              parsed.activeUnlock = null;
            }
            Preferences.set({
              key: STORAGE_KEY,
              value: JSON.stringify(parsed),
            }).catch((err) => {
              console.error('Failed to persist settled activeUnlock state:', err);
            });
          }
          dispatch({ type: 'HYDRATE', payload: parsed });
          // After HYDRATE runs, immediately dispatch CHECK_ROLLOVER
          customDispatch({ type: 'CHECK_ROLLOVER', baseState: parsed });
        } else if (isMounted) {
          customDispatch({ type: 'CHECK_ROLLOVER' });
        }
      } catch (err) {
        console.error('Failed to hydrate state from Preferences:', err);
      }
    }
    hydrate();

    // Listen for app resume events (background to foreground)
    CapApp.addListener('resume', () => {
      customDispatch({ type: 'CHECK_ROLLOVER' });
    }).then((handle) => {
      resumeHandle = handle;
    }).catch((err) => {
      console.error('Failed to register CapApp resume listener:', err);
    });

    return () => {
      isMounted = false;
      if (resumeHandle && typeof resumeHandle.remove === 'function') {
        resumeHandle.remove();
      }
    };
  }, [customDispatch]);

  return (
    <AppStateContext.Provider value={{ state, dispatch: customDispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
