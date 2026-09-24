import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { logout } from '../../utils/auth';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, queueRes] = await Promise.all([
          axios.get('/api/admin/stats').catch(() => ({ data: null })),
          axios.get('/api/admin/review-queue').catch(() => ({ data: null })),
        ]);

        if (statsRes?.data) {
          setStats(statsRes.data.stats || statsRes.data);
        }
        if (queueRes?.data) {
          setReviewQueue(queueRes.data.matches || queueRes.data.reviewQueue || []);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-200/70 bg-[#FAF9F6] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#1F7A4D] flex items-center justify-center text-white font-bold text-sm">
              S
            </span>
            <span className="font-semibold text-lg tracking-tight text-[#1F2937]">
              Surplus to Shelter
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-800">
              Admin Console
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-stone-600 hover:text-[#1F2937] transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">
            System Administration
          </h1>
          <p className="text-sm text-stone-600 mt-0.5">
            Platform performance metrics, review queue monitoring, and community activity.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              Total Donations
            </div>
            <div className="text-3xl font-bold text-[#1F2937]">
              {stats?.totalDonations ?? (loading ? '...' : 0)}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              Total Matches
            </div>
            <div className="text-3xl font-bold text-[#1F2937]">
              {stats?.totalMatches ?? (loading ? '...' : 0)}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              Completed Deliveries
            </div>
            <div className="text-3xl font-bold text-[#1F7A4D]">
              {stats?.completedDeliveries ?? (loading ? '...' : 0)}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              Food Diverted
            </div>
            <div className="text-3xl font-bold text-[#1F2937]">
              {stats?.totalQuantityDiverted ?? (loading ? '...' : 0)} <span className="text-sm font-normal text-stone-500">units</span>
            </div>
          </div>
        </div>

        {/* Review Queue */}
        <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-[#1F2937]">Manual Review Queue</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Matches requiring administrative rescuer assignment
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              {reviewQueue.length} pending
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-stone-500">
              Loading review queue...
            </div>
          ) : reviewQueue.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-500">
              No matches currently require manual review. All algorithms running smoothly.
            </div>
          ) : (
            <div className="space-y-4">
              {reviewQueue.map((item) => (
                <div
                  key={item._id}
                  className="p-4 rounded-xl border border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-semibold text-sm text-[#1F2937]">
                      Donation #{item.donation?._id?.slice(-6) || item._id.slice(-6)}
                    </span>
                    <p className="text-xs text-stone-500 mt-1">
                      Type: {item.donation?.foodType} • Quantity: {item.donation?.quantity} units
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                    Admin Review Needed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
