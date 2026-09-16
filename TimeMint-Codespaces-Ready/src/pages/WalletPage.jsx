import React from 'react';
import { SettingsIcon, ChevronRightIcon, EarnStepIcon } from '../components/Icons';
import { useAppState, isSameCalendarDay } from '../state/AppStateContext';
import { getRolloverProjection, getWeeklyChartData } from '../state/analyticsSelectors';

export const WalletPage = ({ navigateTo }) => {
  const { state } = useAppState();

  const formatLargeBalance = (totalSec) => {
    const raw = totalSec || 0;
    if (raw < 0) {
      const negMins = Math.ceil(Math.abs(raw) / 60);
      return `−${negMins} min · earn it back tomorrow`;
    }
    const sec = Math.max(0, Math.floor(raw));
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const remainingSecs = sec % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const formatLedgerAmount = (seconds) => {
    const s = Math.max(0, Math.round(seconds || 0));
    if (s >= 60) {
      return `${Math.floor(s / 60)} min`;
    }
    return `${s}s`;
  };

  const formatDurationWithMin = (sec) => {
    const total = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h} hr`;
    }
    return `${m} min`;
  };

  const formatDurationShort = (sec) => {
    const total = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${m}m`;
  };

  const getLedgerTitle = (entry) => {
    switch (entry.type) {
      case 'earn': return 'Focus session';
      case 'spend': return `Opened ${entry.meta?.appName || 'App'}`;
      case 'emergency': return `Emergency: ${entry.meta?.appName || 'App'}`;
      case 'rollover_expire': return 'Expired at midnight';
      default: return 'Transaction';
    }
  };

  const getLedgerSign = (type) => {
    return (type === 'earn') ? '+' : '−';
  };

  const getLedgerColor = (type) => {
    if (type === 'earn') return 'green-text';
    if (type === 'rollover_expire') return 'grey-text';
    return 'gold-text'; // spend, emergency
  };

  const now = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const todayEntries = (state.ledger || []).filter(e => isSameCalendarDay(e.timestamp, now));
  const yesterdayEntries = (state.ledger || []).filter(e => isSameCalendarDay(e.timestamp, yesterday));

  const rollover = getRolloverProjection(state?.balanceSeconds || 0);
  const weeklyChartData = getWeeklyChartData(state?.ledger || []);
  const maxDaySec = Math.max(...weeklyChartData.map((d) => d.earnedSeconds + d.spentSeconds + d.expiredSeconds), 1);

  const weekEarned = weeklyChartData.reduce((sum, d) => sum + d.earnedSeconds, 0);
  const weekSpent = weeklyChartData.reduce((sum, d) => sum + d.spentSeconds, 0);
  const weekExpired = weeklyChartData.reduce((sum, d) => sum + d.expiredSeconds, 0);
  const maxEconomy = Math.max(weekEarned, weekSpent, weekExpired, 1);

  const renderLedgerRow = (entry) => (
    <div className="ledger-row" key={entry.id}>
      <div>
        <p className="ledger-title">{getLedgerTitle(entry)}</p>
        <span className="ledger-time">
          {new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
      <span className={`ledger-val ${getLedgerColor(entry.type)}`}>
        {getLedgerSign(entry.type)}{formatLedgerAmount(entry.amountSeconds)}
      </span>
    </div>
  );

  return (
    <div className="dashboard-content">
      {/* Hero Headline */}
      <h1 className="dashboard-headline">Your time, itemized.</h1>

      {/* Available Balance Card */}
      <div className="wallet-balance-card">
        <span className="balance-card-lbl">AVAILABLE NOW</span>
        <div className="balance-digits-large">{formatLargeBalance(state?.balanceSeconds)}</div>
        <div className="balance-meter-track">
          <div className="balance-meter-fill" style={{ width: '65%' }}></div>
        </div>
      </div>

      {/* Today Summary Pills */}
      <div className="wallet-summary-row">
        <div className="wallet-summary-pill green">Earned +17m</div>
        <div className="wallet-summary-pill gold">Spent −10m</div>
      </div>

      {/* Midnight Rollover Breakdown */}
      <div className="rollover-box">
        <div className="rollover-heading">
          <EarnStepIcon color="#4b7f6b" size={20} />
          <h2>Midnight rollover</h2>
        </div>
        <div className="rollover-metrics-grid">
          <div className="rollover-metric-card">
            <span className="metric-card-lbl">Current balance</span>
            <span className="metric-card-val" data-balance={state?.balanceSeconds || 0}>
              {formatLargeBalance(state?.balanceSeconds || 0)}
            </span>
          </div>
          <div className="rollover-metric-card">
            <span className="metric-card-lbl">Carried today · 33.3%</span>
            <span
              className="metric-card-val green-text"
              data-carries-forward={rollover.carriesForward}
            >
              {formatLargeBalance(rollover.carriesForward)}
            </span>
          </div>
          <div className="rollover-metric-card">
            <span className="metric-card-lbl">Expired · 66.7%</span>
            <span
              className="metric-card-val grey-text"
              data-expiring={rollover.expiring}
            >
              {formatLargeBalance(rollover.expiring)}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Rollover Rule */}
      <div className="rollover-rule-card">
        <div className="rollover-rule-header">
          <EarnStepIcon color="#4b7f6b" size={18} />
          <h3>Daily rollover rule</h3>
        </div>
        <p className="rollover-rule-desc">
          At midnight, <strong>33.3%</strong> of yesterday's unused Winning Time carries over to keep your momentum, while the remaining <strong>66.7%</strong> expires so each day starts fresh.
        </p>
        <div className="rollover-distribution-bar">
          <div className="rollover-bar-segment green" style={{ width: '33.3%' }}>
            <span>33.3% Carried</span>
          </div>
          <div className="rollover-bar-segment grey" style={{ width: '66.7%' }}>
            <span>66.7% Expired</span>
          </div>
        </div>
      </div>

      {/* Today Transaction Ledger */}
      <div className="ledger-section">
        <h2>Today</h2>
        <div className="ledger-card">
          {todayEntries.length > 0
            ? todayEntries.map(renderLedgerRow)
            : <p className="ledger-empty">No time transactions today.</p>
          }
        </div>
      </div>

      {/* Yesterday Transaction Ledger */}
      <div className="ledger-section">
        <h2>Yesterday</h2>
        <div className="ledger-card">
          {yesterdayEntries.length > 0
            ? yesterdayEntries.map(renderLedgerRow)
            : <p className="ledger-empty">No time transactions yesterday.</p>
          }
        </div>
      </div>

      {/* This week's economy */}
      <div className="economy-box">
        <h2>This week's economy</h2>

        <div className="framer-bar-chart">
          {weeklyChartData.map((day, idx) => {
            const dayTotal = day.earnedSeconds + day.spentSeconds + day.expiredSeconds;
            const hasActivity = dayTotal > 0;
            const barHeight = hasActivity
              ? `${Math.max(14, Math.round((dayTotal / maxDaySec) * 90))}px`
              : '4px';

            const earnedPct = hasActivity ? (day.earnedSeconds / dayTotal) * 100 : 0;
            const spentPct = hasActivity ? (day.spentSeconds / dayTotal) * 100 : 0;
            const expiredPct = hasActivity ? (day.expiredSeconds / dayTotal) * 100 : 0;

            return (
              <div key={idx} className="framer-chart-column" data-day={day.dateLabel}>
                <span className="chart-bar-value">{formatDurationShort(dayTotal)}</span>
                <div className="chart-bar-track">
                  <div
                    className="framer-bar-col"
                    style={{
                      height: barHeight,
                      backgroundColor: hasActivity ? 'transparent' : '#e2e8e4',
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      overflow: 'hidden',
                    }}
                    title={`${day.dateLabel}: +${formatDurationShort(day.earnedSeconds)} earned, −${formatDurationShort(day.spentSeconds)} spent, ${formatDurationShort(day.expiredSeconds)} expired`}
                    data-earned={day.earnedSeconds}
                    data-spent={day.spentSeconds}
                    data-expired={day.expiredSeconds}
                  >
                    {hasActivity && (
                      <>
                        {day.earnedSeconds > 0 && (
                          <div
                            style={{
                              height: `${earnedPct}%`,
                              width: '100%',
                              backgroundColor: '#4b7f6b',
                            }}
                          />
                        )}
                        {day.spentSeconds > 0 && (
                          <div
                            style={{
                              height: `${spentPct}%`,
                              width: '100%',
                              backgroundColor: '#c79b3b',
                            }}
                          />
                        )}
                        {day.expiredSeconds > 0 && (
                          <div
                            style={{
                              height: `${expiredPct}%`,
                              width: '100%',
                              backgroundColor: '#8b93a1',
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
                <span className="chart-bar-label">{day.dateLabel}</span>
              </div>
            );
          })}
        </div>

        <div className="economy-bar-group">
          <div className="economy-bar-labels">
            <span>Earned</span>
            <span className="bold-val">{formatDurationWithMin(weekEarned)}</span>
          </div>
          <div className="economy-track">
            <div
              className="economy-fill green"
              style={{ width: `${weekEarned > 0 ? Math.round((weekEarned / maxEconomy) * 100) : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="economy-bar-group">
          <div className="economy-bar-labels">
            <span>Spent</span>
            <span className="bold-val">{formatDurationWithMin(weekSpent)}</span>
          </div>
          <div className="economy-track">
            <div
              className="economy-fill gold"
              style={{ width: `${weekSpent > 0 ? Math.round((weekSpent / maxEconomy) * 100) : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="economy-bar-group">
          <div className="economy-bar-labels">
            <span>Expired unused</span>
            <span className="bold-val">{formatDurationWithMin(weekExpired)}</span>
          </div>
          <div className="economy-track">
            <div
              className="economy-fill grey"
              style={{ width: `${weekExpired > 0 ? Math.round((weekExpired / maxEconomy) * 100) : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Conversion Rate Card */}
      <a 
        href="#settings" 
        className="conversion-rate-card"
        onClick={(e) => {
          if (navigateTo) {
            e.preventDefault();
            navigateTo('settings');
          }
        }}
      >
        <div className="icon-tile">
          <SettingsIcon color="#1c1f1e" size={18} />
        </div>
        <div className="conversion-copy">
          <div className="conversion-header">
            <h2>Conversion rate</h2>
            <span className="rate-badge">60:{state.conversionRate?.winMinutes || 10}</span>
          </div>
          <p>Change the single source of truth in Settings. Adjustments lock after the 5-minute review window.</p>
        </div>
        <ChevronRightIcon color="#8b93a1" size={18} />
      </a>
    </div>
  );
};
