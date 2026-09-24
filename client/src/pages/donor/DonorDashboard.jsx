import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getUser, logout } from '../../utils/auth';
import api from '../../services/api';
import PostDonation from './PostDonation';
import DonationHistory from './DonationHistory';
import ImpactSummary from './ImpactSummary';

const TABS = [
  { id: 'post', label: 'Post Donation', icon: '🍲' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'impact', label: 'Impact', icon: '📊' },
];

const DonorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser() || {};

  // Determine active tab from URL path or default to 'post'
  const getTabFromPath = useCallback(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/history')) return 'history';
    if (path.includes('/impact')) return 'impact';
    return 'post';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [creditPoints, setCreditPoints] = useState(user?.creditPoints || 0);

  // Sync activeTab when URL changes
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [getTabFromPath]);

  // Fetch updated user points or calculate from donations
  const fetchUserStats = useCallback(async () => {
    try {
      const res = await api.get('/api/donations/my');
      if (res.data?.donations) {
        const deliveredQty = res.data.donations
          .filter((d) => d.status === 'delivered')
          .reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
        setCreditPoints(user?.creditPoints ?? deliveredQty);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  }, [user?.creditPoints]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/donor/${tabId}`);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleDonationPosted = () => {
    fetchUserStats();
    // Switch to history tab upon successful donation posting
    setActiveTab('history');
    navigate('/donor/history');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] font-sans flex flex-col">
      {/* Top Bar with Name & Credit Points */}
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

          {/* User Name & Credit Points on Top Bar */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:block text-sm font-semibold text-[#1F2937]">
                {user.name || 'Food Donor'}
              </span>

              {/* Credit Points Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EE] border border-[#1F7A4D]/20 text-[#1F7A4D] text-xs font-bold shadow-xs">
                <span>⭐</span>
                <span>{creditPoints} pts</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium text-stone-500 hover:text-[#1F2937] px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Tab Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-60 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-3 md:p-4 sticky top-24">
            <div className="hidden md:block px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              Donor Menu
            </div>

            <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-left w-full ${
                      isActive
                        ? 'bg-[#1F7A4D] text-white shadow-xs'
                        : 'text-stone-600 hover:text-[#1F2937] hover:bg-stone-100/70'
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Dynamic Content Panel */}
        <main className="flex-1 min-w-0">
          {activeTab === 'post' && (
            <PostDonation onDonationPosted={handleDonationPosted} />
          )}
          {activeTab === 'history' && <DonationHistory />}
          {activeTab === 'impact' && <ImpactSummary />}
        </main>
      </div>
    </div>
  );
};

export default DonorDashboard;
