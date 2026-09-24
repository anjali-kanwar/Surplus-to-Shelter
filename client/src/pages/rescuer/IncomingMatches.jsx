import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { ListSkeleton } from '../../components/Skeleton';

const IncomingMatches = ({ onMatchConfirmed, onMatchesUpdated }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/rescuer/matches');
      const allMatches = response.data?.matches || [];
      const pending = allMatches.filter((m) => m.status === 'pending_confirmation');
      setMatches(pending);
      if (onMatchesUpdated) onMatchesUpdated();
    } catch (err) {
      console.error('Error fetching incoming matches:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to fetch incoming matches.';
      setMessage({ type: 'error', text: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [onMatchesUpdated]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleRespond = async (matchId, action) => {
    setActionLoadingId(matchId);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.patch(`/api/rescuer/matches/${matchId}/respond`, {
        action, // 'confirm' or 'reject'
      });

      if (action === 'confirm') {
        const successMsg = 'Match confirmed! OTPs generated. Go to Active Pickup to coordinate transfer.';
        setMessage({
          type: 'success',
          text: successMsg,
        });
        toast.success(successMsg);

        setMatches((prev) => prev.filter((m) => m._id !== matchId));

        if (onMatchConfirmed) {
          onMatchConfirmed(response.data?.match);
        }
      } else {
        const infoMsg = 'Match declined. Donation reassigned to another available volunteer.';
        setMessage({
          type: 'info',
          text: infoMsg,
        });
        toast('Match declined and returned to matching pool.', { icon: 'ℹ️' });
        setMatches((prev) => prev.filter((m) => m._id !== matchId));
        if (onMatchesUpdated) onMatchesUpdated();
      }
    } catch (err) {
      console.error('Error responding to match:', err);
      const msg = err.response?.data?.message || err.message || `Failed to ${action} match.`;
      setMessage({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not specified';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#1F2937]">Incoming Match Assignments</h2>
            {matches.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#1F7A4D]">
                {matches.length} pending
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Review surplus food opportunities matched to your shelter's dietary criteria, intake hours, and capacity.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMatches}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
        >
          <span>🔄</span>
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Alerts */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-[#E8F5EE] border border-[#1F7A4D]/30 text-[#1F7A4D]'
              : message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-stone-100 border border-stone-200 text-stone-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{message.type === 'success' ? '✓' : message.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span>{message.text}</span>
          </div>

          <button
            type="button"
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-stone-400 hover:text-stone-600 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Match List */}
      {loading ? (
        <ListSkeleton items={3} />
      ) : matches.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center mx-auto mb-4 font-bold text-2xl shadow-xs">
            ✓
          </div>
          <h3 className="text-base font-bold text-[#1F2937] mb-1">
            No Pending Matches Right Now
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            You're all caught up! As soon as food donors in your radius post fresh surplus, our automated matching engine will dispatch opportunities directly here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {matches.map((match) => {
            const donation = match.donation || {};
            const donor = donation.donor || {};
            const isProcessing = actionLoadingId === match._id;

            return (
              <div
                key={match._id}
                className="p-5 sm:p-6 rounded-2xl border border-stone-200/80 hover:border-stone-300 transition-all bg-white hover:shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Details */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-[#1F2937] capitalize">
                      {donation.foodType?.replace(/_/g, ' ') || 'Surplus Food'}
                    </span>

                    <span className="text-xs font-bold text-[#1F7A4D] bg-[#E8F5EE] px-2.5 py-0.5 rounded-full border border-[#1F7A4D]/20">
                      📦 {donation.quantity} units / meals
                    </span>

                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                      ⚡ Action Required
                    </span>

                    {match.confidence && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium capitalize">
                        ML Confidence: {match.confidence}
                      </span>
                    )}
                  </div>

                  {donation.description && (
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed bg-[#FAF9F6] p-3 rounded-xl border border-stone-100">
                      "{donation.description}"
                    </p>
                  )}

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs text-stone-600 pt-1">
                    <div>
                      <span className="text-stone-400 font-medium block">Donor</span>
                      <strong className="text-stone-800 text-xs sm:text-sm">
                        {donor.name || 'Community Donor'}
                      </strong>
                      {donor.phone && (
                        <span className="text-stone-500 block">{donor.phone}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-stone-400 font-medium block">Pickup Location</span>
                      <strong className="text-stone-800 text-xs sm:text-sm block">
                        {donation.location?.address || 'Address released upon match confirmation'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-stone-400 font-medium block">Pickup Deadline</span>
                      <span className="font-semibold text-red-600">
                        ⏰ {formatDate(donation.expiryAt)}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 font-medium block">Transport Route</span>
                      <span className="font-semibold text-[#1F7A4D]">
                        ✓ Within vehicle capacity & operational radius
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirm / Reject Buttons */}
                <div className="flex flex-row lg:flex-col items-center gap-2.5 flex-shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                  <button
                    type="button"
                    onClick={() => handleRespond(match._id, 'confirm')}
                    disabled={isProcessing}
                    className="flex-1 lg:flex-none w-full lg:w-40 py-3 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? (
                      <span>Accepting...</span>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>Accept for Shelter</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRespond(match._id, 'reject')}
                    disabled={isProcessing}
                    className="flex-1 lg:flex-none w-full lg:w-40 py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  >
                    Decline Batch
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IncomingMatches;
