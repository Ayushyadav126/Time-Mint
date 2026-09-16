import React, { useState, useEffect, useRef } from 'react';
import { SpendRing } from '../components/SpendRing';
import { EmergencyModal } from '../components/EmergencyModal';
import { useAppState } from '../state/AppStateContext';
import { 
  ShieldIcon, 
  SmartphoneIcon, 
  InstagramIcon, 
  YouTubeIcon, 
  TikTokIcon, 
  RedditIcon, 
  XTwitterIcon, 
  NetflixIcon,
  HourglassMoonIcon
} from '../components/Icons';

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

export const UnlockPage = ({ appId, navigateTo }) => {
  const { state, dispatch } = useAppState();
  const [timeUpNotice, setTimeUpNotice] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  // Look up app name & icon
  const blockedEntry = (state.blockedApps || []).find(
    (app) => String(app.id) === String(appId)
  );
  const fallbackMock = MOCK_APPS.find(
    (app) => String(app.id) === String(appId)
  );
  const appName = blockedEntry?.name || fallbackMock?.name || appId || 'App';
  const AppIcon = getAppIcon(appId, appName);

  const isUnlocking = Boolean(
    state.activeUnlock && String(state.activeUnlock.appId) === String(appId)
  );
  const isEmergency = Boolean(state.activeUnlock?.isEmergency);

  // Track elapsed time locally with 1-second interval
  const [elapsed, setElapsed] = useState(() => {
    if (isUnlocking && state.activeUnlock?.startedAt) {
      return Math.max(0, Math.floor((Date.now() - state.activeUnlock.startedAt) / 1000));
    }
    return 0;
  });

  // Keep a ref of activeUnlock for unmount cleanup
  const activeUnlockRef = useRef(state.activeUnlock);
  useEffect(() => {
    activeUnlockRef.current = state.activeUnlock;
  }, [state.activeUnlock]);

  // Unmount cleanup: dispatches STOP_UNLOCK if activeUnlock is still set
  // This ensures navigating away (back, nav drawer, bottom nav) stops charging immediately
  useEffect(() => {
    return () => {
      if (activeUnlockRef.current) {
        dispatch({ type: 'STOP_UNLOCK' });
      }
    };
  }, [dispatch]);

  // 1-second tick when unlock is running
  useEffect(() => {
    if (!isUnlocking || !state.activeUnlock?.startedAt) {
      setElapsed(0);
      return;
    }

    const updateTick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - state.activeUnlock.startedAt) / 1000)));
    };

    updateTick();
    const interval = setInterval(updateTick, 1000);
    return () => clearInterval(interval);
  }, [isUnlocking, state.activeUnlock]);

  const balanceAtStart = state.balanceSeconds || 0;

  // For emergency mode: fixed 5 minutes (300 seconds)
  // For normal unlock: based on balanceAtStart
  const remainingSeconds = isUnlocking
    ? (isEmergency
        ? Math.max(0, Math.floor(300 - elapsed))
        : Math.max(0, Math.floor(balanceAtStart - elapsed)))
    : balanceAtStart;

  const percentRemaining = isUnlocking
    ? (isEmergency
        ? (remainingSeconds / 300) * 100
        : (balanceAtStart > 0 ? (remainingSeconds / balanceAtStart) * 100 : 0))
    : (balanceAtStart > 0 ? 100 : 0);

  // Determine colorStage
  // 'normal' at 5:00 and above (>= 300s), 'warning' between 5:00 and 2:00, 'critical' under 2:00
  let colorStage = 'normal';
  if (remainingSeconds < 120) {
    colorStage = 'critical';
  } else if (remainingSeconds < 300) {
    colorStage = 'warning';
  } else {
    colorStage = 'normal';
  }

  // Auto-stop at 0:00
  useEffect(() => {
    if (isUnlocking && remainingSeconds <= 0) {
      setTimeUpNotice(true);
      dispatch({ type: 'STOP_UNLOCK' });
      const timer = setTimeout(() => {
        if (navigateTo) {
          navigateTo('blocker');
        } else {
          window.location.hash = 'blocker';
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isUnlocking, remainingSeconds, dispatch, navigateTo]);

  // Formatting helper with supportive voice for negative balances
  const formatBalanceVoice = (totalSec) => {
    if (totalSec < 0) {
      const negMins = Math.ceil(Math.abs(totalSec) / 60);
      return `−${negMins} min · earn it back tomorrow`;
    }
    const sec = Math.max(0, Math.floor(totalSec || 0));
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const remainingSecs = sec % 60;
    if (hours > 0) {
      return `${hours}:${mins < 10 ? '0' : ''}${mins}`;
    }
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const formatDigits = (totalSec) => {
    const sec = Math.max(0, Math.floor(totalSec || 0));
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleStartUnlock = () => {
    if (state.balanceSeconds > 0) {
      dispatch({ 
        type: 'START_UNLOCK', 
        appId: String(appId), 
        appName 
      });
    }
  };

  const handleStopUnlock = () => {
    dispatch({ type: 'STOP_UNLOCK' });
    if (navigateTo) {
      navigateTo('blocker');
    } else {
      window.location.hash = 'blocker';
    }
  };

  const hasBalance = (state.balanceSeconds || 0) > 0;
  const isNegativeBalance = (state.balanceSeconds || 0) < 0;

  return (
    <div className="dashboard-content">
      {/* Top back navigation breadcrumb */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '4px',
          paddingTop: '4px',
        }}
        onClick={() => navigateTo ? navigateTo('blocker') : (window.location.hash = 'blocker')}
      >
        <span>← Back to Disturbing Apps</span>
      </div>

      {/* Hero Headline & Subtitle */}
      <h1 className="dashboard-headline">Unlock {appName}</h1>
      <p className="page-intro-sub">
        {isUnlocking 
          ? (isEmergency 
              ? 'Emergency Mode is active. 5 minutes of focused access.' 
              : 'Winning Time is draining live. Close the app anytime to stop charging.') 
          : 'Spend your earned Winning Time to access this app.'}
      </p>

      {/* Top Available Balance Card (matching Wallet/Dashboard convention) */}
      <div className="available-spend-pill" style={{ margin: '8px 0 16px' }}>
        <span>Available Winning Time</span>
        <strong style={isNegativeBalance && !isUnlocking ? { fontSize: '13px', fontWeight: 600 } : {}}>
          {isUnlocking
            ? (isEmergency ? 'Emergency access (5:00)' : formatBalanceVoice(remainingSeconds))
            : formatBalanceVoice(state.balanceSeconds || 0)}
        </strong>
      </div>

      {/* Neutral "Time's up — back to focus" notification banner */}
      {timeUpNotice && (
        <div 
          style={{
            backgroundColor: 'var(--dark-banner-bg)',
            color: 'var(--dark-banner-text)',
            padding: '14px 18px',
            borderRadius: '14px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          Time's up — back to focus
        </div>
      )}

      {/* Central Spend Ring */}
      <div className="focus-ring-container" style={{ padding: '12px 0 20px' }}>
        <SpendRing
          percentRemaining={percentRemaining}
          colorStage={colorStage}
          size={240}
        >
          <div className="timer-digits">
            {isUnlocking 
              ? formatDigits(remainingSeconds) 
              : (hasBalance ? formatDigits(balanceAtStart) : '0:00')}
          </div>
          <div 
            className="earned-pill-badge"
            style={{
              backgroundColor: isUnlocking 
                ? 'var(--gold-bg)' 
                : 'var(--bg-pill)',
              border: isUnlocking ? '1px solid var(--gold-border)' : 'none',
              maxWidth: '85%',
            }}
          >
            <div 
              className="earned-pill-dot"
              style={{
                backgroundColor: isUnlocking 
                  ? (colorStage === 'critical' ? 'var(--text-muted)' : 'var(--accent-gold)') 
                  : 'var(--text-muted)',
              }}
            />
            <span 
              className="earned-pill-text"
              style={{
                color: isUnlocking 
                  ? (colorStage === 'critical' ? 'var(--text-muted)' : 'var(--accent-gold)') 
                  : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {isUnlocking 
                ? (isEmergency ? 'EMERGENCY ACCESS' : 'SPENDING TIME') 
                : (isNegativeBalance 
                    ? `−${Math.ceil(Math.abs(state.balanceSeconds) / 60)} min · earn it back` 
                    : (hasBalance ? 'READY TO UNLOCK' : 'NO BALANCE'))}
            </span>
          </div>
        </SpendRing>
      </div>

      {/* App Target Indicator Card */}
      <div 
        className="blocked-app-card"
        style={{
          marginBottom: '16px',
          justifyContent: 'space-between',
        }}
      >
        <div className="app-card-title-group">
          <AppIcon size={20} />
          <span className="blocked-app-name">{appName}</span>
        </div>
        <span 
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: isUnlocking ? 'var(--accent-gold)' : 'var(--text-secondary)',
          }}
        >
          {isUnlocking 
            ? (isEmergency ? 'Emergency session' : 'Active session') 
            : 'Protected app'}
        </span>
      </div>

      {/* Action Button: Use Winning Time or Stop */}
      {isUnlocking ? (
        <button 
          className="stop-session-btn"
          onClick={handleStopUnlock}
          style={{
            backgroundColor: 'var(--dark-banner-bg)',
            color: 'var(--dark-banner-text)',
          }}
        >
          {isEmergency ? 'Leave emergency mode' : 'Stop & lock app'}
        </button>
      ) : (
        <div>
          <button 
            className="stop-session-btn"
            onClick={handleStartUnlock}
            disabled={!hasBalance}
            style={!hasBalance ? {
              opacity: 0.5,
              cursor: 'not-allowed',
              backgroundColor: 'var(--track-bg)',
              color: 'var(--text-muted)',
            } : {
              backgroundColor: 'var(--dark-banner-bg)',
              color: 'var(--dark-banner-text)',
              cursor: 'pointer',
            }}
          >
            Use Winning Time
          </button>
          {!hasBalance && (
            <p 
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginTop: '10px',
                lineHeight: 1.4,
              }}
            >
              {isNegativeBalance
                ? `Balance is −${Math.ceil(Math.abs(state.balanceSeconds) / 60)} min · earn it back tomorrow by completing focus sessions in Timer.`
                : 'You have no Winning Time balance remaining. Complete focus sessions in Timer to earn time.'}
            </p>
          )}

          {/* Secondary Action: Use Emergency Mode instead */}
          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setIsEmergencyModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-gold)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 12px',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Use Emergency Mode instead
            </button>
          </div>
        </div>
      )}

      {/* Spend Rule Information Card */}
      <div className="info-guide-card" style={{ marginTop: '20px' }}>
        <div className="guide-card-header">
          <HourglassMoonIcon color="#c79b3b" size={18} />
          <h2>Emergency Mode is a clear trade-off</h2>
        </div>
        <p>
          Take 5 minutes now and tomorrow’s Winning Time begins 5 minutes lower. Available once per calendar day.
        </p>
      </div>

      {/* Emergency Mode Modal */}
      <EmergencyModal 
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        appId={appId}
        appName={appName}
      />
    </div>
  );
};

export default UnlockPage;
