import React from 'react';
import { 
  TimerIcon, 
  CalendarFlameIcon, 
  TargetIcon, 
  HourglassMoonIcon, 
  FocusStepIcon, 
  EarnStepIcon, 
  SpendStepIcon,
  ChevronRightIcon
} from '../components/Icons';
import { useAppState } from '../state/AppStateContext';
import { getBlockedAppStatus } from '../state/blockedAppStatus';
import { getFocusTrends, getRolloverProjection } from '../state/analyticsSelectors';

export const DashboardPage = ({ navigateTo }) => {
  const { state } = useAppState();

  const formatBalance = (totalSec) => {
    const sec = Math.max(0, Math.floor(totalSec || 0));
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const remainingSecs = sec % 60;
    if (hours > 0) {
      return `${hours}:${mins < 10 ? '0' : ''}${mins}`;
    }
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const formatFocusedToday = (totalSec) => {
    const mins = Math.floor((totalSec || 0) / 60);
    return `${mins} min`;
  };

  const { expiring: expiringSeconds } = getRolloverProjection(state.balanceSeconds);

  const formatExpiring = (sec) => {
    const mins = Math.floor(sec / 60);
    if (mins > 0) {
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    }
    return `${sec} ${sec === 1 ? 'second' : 'seconds'}`;
  };

  return (
    <div className="dashboard-content">
      {/* Hero Headline */}
      <h1 className="dashboard-headline">Take back your time.</h1>

      {/* Main Focus Ring */}
      <a 
        href="#timer" 
        className="focus-ring-container"
        onClick={(e) => {
          if (navigateTo) {
            e.preventDefault();
            navigateTo('timer');
          }
        }}
      >
        <div className="focus-ring-circle">
          <div className="timer-digits">42:20</div>
          <div className="earned-pill-badge">
            <div className="earned-pill-dot"></div>
            <span className="earned-pill-text">+7 min earned</span>
          </div>
        </div>
      </a>

      {/* Session Running Banner */}
      <a 
        href="#timer" 
        className="live-session-banner"
        onClick={(e) => {
          if (navigateTo) {
            e.preventDefault();
            navigateTo('timer');
          }
        }}
      >
        <div className="banner-left">
          <TimerIcon color="#ffffff" size={20} />
          <div className="banner-text-group">
            <span className="banner-title">Session is running</span>
            <span className="banner-subtitle">24:08 focused · +4 min projected</span>
          </div>
        </div>
        <span className="banner-action">Open timer →</span>
      </a>

      {/* 3 Summary Cards */}
      <div className="summary-cards-list">
        <a 
          href="#winning-time" 
          className="summary-card-item"
          onClick={(e) => {
            if (navigateTo) {
              e.preventDefault();
              navigateTo('winning-time');
            }
          }}
        >
          <span className="summary-card-text">Winning Time · {formatBalance(state.balanceSeconds)}</span>
          <span className="summary-card-action">View all →</span>
        </a>

        <a 
          href="#blocker" 
          className="summary-card-item"
          onClick={(e) => {
            if (navigateTo) {
              e.preventDefault();
              navigateTo('blocker');
            }
          }}
        >
          <span className="summary-card-text">{(() => { const apps = state.blockedApps || []; const blocked = apps.length; const grace = apps.filter(a => getBlockedAppStatus(a.addedAt) === 'grace').length; return `${blocked} ${blocked === 1 ? 'app' : 'apps'} blocked · ${grace} grace`; })()}</span>
          <span className="summary-card-action">View all →</span>
        </a>

        <a 
          href="#analysis" 
          className="summary-card-item"
          onClick={(e) => {
            if (navigateTo) {
              e.preventDefault();
              navigateTo('analysis');
            }
          }}
        >
          <span className="summary-card-text">Analysis · {formatFocusedToday(state.todaysFocusedSeconds)} focused today</span>
          <span className="summary-card-action">View all →</span>
        </a>
      </div>

      {/* Today at a glance */}
      <div className="today-glance-box">
        <div className="glance-title-row">
          <CalendarFlameIcon color="#4b7f6b" size={20} />
          <h2>Today at a glance</h2>
        </div>
        <div className="metrics-pills-row">
          <a 
            href="#analysis" 
            className="metric-pill-card"
            onClick={(e) => { if (navigateTo) { e.preventDefault(); navigateTo('analysis'); }}}
          >
            <span className="metric-pill-val">42 min</span>
            <span className="metric-pill-lbl">Focused</span>
          </a>
          <a 
            href="#winning-time" 
            className="metric-pill-card"
            onClick={(e) => { if (navigateTo) { e.preventDefault(); navigateTo('winning-time'); }}}
          >
            <span className="metric-pill-val green-text">+7 min</span>
            <span className="metric-pill-lbl">Earned</span>
          </a>
          <a 
            href="#analysis" 
            className="metric-pill-card"
            onClick={(e) => { if (navigateTo) { e.preventDefault(); navigateTo('analysis'); }}}
          >
            <span className="metric-pill-val">
              {(() => {
                const streak = getFocusTrends(state.ledger, 'month', Date.now()).currentStreakDays;
                return `${streak} ${streak === 1 ? 'day' : 'days'}`;
              })()}
            </span>
            <span className="metric-pill-lbl">Streak</span>
          </a>
        </div>
      </div>

      {/* Today’s focus goal */}
      <a 
        href="#timer" 
        className="focus-goal-box"
        onClick={(e) => { if (navigateTo) { e.preventDefault(); navigateTo('timer'); }}}
      >
        <div className="goal-title-row">
          <TargetIcon color="#4b7f6b" size={20} />
          <h2>Today’s focus goal</h2>
        </div>
        <p className="goal-status-line">42 of 60 minutes complete · 18 minutes to go</p>
        <div className="goal-track-bar">
          <div className="goal-fill-bar"></div>
        </div>
        <p className="goal-footer-note">At your current rate, this goal earns {state.conversionRate?.winMinutes || 10} minutes of Winning Time.</p>
      </a>

      {/* Midnight Rollover Expiration Banner */}
      {expiringSeconds > 0 && (
        <a 
          href="#winning-time" 
          className="midnight-banner"
          onClick={(e) => { if (navigateTo) { e.preventDefault(); navigateTo('winning-time'); }}}
        >
          <HourglassMoonIcon color="#c79b3b" size={22} />
          <div className="midnight-copy">
            <h2>{formatExpiring(expiringSeconds)} expire at midnight</h2>
            <p>Use them if they help, or let them go. Tomorrow starts clean.</p>
          </div>
        </a>
      )}

      {/* How your balance moves */}
      <div className="moves-section-box">
        <h2>How your balance moves</h2>
        <div className="moves-tiles-grid">
          <a 
            href="#timer" 
            className="move-tile-card"
            onClick={(e) => { if (navigateTo) { e.preventDefault(); navigateTo('timer'); }}}
          >
            <FocusStepIcon color="#8b93a1" size={22} />
            <span className="move-tile-label">Focus</span>
          </a>
          <a 
            href="#winning-time" 
            className="move-tile-card"
            onClick={(e) => { if (navigateTo) { e.preventDefault(); navigateTo('winning-time'); }}}
          >
            <EarnStepIcon color="#8b93a1" size={22} />
            <span className="move-tile-label">Earn time</span>
          </a>
          <a 
            href="#blocker" 
            className="move-tile-card"
            onClick={(e) => { if (navigateTo) { e.preventDefault(); navigateTo('blocker'); }}}
          >
            <SpendStepIcon color="#8b93a1" size={22} />
            <span className="move-tile-label">Spend<br/>mindfully</span>
          </a>
        </div>
      </div>
    </div>
  );
};
