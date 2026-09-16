import React, { useState, useEffect } from 'react';
import { ChevronRightIcon, GlobeIcon, SettingsIcon, FeatureRequestsIcon } from '../components/Icons';
import { useAppState } from '../state/AppStateContext';
import { 
  getRateEditStatus, 
  formatRateLiveCountdown, 
  formatLockedUntil, 
  RATE_LOCK_PERIOD_MS 
} from '../state/rateEditStatus';

export const SettingsPage = ({ navigateTo }) => {
  const { state, dispatch } = useAppState();
  const [theme, setTheme] = useState('mobile');
  const [language, setLanguage] = useState('English');
  const [showLangModal, setShowLangModal] = useState(false);

  const [, setTick] = useState(0);

  // Live timer tick for real-time countdown updates
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const winMinutes = state?.conversionRate?.winMinutes ?? 10;
  const rateChangedAt = state?.rateChangedAt ?? null;
  const editStatus = getRateEditStatus(rateChangedAt);
  const isLocked = editStatus === 'locked';

  const handleRateChange = (e) => {
    if (isLocked) return;
    dispatch({
      type: 'UPDATE_CONVERSION_RATE',
      winMinutes: Number(e.target.value),
    });
  };

  const languagesList = [
    'English',
    'Español (Spanish)',
    'Deutsch (German)',
    'Français (French)',
    'हिन्दी (Hindi)',
    '日本語 (Japanese)'
  ];

  return (
    <div className="dashboard-content">
      {/* Hero Headline */}
      <h1 className="dashboard-headline">Make the rules yours.</h1>

      {/* Theme Selection Section */}
      <div className="settings-card-container">
        <h2>Theme</h2>
        <div className="theme-selection-grid">
          <button 
            className={`theme-pill-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button 
            className={`theme-pill-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
          <button 
            className={`theme-pill-btn ${theme === 'mobile' ? 'active' : ''}`}
            onClick={() => setTheme('mobile')}
          >
            Mobile
          </button>
        </div>
      </div>

      {/* Language Selector Card */}
      <div 
        className="settings-card-container link-card"
        onClick={() => setShowLangModal(true)}
        style={{ cursor: 'pointer' }}
      >
        <div className="settings-card-row-header">
          <div className="settings-icon-title">
            <GlobeIcon color="#4b7f6b" size={20} />
            <h2>Language</h2>
          </div>
          <div className="settings-right-pill">
            <span>{language}</span>
            <ChevronRightIcon color="#8b93a1" size={16} />
          </div>
        </div>
      </div>

      {/* Winning Time Conversion Section with Interactive Slider */}
      <div className="settings-card-container">
        <div className="settings-card-row-header">
          <div className="settings-icon-title">
            <SettingsIcon color="#1c1f1e" size={18} />
            <h2>Winning Time conversion</h2>
          </div>
          <span className="rate-badge">60:{winMinutes}</span>
        </div>

        <div className="conversion-slider-wrapper">
          <div className="slider-label-row">
            <span>Minimum: 5 min</span>
            <strong className="green-text">{winMinutes} min winning</strong>
            <span>Maximum: 30 min</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="30" 
            step="1"
            value={winMinutes} 
            disabled={isLocked}
            onChange={handleRateChange}
            className="framer-conversion-slider"
            style={isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          />
        </div>

        <div className="conversion-detail-box">
          <div className="conversion-ratio-text">60 min focus = {winMinutes} min winning</div>
          <div className={`conversion-sub-lock ${isLocked ? 'gold-sub' : ''}`}>
            {isLocked
              ? `Locked until ${formatLockedUntil(rateChangedAt + RATE_LOCK_PERIOD_MS)}`
              : rateChangedAt === null
              ? 'Adjustable · then locked for 7 days'
              : `Adjustable for ${formatRateLiveCountdown(rateChangedAt)} · then locked for 7 days`}
          </div>
        </div>
      </div>

      {/* Feature Requests Link Card (Green accent pill) */}
      <a 
        href="#requests" 
        className="settings-card-container link-card highlight-card"
        onClick={(e) => {
          if (navigateTo) {
            e.preventDefault();
            navigateTo('requests');
          }
        }}
      >
        <div className="settings-icon-title">
          <FeatureRequestsIcon color="#4b7f6b" size={20} />
          <h2>Feature Requests</h2>
        </div>
        <div className="feature-req-arrow-pill">
          <span>View board</span>
          <ChevronRightIcon color="#4b7f6b" size={16} />
        </div>
      </a>

      {/* Language Selection Modal */}
      {showLangModal && (
        <div className="modal-backdrop" onClick={() => setShowLangModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Choose Language</h2>
            <div className="language-list-group">
              {languagesList.map((lang, idx) => (
                <button
                  key={idx}
                  className={`language-option-btn ${language === lang ? 'selected' : ''}`}
                  onClick={() => {
                    setLanguage(lang);
                    setShowLangModal(false);
                  }}
                >
                  <span>{lang}</span>
                  {language === lang && <span className="lang-check">✓</span>}
                </button>
              ))}
            </div>
            <button 
              className="modal-cancel-btn"
              onClick={() => setShowLangModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
