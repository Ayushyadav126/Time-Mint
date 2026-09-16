import React from 'react';
import { SettingsIcon } from './Icons';

export const Header = ({ isDrawerOpen, toggleDrawer, winBalance = "0H:15M", navigateTo }) => {
  return (
    <header className="header-nav">
      <div className="header-left">
        <button 
          className={`menu-trigger ${isDrawerOpen ? 'open' : ''}`} 
          onClick={toggleDrawer}
          aria-label="Open navigation menu"
        >
          <div className="menu-glyph">
            <div className="menu-line line-top"></div>
            <div className="menu-line line-mid"></div>
            <div className="menu-line line-bot"></div>
          </div>
        </button>

        <span 
          className="app-brand-title" 
          onClick={() => navigateTo && navigateTo('dashboard')}
          style={{ cursor: 'pointer' }}
        >
          Time Mint
        </span>
      </div>

      <div className="header-actions">
        <a 
          href="#winning-time" 
          className="balance-pill-text" 
          aria-label="Open Winning Time Wallet"
          onClick={(e) => {
            if (navigateTo) {
              e.preventDefault();
              navigateTo('winning-time');
            }
          }}
        >
          <span className="pill-dot"></span>
          <span className="pill-win-label">WIN</span>
          <span className="pill-win-val">{winBalance}</span>
        </a>

        <button 
          className="settings-btn" 
          aria-label="Open Settings"
          onClick={() => navigateTo && navigateTo('settings')}
        >
          <SettingsIcon color="#1c1f1e" size={18} />
        </button>
      </div>
    </header>
  );
};

