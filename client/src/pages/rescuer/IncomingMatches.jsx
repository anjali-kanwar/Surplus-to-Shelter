import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const IncomingMatches = ({ onMatchConfirmed }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/rescuer/matches');
      const allMatches = response.data?.matches || [];
      // Only keep matches waiting for rescuer confirmation
      const pending = allMatches.filter((m) => m.status === 'pending_confirmation');
      setMatches(pending);
    } catch (err) {
      console.error('Error fetching incoming matches:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to fetch matches.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleRespond = async (matchId, action) => {
    setActionLoadingId(matchId);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.patch(`/api/rescuer/matches/${matchId}/respond`, {
        action, // 'confirm' or 'reject'
      });

      if (action === 'confirm') {
        setMessage({
          type: 'success',
          text: 'Match confirmed! OTPs have been generated. Go to Active Pickup to coordinate handoff.',
        });

        // Remove from pending list
        setMatches((prev) => prev.filter((m) => m._id !== matchId));

        if (onMatchConfirmed) {
          onMatchConfirmed(response.data?.match);
        }
      } else {
        setMessage({
          type: 'info',
          text: 'Match declined. The donation has been reassigned to another available volunteer.',
        });
        setMatches((prev) => prev.filter((m) => m._id !== matchId));
      }
    } catch (err) {
      console.error('Error responding to match:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || `Failed to ${action} match.`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
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
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1F2937]">Incoming Match Assignments</h2>
          <p className="text-sm text-stone-600 mt-0.5">
            Review surplus food opportunities matched to your vehicle capacity and area.
          </p>
        </div>

        <button
          onClick={fetchMatches}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors self-start sm:self-auto"
        >
          {loading ? 'Refreshing...' : 'Refresh Matches'}
        </button>
      </div>

      {/* Alerts */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-[#E8F5EE] border border-[#1F7A4D]/30 text-[#1F7A4D]'
              : message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-stone-100 border border-stone-200 text-stone-700'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-stone-400 hover:text-stone-600 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-stone-500">
          Checking for incoming matches...
        </div>
      ) : matches.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center mx-auto mb-3 font-bold text-lg">
            ✓
          </div>
          <p className="text-base font-bold text-[#1F2937] mb-1">
            No pending matches
          </p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You have no pending rescue requests right now. New matches will appear automatically when nearby donors post surplus food.
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
                className="p-6 rounded-xl border border-stone-200/80 hover:border-stone-300 transition-colors bg-white flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-base text-[#1F2937] capitalize">
                      {donation.foodType?.replace('_', ' ') || 'Food batch'}
                    </span>
                    <span className="text-xs font-bold text-[#1F7A4D] bg-[#E8F5EE] px-2.5 py-0.5 rounded-full">
                      {donation.quantity} units / meals
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                      Action Required
                    </span>
                  </div>

                  {donation.description && (
                    <p className="text-sm text-stone-600 line-clamp-2">
                      {donation.description}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-stone-500 pt-1">
                    <div>
                      <strong className="text-stone-700">Donor:</strong> {donor.name || 'Anonymous donor'}
                      {donor.phone && ` (${donor.phone})`}
                    </div>
                    <div>
                      <strong className="text-stone-700">Pickup Location:</strong>{' '}
                      {donation.location?.address || 'Provided upon confirmation'}
                    </div>
                    <div>
                      <strong className="text-stone-700">Must Pick Up By:</strong>{' '}
                      <span className="text-red-600 font-medium">
                        {formatDate(donation.expiryAt)}
                      </span>
                    </div>
                    <div>
                      <strong className="text-stone-700">Match Confidence:</strong>{' '}
                      <span className="capitalize">{match.confidence || 'standard'}</span>
                      {match.matchScore ? ` (${match.matchScore} pts)` : ''}
                    </div>
                  </div>
                </div>

                {/* Confirm & Reject Buttons */}
                <div className="flex flex-row md:flex-col items-center gap-2.5 flex-shrink-0">
                  <button
                    onClick={() => handleRespond(match._id, 'confirm')}
                    disabled={isProcessing}
                    className="flex-1 md:flex-none w-full md:w-36 py-2.5 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Rescue'}
                  </button>

                  <button
                    onClick={() => handleRespond(match._id, 'reject')}
                    disabled={isProcessing}
                    className="flex-1 md:flex-none w-full md:w-36 py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Decline
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
