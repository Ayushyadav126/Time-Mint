import React, { useState, useEffect } from 'react';
import { 
  ShieldIcon,
  SmartphoneIcon,
  HourglassMoonIcon, 
  LockIcon,
  InstagramIcon,
  YouTubeIcon,
  TikTokIcon,
  RedditIcon,
  XTwitterIcon,
  NetflixIcon
} from '../components/Icons';
import { useAppState } from '../state/AppStateContext';
import { 
  getBlockedAppStatus, 
  formatGraceCountdown, 
  formatLockedCountdown 
} from '../state/blockedAppStatus';

const MOCK_APPS = [
  { id: 'instagram', name: 'Instagram', icon: InstagramIcon },
  { id: 'youtube', name: 'YouTube', icon: YouTubeIcon },
  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon },
  { id: 'reddit', name: 'Reddit', icon: RedditIcon },
  { id: 'x', name: 'X', icon: XTwitterIcon },
  { id: 'netflix', name: 'Netflix', icon: NetflixIcon },
];

const getAppIcon = (id, name) => {
  const found = MOCK_APPS.find(
    (app) => app.id === id || app.name.toLowerCase() === (name || '').toLowerCase()
  );
  return found ? found.icon : SmartphoneIcon;
};

export const BlockerPage = ({ navigateTo }) => {
  const { state, dispatch } = useAppState();
  const [, setTick] = useState(0);

  // Live timer tick for real-time countdown updates
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const blockedApps = state.blockedApps || [];
  const blockedCount = blockedApps.length;
  const graceCount = blockedApps.filter(
    (app) => getBlockedAppStatus(app.addedAt) === 'grace'
  ).length;

  return (
    <div className="dashboard-content">
      {/* Hero Headline & Subtitle */}
      <h1 className="dashboard-headline">Choose the apps that pull you away.</h1>
      <p className="page-intro-sub">They stay locked unless you spend earned time — or use Emergency Mode.</p>

      {/* Blocker Status 3-Column Card */}
      <div className="blocker-status-box">
        <div className="blocker-status-title">
          <ShieldIcon color="#ffffff" size={18} />
          <span>Blocker status</span>
        </div>
        <div className="blocker-status-grid">
          <div className="blocker-stat-tile">
            <span className="stat-big-val">{blockedCount}</span>
            <span className="stat-lbl">Blocked</span>
          </div>
          <div className="blocker-stat-tile">
            <span className="stat-big-val">{graceCount}</span>
            <span className="stat-lbl">In grace</span>
          </div>
          <div className="blocker-stat-tile">
            <span className="stat-big-val">{formatBalance(state.balanceSeconds)}</span>
            <span className="stat-lbl">Available</span>
          </div>
        </div>
      </div>

      {/* Section A: Your Disturbing Apps List */}
      <div className="blocked-apps-list-group">
        {blockedApps.length === 0 ? (
          <div className="blocked-app-card" style={{ justifyContent: 'center', textAlign: 'center', padding: '24px 20px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              No apps blocked yet. Add your first app below to protect your focus.
            </span>
          </div>
        ) : (
          blockedApps.map((app) => {
            const status = getBlockedAppStatus(app.addedAt);
            const AppIcon = getAppIcon(app.id, app.name);
            const handleCardClick = () => {
              if (navigateTo) {
                navigateTo(`unlock/${app.id}`);
              } else {
                window.location.hash = `unlock/${app.id}`;
              }
            };

            if (status === 'grace') {
              return (
                <div 
                  key={app.id} 
                  className="blocked-app-card grace-border"
                  onClick={handleCardClick}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="app-card-title-group">
                    <AppIcon size={20} />
                    <span className="blocked-app-name">{app.name}</span>
                  </div>
                  <span 
                    className="undo-grace-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'REMOVE_BLOCKED_APP', id: app.id });
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    Undo · {formatGraceCountdown(app.addedAt)}
                  </span>
                </div>
              );
            }

            if (status === 'locked') {
              return (
                <div 
                  key={app.id} 
                  className="blocked-app-card"
                  onClick={handleCardClick}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="app-card-title-group">
                    <AppIcon size={20} />
                    <span className="blocked-app-name">{app.name}</span>
                  </div>
                  <span className="locked-pill-tag">
                    Locked for {formatLockedCountdown(app.addedAt)}
                  </span>
                </div>
              );
            }

            // status === 'removable'
            return (
              <div 
                key={app.id} 
                className="blocked-app-card"
                onClick={handleCardClick}
                style={{ cursor: 'pointer' }}
              >
                <div className="app-card-title-group">
                  <AppIcon size={20} />
                  <span className="blocked-app-name">{app.name}</span>
                </div>
                <span 
                  className="undo-grace-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_BLOCKED_APP', id: app.id });
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Remove
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Grace Notice Card */}
      <div className="grace-notice-card">
        <div className="grace-notice-copy">
          <h3>{graceCount > 0 ? `New block grace period · ${graceCount} active` : '5-minute grace period on new blocks'}</h3>
          <p>After 5 minutes, changes lock for 24 hours to keep your focus honest.</p>
        </div>
      </div>

      {/* Section B: Apps on this phone */}
      <div className="phone-apps-section">
        <h2>Apps on this phone</h2>
        <div className="phone-apps-cards">
          {MOCK_APPS.map((app) => {
            const AppIcon = app.icon;
            const blockedEntry = blockedApps.find((b) => String(b.id) === String(app.id));
            const isBlocked = Boolean(blockedEntry);
            const status = isBlocked ? getBlockedAppStatus(blockedEntry.addedAt) : null;
            const isLocked = isBlocked && status === 'locked';

            let desc = 'Not on your Disturbing Apps list';
            let isGold = false;

            if (isBlocked) {
              if (status === 'grace') {
                desc = `Disturbing App · changes lock in ${formatGraceCountdown(blockedEntry.addedAt)}`;
                isGold = true;
              } else if (status === 'locked') {
                desc = `Locked for ${formatLockedCountdown(blockedEntry.addedAt)} · cannot be removed`;
                isGold = true;
              } else {
                desc = 'Disturbing App · 24h passed, removable';
                isGold = false;
              }
            }

            const handleToggle = () => {
              if (isBlocked) {
                if (!isLocked) {
                  dispatch({ type: 'REMOVE_BLOCKED_APP', id: app.id });
                }
              } else {
                dispatch({ type: 'ADD_BLOCKED_APP', id: app.id, name: app.name });
              }
            };

            return (
              <div key={app.id} className="phone-app-card-item">
                <div className="phone-app-info">
                  <div className="app-card-title-group">
                    <AppIcon size={20} />
                    <span className="phone-app-title">{app.name}</span>
                  </div>
                  <span className={`phone-app-sub ${isGold ? 'gold-sub' : ''}`}>{desc}</span>
                </div>
                <label 
                  className={`toggle-switch ${isLocked ? 'disabled' : ''}`}
                  style={isLocked ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  <input 
                    type="checkbox" 
                    checked={isBlocked} 
                    disabled={isLocked}
                    onChange={handleToggle} 
                  />
                  <span 
                    className="slider round"
                    style={isLocked ? { cursor: 'not-allowed' } : {}}
                  ></span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 1: When you open a blocked app */}
      <div className="info-guide-card">
        <div className="guide-card-header">
          <SmartphoneIcon color="#c79b3b" size={18} />
          <h2>When you open a blocked app</h2>
        </div>
        <p>Your balance appears first. Spending starts only after you confirm, then the same Ring drains live.</p>
        <div className="available-spend-pill">
          <span>Available to spend</span>
          <strong>{formatBalance(state.balanceSeconds)}</strong>
        </div>
      </div>

      {/* Card 2: Emergency Mode is a clear trade-off */}
      <div className="info-guide-card gold-border">
        <div className="guide-card-header">
          <HourglassMoonIcon color="#c79b3b" size={18} />
          <h2>Emergency Mode is a clear trade-off</h2>
        </div>
        <p>Take 5 minutes now and tomorrow’s Winning Time begins 5 minutes lower.</p>
      </div>

      {/* Card 3: Why changes lock */}
      <div className="info-guide-card grey-bg">
        <div className="guide-card-header">
          <LockIcon color="#5f6663" size={18} />
          <h2>Why changes lock</h2>
        </div>
        <p>After the 5-minute grace period, an app stays on the list for 24 hours. The reason and unlock path always remain visible.</p>
      </div>
    </div>
  );
};


