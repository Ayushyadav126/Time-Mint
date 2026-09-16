import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NavDrawer } from './components/NavDrawer';
import { BottomNav } from './components/BottomNav';
import { DashboardPage } from './pages/Dashboard';
import { TimerPage } from './pages/TimerPage';
import { WalletPage } from './pages/WalletPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { BlockerPage } from './pages/BlockerPage';
import { UnlockPage } from './pages/UnlockPage';
import { RequestsPage } from './pages/RequestsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAppState } from './state/AppStateContext';

export function App() {
  const { state } = useAppState();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [routeParam, setRouteParam] = useState(null);

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  const closeDrawer = () => setIsDrawerOpen(false);

  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
      const [route, param] = rawHash.split('/');
      setCurrentRoute(route || 'dashboard');
      setRouteParam(param || null);
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (routeId) => {
    window.location.hash = routeId;
    const clean = routeId.replace(/^#\/?/, '');
    const [route, param] = clean.split('/');
    setCurrentRoute(route || 'dashboard');
    setRouteParam(param || null);
    closeDrawer();
  };

  const formatHeaderBalance = (totalSec) => {
    const sec = Math.max(0, Math.floor(totalSec || 0));
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `${hours}H:${mins < 10 ? '0' : ''}${mins}M`;
  };

  return (
    <div className="app-viewport">
      {/* Top Header Fixed Bar with WIN Balance Pill */}
      <Header 
        isDrawerOpen={isDrawerOpen} 
        toggleDrawer={toggleDrawer}
        winBalance={formatHeaderBalance(state?.balanceSeconds || 0)} 
        navigateTo={navigateTo}
      />

      {/* Slide-out Navigation Drawer Menu */}
      <NavDrawer 
        isOpen={isDrawerOpen} 
        closeDrawer={closeDrawer} 
        activeRoute={currentRoute} 
        navigateTo={navigateTo}
      />

      {/* Main Page Routing */}
      <main>
        {(currentRoute === 'dashboard' || currentRoute === 'home' || currentRoute === '') && <DashboardPage navigateTo={navigateTo} />}
        {currentRoute === 'timer' && <TimerPage navigateTo={navigateTo} />}
        {(currentRoute === 'winning-time' || currentRoute === 'wallet') && <WalletPage navigateTo={navigateTo} />}
        {(currentRoute === 'blocker' || currentRoute === 'app-blocker') && <BlockerPage navigateTo={navigateTo} />}
        {currentRoute === 'unlock' && <UnlockPage appId={routeParam} navigateTo={navigateTo} />}
        {currentRoute === 'analysis' && <AnalysisPage navigateTo={navigateTo} />}
        {(currentRoute === 'requests' || currentRoute === 'feature-requests') && <RequestsPage navigateTo={navigateTo} />}
        {currentRoute === 'settings' && <SettingsPage navigateTo={navigateTo} />}
      </main>

      {/* Bottom Navigation Tab Bar (4 Tabs from Framer: Dashboard, Analysis, Blocker, Requests) */}
      <BottomNav 
        activeTab={currentRoute} 
        setActiveTab={navigateTo} 
      />
    </div>
  );
}

export default App;
