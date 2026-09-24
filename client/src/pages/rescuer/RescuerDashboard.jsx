import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout } from '../../utils/auth';
import api from '../../services/api';
import ApplyForFood from './ApplyForFood';
import IncomingMatches from './IncomingMatches';
import ActivePickup from './ActivePickup';
import ProfileSettings from './ProfileSettings';

const TABS = [
  { id: 'apply', label: 'Apply for Food', icon: '🥣' },
  { id: 'matches', label: 'Incoming Matches', icon: '📬' },
  { id: 'pickup', label: 'Active Pickup', icon: '🚚' },
  { id: 'profile', label: 'Profile & Capacity', icon: '⚙️' },
];

const RescuerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser() || {};

  // Determine active tab from URL or default to 'apply'
  const getTabFromPath = useCallback(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/profile') || path.includes('/capacity')) return 'profile';
    if (path.includes('/pickup') || path.includes('/active')) return 'pickup';
    if (path.includes('/matches') || path.includes('/incoming')) return 'matches';
    return 'apply';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [stats, setStats] = useState({
    pendingCount: 0,
    activeCount: 0,
    completedCount: user.completedPickups || 0,
  });

  // Sync activeTab when URL changes
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [getTabFromPath]);

  // Fetch rescuer matches summary for sidebar badges
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/api/rescuer/matches');
      const matches = res.data?.matches || [];
      const pending = matches.filter((m) => m.status === 'pending_confirmation').length;
      const active = matches.filter((m) => ['confirmed', 'picked_up'].includes(m.status)).length;
      const completed = matches.filter((m) => m.status === 'delivered').length;

      setStats({
        pendingCount: pending,
        activeCount: active,
        completedCount: completed || user.completedPickups || 0,
      });
    } catch (err) {
      console.error('Error fetching rescuer summary stats:', err);
    }
  }, [user.completedPickups]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/rescuer/${tabId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMatchConfirmed = () => {
    fetchSummary();
    // Smoothly redirect to active pickup view so the rescuer can view their pickup OTP immediately
    setActiveTab('pickup');
    navigate('/rescuer/pickup');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] font-sans flex flex-col">
      {/* Top Bar with Branding, Capacity & Logout */}
      <header className="border-b border-stone-200/70 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#1F7A4D] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              S
            </span>
            <span className="font-semibold text-lg tracking-tight text-[#1F2937]">
              Surplus to Shelter
            </span>
          </Link>

          {/* User Info & Quick Stats */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="block text-sm font-semibold text-[#1F2937] leading-tight">
                  {user.name || 'Shelter Coordinator'}
                </span>
                <span className="text-[11px] text-stone-500">
                  {user.availableCapacity ? `Shelter Cap: ${user.availableCapacity} meals` : 'Shelter & Food Rescuer Portal'}
                </span>
              </div>

              {/* Delivered Deliveries Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EE] border border-[#1F7A4D]/20 text-[#1F7A4D] text-xs font-bold shadow-xs">
                <span>🏢</span>
                <span>{stats.completedCount} Deliveries Received</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs font-medium text-stone-500 hover:text-[#1F2937] px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body: Sidebar + Active Panel */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-3 md:p-4 sticky top-24">
            <div className="hidden md:block px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              Shelter Menu
            </div>

            <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                let badgeCount = 0;
                if (tab.id === 'matches') badgeCount = stats.pendingCount;
                if (tab.id === 'pickup') badgeCount = stats.activeCount;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-left w-full ${
                      isActive
                        ? 'bg-[#1F7A4D] text-white shadow-xs'
                        : 'text-stone-600 hover:text-[#1F2937] hover:bg-stone-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </div>

                    {badgeCount > 0 && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 ${
                          isActive
                            ? 'bg-white text-[#1F7A4D]'
                            : 'bg-[#E8F5EE] text-[#1F7A4D] border border-[#1F7A4D]/20'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick Rescuer Guidelines Box in Sidebar */}
            <div className="hidden md:block mt-6 pt-4 border-t border-stone-100 px-3">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">
                Shelter Intake Flow
              </span>
              <p className="text-xs text-stone-500 leading-relaxed">
                1. <strong>Apply for Food</strong> with quantity range.<br />
                2. Request is mapped on Admin dashboard.<br />
                3. Accept matches & verify with <strong>OTP</strong>.
              </p>
            </div>
          </div>
        </aside>

        {/* Dynamic Main Panel */}
        <main className="flex-1 min-w-0">
          {activeTab === 'apply' && (
            <ApplyForFood onRequestSubmitted={fetchSummary} />
          )}

          {activeTab === 'matches' && (
            <IncomingMatches
              onMatchConfirmed={handleMatchConfirmed}
              onMatchesUpdated={fetchSummary}
            />
          )}

          {activeTab === 'pickup' && (
            <ActivePickup onStatusUpdated={fetchSummary} />
          )}

          {activeTab === 'profile' && (
            <ProfileSettings onProfileUpdated={fetchSummary} />
          )}
        </main>
      </div>
    </div>
  );
};

export default RescuerDashboard;
