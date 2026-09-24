import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getUser, logout } from '../../utils/auth';
import api from '../../services/api';
import AdminMap from './AdminMap';
import ShelterRequests from './ShelterRequests';
import ReviewQueue from './ReviewQueue';
import AllActivity from './AllActivity';
import Analytics from './Analytics';

const TABS = [
  { id: 'map', label: 'Live Impact Map', icon: '🗺️' },
  { id: 'requests', label: 'Shelter Applications', icon: '🥣' },
  { id: 'review', label: 'Review Queue', icon: '📋' },
  { id: 'activity', label: 'All Activity', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser() || {};

  // Determine active tab from URL or default to 'map'
  const getTabFromPath = useCallback(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/requests') || path.includes('/shelter-requests')) return 'requests';
    if (path.includes('/activity')) return 'activity';
    if (path.includes('/analytics') || path.includes('/stats')) return 'analytics';
    if (path.includes('/review')) return 'review';
    return 'map';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [reviewCount, setReviewCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [totalDonations, setTotalDonations] = useState(0);

  // Sync activeTab when URL changes
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [getTabFromPath]);

  // Fetch admin summary badge counts
  const fetchSummary = useCallback(async () => {
    try {
      const [queueRes, statsRes, requestsRes] = await Promise.all([
        api.get('/api/admin/review-queue').catch(() => ({ data: null })),
        api.get('/api/admin/stats').catch(() => ({ data: null })),
        api.get('/api/admin/food-requests').catch(() => ({ data: null })),
      ]);

      if (queueRes?.data?.matches || queueRes?.data?.reviewQueue) {
        const queue = queueRes.data.matches || queueRes.data.reviewQueue || [];
        setReviewCount(queue.length);
      }

      if (requestsRes?.data?.requests) {
        const pendingRequests = requestsRes.data.requests.filter((r) => r.status === 'pending').length;
        setRequestsCount(pendingRequests);
      }

      if (statsRes?.data) {
        const s = statsRes.data.stats || statsRes.data;
        setTotalDonations(s.totalDonations || 0);
      }
    } catch (err) {
      console.error('Error fetching admin summary:', err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/admin/${tabId}`);
  };

  const handleLogout = () => {
    logout();
    toast.success('Admin logged out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] font-sans flex flex-col">
      {/* Top Bar */}
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

          {/* Admin Info & Logout */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block text-right">
                <span className="block text-sm font-semibold text-[#1F2937] leading-tight">
                  {user.name || 'System Admin'}
                </span>
                <span className="text-[11px] text-stone-500">
                  Platform Oversight & Dispatch
                </span>
              </div>

              {/* Requests Badge */}
              {requestsCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs border bg-purple-50 text-purple-800 border-purple-200">
                  <span>🥣</span>
                  <span>{requestsCount} Food Requests</span>
                </div>
              )}

              {/* Review Queue Badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs border ${
                  reviewCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-[#E8F5EE] text-[#1F7A4D] border-[#1F7A4D]/20'
                }`}
              >
                <span>{reviewCount > 0 ? '⚠️' : '✓'}</span>
                <span>{reviewCount} in Queue</span>
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

      {/* Main Body: Sidebar + Active Panel */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-3 md:p-4 sticky top-24">
            <div className="hidden md:block px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
              Admin Console
            </div>

            <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                let badgeCount = 0;
                if (tab.id === 'review') badgeCount = reviewCount;
                if (tab.id === 'requests') badgeCount = requestsCount;

                return (
                  <button
                    key={tab.id}
                    type="button"
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
                            ? 'bg-amber-400 text-stone-900'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick Metrics in Sidebar */}
            <div className="hidden md:block mt-6 pt-4 border-t border-stone-100 px-3">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                Platform Pulse
              </span>
              <div className="space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Donations Logged:</span>
                  <strong className="text-stone-900">{totalDonations}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Shelter Requests:</span>
                  <strong className={requestsCount > 0 ? 'text-purple-700 font-bold' : 'text-stone-700'}>
                    {requestsCount} pending
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Manual Review:</span>
                  <strong className={reviewCount > 0 ? 'text-amber-700' : 'text-[#1F7A4D]'}>
                    {reviewCount} pending
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Main Panel */}
        <main className="flex-1 min-w-0">
          {activeTab === 'map' && (
            <AdminMap onDataUpdated={fetchSummary} />
          )}

          {activeTab === 'requests' && (
            <ShelterRequests onRequestsUpdated={fetchSummary} />
          )}

          {activeTab === 'review' && (
            <ReviewQueue onQueueUpdated={fetchSummary} />
          )}

          {activeTab === 'activity' && (
            <AllActivity onActivityUpdated={fetchSummary} />
          )}

          {activeTab === 'analytics' && (
            <Analytics onStatsUpdated={fetchSummary} />
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
