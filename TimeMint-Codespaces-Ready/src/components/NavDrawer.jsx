import React from 'react';
import { 
  DashboardIcon, 
  TimerIcon, 
  WinningTimeIcon, 
  AnalysisIcon, 
  AppBlockerIcon, 
  FeatureRequestsIcon, 
  SettingsIcon, 
  ChevronRightIcon,
  CloseIcon
} from './Icons';

export const NavDrawer = ({ isOpen, closeDrawer, activeRoute = 'dashboard', navigateTo, winBalance = "0H:15M" }) => {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'timer', label: 'Timer', icon: TimerIcon },
    { id: 'winning-time', label: 'Winning Time', icon: WinningTimeIcon },
    { id: 'analysis', label: 'Analysis', icon: AnalysisIcon },
    { id: 'blocker', label: 'App Blocker', icon: AppBlockerIcon },
    { id: 'requests', label: 'Feature Requests', icon: FeatureRequestsIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={closeDrawer}>
      <nav className={`nav-drawer ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Top Header Bar inside Drawer matching Menu.png */}
        <div className="drawer-top-bar">
          <button className="drawer-close-btn" onClick={closeDrawer} aria-label="Close menu">
            <CloseIcon color="#1c1f1e" size={20} />
          </button>
          <span className="drawer-brand-title">Time Mint</span>
          <div className="drawer-win-pill">
            <span className="pill-dot"></span>
            <span className="pill-win-label">WIN</span>
            <span className="pill-win-val">{winBalance}</span>
          </div>
        </div>

        <div className="drawer-intro">
          <h2>Where to next?</h2>
          <p>Your focus tools, all in one place.</p>
        </div>

        <div className="drawer-links">
          {links.map((link) => {
            const IconComponent = link.icon;
            const isActive = activeRoute === link.id || (activeRoute === 'home' && link.id === 'dashboard');
            return (
              <a 
                key={link.id} 
                href={`#${link.id}`} 
                className={`drawer-link ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  if (navigateTo) {
                    e.preventDefault();
                    navigateTo(link.id);
                  }
                }}
              >
                <div className="drawer-link-left">
                  <IconComponent color={isActive ? "#4b7f6b" : "#1c1f1e"} size={20} />
                  <span className="drawer-link-text">{link.label}</span>
                </div>
                <ChevronRightIcon color="#8b93a1" size={16} />
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
};


