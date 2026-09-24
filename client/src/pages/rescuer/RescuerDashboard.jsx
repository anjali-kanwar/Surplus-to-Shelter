import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getUser, logout } from '../../utils/auth';

const RescuerDashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get('/api/rescuer/matches');
        if (res.data?.matches) {
          setMatches(res.data.matches);
        }
      } catch (err) {
        console.error('Error fetching rescuer matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
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
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F5EE] text-[#1F7A4D]">
              Rescuer Portal
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
            Volunteer Dashboard
          </h1>
          <p className="text-sm text-stone-600 mt-0.5">
            View assigned surplus pickups, confirm transport, and verify handoffs.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              Active Pickups
            </div>
            <div className="text-3xl font-bold text-[#1F2937]">
              {matches.filter((m) => ['pending_confirmation', 'confirmed', 'picked_up'].includes(m.status)).length}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              Completed Deliveries
            </div>
            <div className="text-3xl font-bold text-[#1F7A4D]">
              {matches.filter((m) => m.status === 'delivered').length}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
              Vehicle Capacity
            </div>
            <div className="text-3xl font-bold text-[#1F2937]">
              {user?.availableCapacity || 'Available'}
            </div>
          </div>
        </div>

        {/* Assigned Deliveries */}
        <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[#1F2937]">Assigned Matches</h2>
            <span className="text-xs font-medium text-stone-500">
              {matches.length} total
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-stone-500">
              Loading rescue assignments...
            </div>
          ) : matches.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-500">
              No rescue assignments currently pending. You will receive notifications when a donor within your radius posts surplus food.
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div
                  key={match._id}
                  className="p-4 rounded-xl border border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#1F2937]">
                        Match #{match._id.slice(-6)}
                      </span>
                      <span className="text-xs text-stone-500">•</span>
                      <span className="text-xs text-stone-600 capitalize">
                        {match.donation?.foodType?.replace('_', ' ') || 'Food batch'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Quantity: {match.donation?.quantity || 'N/A'} units
                      {match.pickupOtp && ` • Pickup OTP: ${match.pickupOtp}`}
                      {match.deliveryOtp && ` • Delivery OTP: ${match.deliveryOtp}`}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      match.status === 'delivered'
                        ? 'bg-[#E8F5EE] text-[#1F7A4D]'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {match.status}
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

export default RescuerDashboard;
