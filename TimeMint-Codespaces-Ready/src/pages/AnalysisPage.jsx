import React, { useState } from 'react';
import { 
  CalendarFlameIcon, 
  TimerIcon, 
  SparklesIcon, 
  InstagramIcon, 
  YouTubeIcon, 
  TikTokIcon,
  AppBlockerIcon
} from '../components/Icons';
import { useAppState, isSameCalendarDay } from '../state/AppStateContext';
import {
  getFocusTrends,
  getWinningTimeEconomy,
  getDisturbingAppsBreakdown,
  getWeeklySummary
} from '../state/analyticsSelectors';

function formatDurationShort(sec) {
  const total = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}

function formatDurationWithMin(sec) {
  const total = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h} hr`;
  }
  return `${m} min`;
}

function getAppIcon(name = '', id = '') {
  const lower = `${name} ${id}`.toLowerCase();
  if (lower.includes('instagram') || lower.includes('insta')) return InstagramIcon;
  if (lower.includes('youtube')) return YouTubeIcon;
  if (lower.includes('tiktok')) return TikTokIcon;
  return AppBlockerIcon;
}

function formatFocusWindow(peakHour) {
  if (peakHour < 0) return 'None yet';
  const sHour = peakHour % 12 || 12;
  const sAmpm = peakHour >= 12 ? 'PM' : 'AM';
  const endHour = (peakHour + 2) % 24;
  const eHour = endHour % 12 || 12;
  const eAmpm = endHour >= 12 ? 'PM' : 'AM';
  if (sAmpm === eAmpm) return `${sHour}–${eHour} ${sAmpm}`;
  return `${sHour} ${sAmpm}–${eHour} ${eAmpm}`;
}

export const AnalysisPage = ({ navigateTo }) => {
  const [filterView, setFilterView] = useState('week'); // 'day' | 'week' | 'month'
  const { state } = useAppState();

  const ledger = state?.ledger || [];
  const now = Date.now();

  const focusTrends = getFocusTrends(ledger, filterView, now);
  const economy = getWinningTimeEconomy(ledger, filterView, now);
  const disturbing = getDisturbingAppsBreakdown(ledger, filterView, now);
  const weeklySummary = getWeeklySummary(ledger, now);

  const currentStreak = focusTrends.currentStreakDays;

  // Build trendBars and trendSubtitle based on active filterView
  const buildDayView = () => {
    // 5 time slot intervals: 9 AM (before 11), 12 PM (11-14), 3 PM (14-17), 6 PM (17-20), 9 PM (20+)
    const dayBuckets = [
      { label: '9 AM', seconds: 0 },
      { label: '12 PM', seconds: 0 },
      { label: '3 PM', seconds: 0 },
      { label: '6 PM', seconds: 0 },
      { label: '9 PM', seconds: 0 },
    ];

    ledger.forEach((entry) => {
      if (entry && entry.type === 'earn' && isSameCalendarDay(entry.timestamp, new Date(now))) {
        const h = new Date(entry.timestamp).getHours();
        const dur = (entry.meta && typeof entry.meta.focusedSeconds === 'number') ? entry.meta.focusedSeconds : 0;
        if (h < 11) dayBuckets[0].seconds += dur;
        else if (h < 14) dayBuckets[1].seconds += dur;
        else if (h < 17) dayBuckets[2].seconds += dur;
        else if (h < 20) dayBuckets[3].seconds += dur;
        else dayBuckets[4].seconds += dur;
      }
    });

    const maxDaySec = Math.max(...dayBuckets.map((b) => b.seconds), 1);
    const trendBars = dayBuckets.map((b) => ({
      label: b.label,
      timeVal: formatDurationShort(b.seconds),
      height: b.seconds > 0 ? `${Math.max(14, Math.round((b.seconds / maxDaySec) * 90))}px` : '4px',
      color: b.seconds === maxDaySec && b.seconds > 0 ? '#4b7f6b' : b.seconds > 0 ? '#a8bdaf' : '#e2e8e4',
    }));

    // Yesterday comparison
    const yesterdayDate = new Date(now - 24 * 60 * 60 * 1000);
    let yesterdayFocused = 0;
    ledger.forEach((entry) => {
      if (entry && entry.type === 'earn' && isSameCalendarDay(entry.timestamp, yesterdayDate)) {
        yesterdayFocused += (entry.meta && typeof entry.meta.focusedSeconds === 'number') ? entry.meta.focusedSeconds : 0;
      }
    });

    let trendSubtitle = `${formatDurationShort(focusTrends.totalFocusedSeconds)} today`;
    if (yesterdayFocused > 0) {
      const pct = Math.round(((focusTrends.totalFocusedSeconds - yesterdayFocused) / yesterdayFocused) * 100);
      trendSubtitle += ` · ${pct >= 0 ? '+' : ''}${pct}%`;
    }

    return { trendBars, trendSubtitle };
  };

  const buildWeekView = () => {
    // 7 days of the week: Mon..Sun
    const daysOrder = [1, 2, 3, 4, 5, 6, 0];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekBuckets = labels.map((label) => ({ label, seconds: 0 }));

    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    ledger.forEach((entry) => {
      if (entry && entry.type === 'earn' && entry.timestamp >= sevenDaysAgo && entry.timestamp <= now) {
        const d = new Date(entry.timestamp).getDay();
        const idx = daysOrder.indexOf(d);
        if (idx !== -1) {
          weekBuckets[idx].seconds += (entry.meta && typeof entry.meta.focusedSeconds === 'number') ? entry.meta.focusedSeconds : 0;
        }
      }
    });

    const maxWeekSec = Math.max(...weekBuckets.map((b) => b.seconds), 1);
    const trendBars = weekBuckets.map((b) => ({
      label: b.label,
      timeVal: formatDurationShort(b.seconds),
      height: b.seconds > 0 ? `${Math.max(14, Math.round((b.seconds / maxWeekSec) * 90))}px` : '4px',
      color: b.seconds === maxWeekSec && b.seconds > 0 ? '#4b7f6b' : b.seconds > 0 ? '#a8bdaf' : '#e2e8e4',
    }));

    let trendSubtitle = `${formatDurationShort(focusTrends.totalFocusedSeconds)} this week`;
    const lastWeekFocused = weeklySummary.lastWeek.focusedSeconds;
    if (lastWeekFocused > 0) {
      const pct = Math.round(((focusTrends.totalFocusedSeconds - lastWeekFocused) / lastWeekFocused) * 100);
      trendSubtitle += ` · ${pct >= 0 ? '+' : ''}${pct}%`;
    }

    return { trendBars, trendSubtitle };
  };

  const buildMonthView = () => {
    // 5 chronological blocks across the last 30 days
    const monthBuckets = [
      { label: 'Week 1', seconds: 0, minDays: 24, maxDays: 30 },
      { label: 'Week 2', seconds: 0, minDays: 18, maxDays: 24 },
      { label: 'Week 3', seconds: 0, minDays: 12, maxDays: 18 },
      { label: 'Week 4', seconds: 0, minDays: 6, maxDays: 12 },
      { label: 'Week 5', seconds: 0, minDays: 0, maxDays: 6 },
    ];

    const dayMs = 24 * 60 * 60 * 1000;
    ledger.forEach((entry) => {
      if (entry && entry.type === 'earn' && entry.timestamp) {
        const diffMs = now - entry.timestamp;
        const diffDays = diffMs / dayMs;
        if (diffDays >= 0 && diffDays <= 30) {
          const focused = (entry.meta && typeof entry.meta.focusedSeconds === 'number') ? entry.meta.focusedSeconds : 0;
          for (const bucket of monthBuckets) {
            if (diffDays >= bucket.minDays && diffDays <= bucket.maxDays) {
              bucket.seconds += focused;
              break;
            }
          }
        }
      }
    });

    const maxMonthSec = Math.max(...monthBuckets.map((b) => b.seconds), 1);
    const trendBars = monthBuckets.map((b) => ({
      label: b.label,
      timeVal: formatDurationShort(b.seconds),
      height: b.seconds > 0 ? `${Math.max(14, Math.round((b.seconds / maxMonthSec) * 90))}px` : '4px',
      color: b.seconds === maxMonthSec && b.seconds > 0 ? '#4b7f6b' : b.seconds > 0 ? '#a8bdaf' : '#e2e8e4',
    }));

    let trendSubtitle = `${formatDurationShort(focusTrends.totalFocusedSeconds)} this month`;
    // Compare to days 31-60 ago
    let prevMonthFocused = 0;
    ledger.forEach((entry) => {
      if (entry && entry.type === 'earn' && entry.timestamp) {
        const diffDays = (now - entry.timestamp) / dayMs;
        if (diffDays > 30 && diffDays <= 60) {
          prevMonthFocused += (entry.meta && typeof entry.meta.focusedSeconds === 'number') ? entry.meta.focusedSeconds : 0;
        }
      }
    });
    if (prevMonthFocused > 0) {
      const pct = Math.round(((focusTrends.totalFocusedSeconds - prevMonthFocused) / prevMonthFocused) * 100);
      trendSubtitle += ` · ${pct >= 0 ? '+' : ''}${pct}%`;
    }

    return { trendBars, trendSubtitle };
  };

  const trendData = filterView === 'day' ? buildDayView() : filterView === 'month' ? buildMonthView() : buildWeekView();

  // Economy card values
  const maxEco = Math.max(economy.earnedTotal, economy.spentTotal, 1);
  const ecoStatusNote = economy.negativeBalanceEvents.count > 0
    ? `${formatDurationWithMin(economy.expiredTotal)} expired unused · ${economy.negativeBalanceEvents.count} negative balance ${economy.negativeBalanceEvents.count === 1 ? 'event' : 'events'} (deepest: ${Math.round(economy.negativeBalanceEvents.deepestNegative / 60)}m)`
    : `${formatDurationWithMin(economy.expiredTotal)} expired unused · no negative balance ${filterView === 'day' ? 'today' : filterView === 'week' ? 'this week' : 'this month'}`;

  // Disturbing apps card
  const maxAppSpend = disturbing.byApp.length > 0 ? disturbing.byApp[0].amountSeconds : 1;
  const disturbingApps = disturbing.byApp.map((app) => ({
    name: app.appName,
    time: formatDurationWithMin(app.amountSeconds),
    width: maxAppSpend > 0 ? `${Math.max(10, Math.round((app.amountSeconds / maxAppSpend) * 100))}%` : '0%',
    icon: getAppIcon(app.appName, app.appId),
  }));

  let disturbingSubtitle = 'No app spend recorded';
  if (disturbing.byApp.length > 0 && disturbing.totalDisturbingSeconds > 0) {
    const topApp = disturbing.byApp[0];
    const pct = Math.round((topApp.amountSeconds / disturbing.totalDisturbingSeconds) * 100);
    disturbingSubtitle = `${topApp.appName} used ${formatDurationShort(topApp.amountSeconds)} · ${pct}% of spend`;
  }

  // Summary card (always week-over-week digest per spec and DoD 4)
  const deltaFocused = weeklySummary.deltas.focusedSeconds;
  let summaryNote = 'Focus time matched last week.';
  if (deltaFocused > 0) {
    summaryNote = `${formatDurationShort(deltaFocused)} more focus than last week, mostly from consistent weekday blocks.`;
  } else if (deltaFocused < 0) {
    summaryNote = `${formatDurationShort(Math.abs(deltaFocused))} less focus than last week.`;
  }

  // Bonus focus patterns derived from patternsByHour, averageSessionSeconds, emergencyCount
  const maxHourCount = Math.max(...focusTrends.patternsByHour);
  const bestHour = maxHourCount > 0 ? focusTrends.patternsByHour.indexOf(maxHourCount) : -1;

  const current = {
    headline: 'Patterns, not pressure.',
    trendSubtitle: trendData.trendSubtitle,
    trendBars: trendData.trendBars,
    economy: {
      subtitle: `Earned ${formatDurationShort(economy.earnedTotal)} · Spent ${formatDurationShort(economy.spentTotal)} · Expired ${formatDurationShort(economy.expiredTotal)}`,
      earnedMins: formatDurationWithMin(economy.earnedTotal),
      earnedWidth: economy.earnedTotal > 0 ? `${Math.round((economy.earnedTotal / maxEco) * 100)}%` : '0%',
      spentMins: formatDurationWithMin(economy.spentTotal),
      spentWidth: economy.spentTotal > 0 ? `${Math.round((economy.spentTotal / maxEco) * 100)}%` : '0%',
      statusNote: ecoStatusNote,
    },
    disturbingApps,
    disturbingSubtitle,
    summaryTitle: 'Weekly Summary',
    summaryStats: [
      { val: formatDurationShort(weeklySummary.thisWeek.focusedSeconds), lbl: 'This week', isGreen: false },
      { val: formatDurationShort(weeklySummary.lastWeek.focusedSeconds), lbl: 'Last week', isGreen: false },
      { val: `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`, lbl: 'Streak', isGreen: true },
    ],
    summaryNote,
    patterns: [
      { lbl: 'Best focus window', val: formatFocusWindow(bestHour) },
      { lbl: 'Average session', val: formatDurationWithMin(focusTrends.averageSessionSeconds) },
      { lbl: 'Emergency Mode', val: `${disturbing.emergencyCount} ${disturbing.emergencyCount === 1 ? 'use' : 'uses'}` },
    ],
    guideText: filterView === 'day'
      ? (focusTrends.totalFocusedSeconds > 0
          ? 'Your morning session was uninterrupted. Protect that window when you can.'
          : 'Start a session today to build momentum and protect your focus windows.')
      : filterView === 'month'
      ? (focusTrends.totalFocusedSeconds > 0
          ? 'You stayed consistent across weeks. Morning routine continues to drive your highest output.'
          : 'Monthly patterns emerge as daily sessions accumulate.')
      : (focusTrends.totalFocusedSeconds > 0
          ? 'Your longer morning sessions are doing most of the work. Protect that window when you can.'
          : 'Consistent sessions this week will help establish your natural rhythm.'),
  };

  return (
    <div className="dashboard-content">
      {/* Hero Headline */}
      <h1 className="dashboard-headline">Patterns, not pressure.</h1>

      {/* Filter Tabs: Day | Week | Month */}
      <div className="analysis-filter-bar">
        <button 
          className={`filter-btn ${filterView === 'day' ? 'active' : ''}`}
          onClick={() => setFilterView('day')}
        >
          Day
        </button>
        <button 
          className={`filter-btn ${filterView === 'week' ? 'active' : ''}`}
          onClick={() => setFilterView('week')}
        >
          Week
        </button>
        <button 
          className={`filter-btn ${filterView === 'month' ? 'active' : ''}`}
          onClick={() => setFilterView('month')}
        >
          Month
        </button>
      </div>

      {/* Card 1: Focus Trends (Framer 4-bar exact chart with clear labels & values) */}
      <div className="analysis-card-box">
        <div className="card-header-block">
          <h2>Focus Trends</h2>
          <span className="card-subtitle-badge">{current.trendSubtitle}</span>
        </div>

        <div className="framer-bar-chart">
          {current.trendBars.map((bar, idx) => (
            <div key={idx} className="framer-chart-column">
              <span className="chart-bar-value">{bar.timeVal}</span>
              <div className="chart-bar-track">
                <div 
                  className="framer-bar-col"
                  style={{
                    height: bar.height,
                    backgroundColor: bar.color
                  }}
                  title={`${bar.label}: ${bar.timeVal}`}
                />
              </div>
              <span className="chart-bar-label">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card 2: Winning Time Economy (Exact Framer Dark Card #1c1f1e) */}
      <div className="analysis-card-box dark-card">
        <div className="card-header-block">
          <h2>Winning Time Economy</h2>
          <span className="card-subtitle-badge">{current.economy.subtitle}</span>
        </div>

        <div className="economy-comparison-list">
          <div className="economy-bar-row">
            <div className="eco-bar-lbl-row">
              <span>Earned</span>
              <strong className="green-text">{current.economy.earnedMins}</strong>
            </div>
            <div className="eco-track">
              <div 
                className="economy-fill green" 
                style={{ width: current.economy.earnedWidth }}
              />
            </div>
          </div>

          <div className="economy-bar-row">
            <div className="eco-bar-lbl-row">
              <span>Spent</span>
              <strong className="gold-text">{current.economy.spentMins}</strong>
            </div>
            <div className="eco-track">
              <div 
                className="economy-fill gold" 
                style={{ width: current.economy.spentWidth }}
              />
            </div>
          </div>
        </div>

        <p className="economy-status-note">{current.economy.statusNote}</p>
      </div>

      {/* Card 3: Disturbing Apps Breakdown (With App Logos) */}
      <div className="analysis-card-box">
        <div className="card-header-block">
          <h2>Disturbing Apps Breakdown</h2>
          <span className="card-subtitle-badge">{current.disturbingSubtitle}</span>
        </div>

        <div className="disturbing-breakdown-list">
          {current.disturbingApps.length === 0 ? (
            <p className="economy-status-note" style={{ margin: '8px 0' }}>No app spend recorded for this period.</p>
          ) : (
            current.disturbingApps.map((app, idx) => {
              const Icon = app.icon;
              return (
                <div key={idx} className="disturbing-app-row">
                  <div className="app-spend-label">
                    <div className="app-spend-label-left">
                      <Icon size={18} />
                      <span>{app.name}</span>
                    </div>
                    <strong>{app.time}</strong>
                  </div>
                  <div className="disturbing-bar-track">
                    <div 
                      className="disturbing-bar-fill" 
                      style={{ width: app.width }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Card 4: Summary (Weekly/Daily/Monthly) with Calendar Icon */}
      <div className="analysis-card-box">
        <div className="card-header-icon-row">
          <CalendarFlameIcon color="#4b7f6b" size={20} />
          <h2>{current.summaryTitle}</h2>
        </div>

        <div className="summary-stat-pills-row">
          {current.summaryStats.map((stat, idx) => (
            <div key={idx} className="stat-pill-item">
              <span className={`stat-pill-val ${stat.isGreen ? 'green-text' : ''}`}>
                {stat.val}
              </span>
              <span className="stat-pill-lbl">{stat.lbl}</span>
            </div>
          ))}
        </div>

        <div className="summary-insight-card">
          <div className="insight-header-tag">
            <span className="insight-dot"></span>
            <span className="insight-badge-title">
              {filterView === 'day' ? 'Daily Insight' : filterView === 'month' ? 'Monthly Insight' : 'Weekly Insight'}
            </span>
          </div>
          <p className="summary-insight-text">{current.summaryNote}</p>
        </div>
      </div>

      {/* Card 5: Focus Patterns with Clock Icon */}
      <div className="analysis-card-box">
        <div className="card-header-icon-row">
          <TimerIcon color="#4b7f6b" size={20} />
          <h2>Focus patterns</h2>
        </div>

        <div className="patterns-list">
          {current.patterns.map((item, idx) => (
            <div key={idx} className="pattern-row">
              <span className="pattern-lbl">{item.lbl}</span>
              <span className="pattern-val">{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card 6: A useful pattern, not a verdict (with Sparkles Icon & green border) */}
      <div className="info-guide-card success-border">
        <div className="card-header-icon-row">
          <SparklesIcon color="#4b7f6b" size={18} />
          <h2>A useful pattern, not a verdict</h2>
        </div>
        <p>{current.guideText}</p>
      </div>
    </div>
  );
};
