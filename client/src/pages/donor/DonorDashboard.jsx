import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout } from '../../utils/auth';
import api from '../../services/api';
import PostDonation from './PostDonation';
import DonationHistory from './DonationHistory';
import ImpactSummary from './ImpactSummary';

const TABS = [
  { id: 'post', label: 'Post Donation', icon: '+' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'impact', label: 'Impact', icon: '📊' },
];

const DonorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  // Determine active tab from URL path or default to 'post'
  const getTabFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/history')) return 'history';
    if (path.includes('/impact')) return 'impact';
    return 'post';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [creditPoints, setCreditPoints] = useState(user?.creditPoints || 0);

  // Sync activeTab when URL changes
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  // Fetch updated user points or calculate from donations
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const res = await api.get('/api/donations/my');
        if (res.data?.donations) {
          // Delivered donations award 1 point per unit
          const deliveredQty = res.data.donations
            .filter((d) => d.status === 'delivered')
            .reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
          setCreditPoints(user?.creditPoints ?? deliveredQty);
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
      }
    };
    fetchUserStats();
  }, [user]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/donor/${tabId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDonationPosted = () => {
    // Switch to history tab upon successful donation posting
    setActiveTab('history');
    navigate('/donor/history');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] font-sans flex flex-col">
      {/* Top Bar with Name & Credit Points */}
      <header className="border-b border-stone-200/70 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#1F7A4D] flex items-center justify-center text-white font-bold text-sm">
              S
            </span>
            <span className="font-semibold text-lg tracking-tight text-[#1F2937]">
              Surplus to Shelter
            </span>
          </Link>

          {/* User Name & Credit Points on Top Bar */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#1F2937]">
                {user?.name || 'Food Donor'}
              </span>

              {/* Credit Points Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EE] border border-[#1F7A4D]/20 text-[#1F7A4D] text-xs font-bold shadow-xs">
                <span>⭐</span>
                <span>{creditPoints} Credit Points</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs font-medium text-stone-500 hover:text-[#1F2937] transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Tab Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-60 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-3 md:p-4 sticky top-24">
            <div className="hidden md:block px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              Donor Menu
            </div>

            <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap text-left ${
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
