import React from 'react';
import { DashboardIcon, AnalysisIcon, AppBlockerIcon, FeatureRequestsIcon } from './Icons';

export const BottomNav = ({ activeTab = 'dashboard', setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'analysis', label: 'Analysis', icon: AnalysisIcon },
    { id: 'blocker', label: 'Blocker', icon: AppBlockerIcon },
    { id: 'requests', label: 'Requests', icon: FeatureRequestsIcon },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id || (activeTab === 'home' && tab.id === 'dashboard');
        const color = isActive ? "#4b7f6b" : "#8b93a1";
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              if (setActiveTab) setActiveTab(tab.id);
            }}
          >
            <IconComponent color={color} size={20} />
            <span className="nav-tab-label">{tab.label}</span>
          </a>
        );
      })}
    </nav>
  );
};
