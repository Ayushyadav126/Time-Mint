import React, { useState, useEffect } from 'react';
import { TargetIcon, EarnStepIcon, CheckCircleIcon } from '../components/Icons';
import { useAppState } from '../state/AppStateContext';

export const TimerPage = ({ navigateTo }) => {
  const { state, dispatch } = useAppState();
  const { isTimerRunning, timerStartedAt } = state;

  const [elapsed, setElapsed] = useState(() => {
    if (isTimerRunning && timerStartedAt) {
      return Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000));
    }
    return 0;
  });

  useEffect(() => {
    if (!isTimerRunning || !timerStartedAt) {
      setElapsed(0);
      return;
    }

    const updateElapsed = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, timerStartedAt]);

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      dispatch({ type: 'STOP_TIMER' });
    } else {
      dispatch({ type: 'START_TIMER' });
    }
  };

  return (
    <div className="dashboard-content">
      {/* Hero Headline */}
      <h1 className="dashboard-headline">Stay with the work.</h1>

      {/* Central Focus Ring */}
      <div className="focus-ring-container">
        <div className={`focus-ring-circle ${isTimerRunning ? 'glowing' : ''}`}>
          <div className="timer-digits">{formatTime(elapsed)}</div>
          <div className="earned-pill-badge">
            <div className="earned-pill-dot"></div>
            <span className="earned-pill-text">{isTimerRunning ? 'FOCUSING' : 'PAUSED'}</span>
          </div>
        </div>
      </div>

      {/* Stop / Resume Session Control Button */}
      <button 
        className="stop-session-btn"
        onClick={handleToggleTimer}
      >
        {isTimerRunning ? 'Stop session' : 'Start session'}
      </button>

      {/* 60-minute daily goal Card */}
      <div className="focus-goal-box">
        <div className="goal-title-row">
          <TargetIcon color="#4b7f6b" size={20} />
          <h2>60-minute daily goal</h2>
        </div>
        <p className="goal-status-line">42 minutes logged · 18 minutes remaining</p>
        <div className="goal-track-bar">
          <div className="goal-fill-bar" style={{ width: '70%' }}></div>
        </div>
        <div className="goal-details-row">
          <span className="goal-detail-muted">Rate · 60:{state.conversionRate?.winMinutes || 10}</span>
          <span className="goal-detail-green">+7 min earned today</span>
        </div>
      </div>

      {/* Today’s sessions */}
      <div className="sessions-history-box">
        <h2>Today’s sessions</h2>
        <div className="sessions-list">
          <div className="session-item-card">
            <div className="session-item-left">
              <span className="session-item-title">Deep work</span>
              <span className="session-item-sub">9:02 AM · 60 min</span>
            </div>
            <span className="session-item-earned">+10 min</span>
          </div>

          <div className="session-item-card">
            <div className="session-item-left">
              <span className="session-item-title">Reading</span>
              <span className="session-item-sub">10:40 AM · 35 min</span>
            </div>
            <span className="session-item-earned">+6 min</span>
          </div>

          <div className="session-item-card active-session">
            <div className="session-item-left">
              <span className="session-item-title">Current session</span>
              <span className="session-item-sub">11:52 AM · {formatTime(elapsed)} elapsed</span>
            </div>
            <span className="session-item-earned">+4 min</span>
          </div>
        </div>
      </div>

      {/* Stop now to bank +4 minutes Card */}
      <div className="projected-card">
        <EarnStepIcon color="#ffffff" size={22} />
        <div className="projected-copy">
          <h2>Stop now to bank +4 minutes</h2>
          <p>Keep going and the estimate updates without interrupting your session.</p>
        </div>
      </div>

      {/* Stay with the work Checklist */}
      <div className="routine-box">
        <h2>Stay with the work</h2>
        <div className="routine-list">
          <div className="routine-item">
            <CheckCircleIcon color="#4b7f6b" size={18} />
            <p>Keep one clear task in view.</p>
          </div>
          <div className="routine-item">
            <CheckCircleIcon color="#4b7f6b" size={18} />
            <p>Pause the timer if the work changes.</p>
          </div>
          <div className="routine-item">
            <CheckCircleIcon color="#4b7f6b" size={18} />
            <p>End when the session is honestly complete.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
