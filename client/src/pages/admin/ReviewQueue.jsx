import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { ListSkeleton } from '../../components/Skeleton';

const ReviewQueue = ({ onQueueUpdated }) => {
  const [queue, setQueue] = useState([]);
  const [selectedRescuers, setSelectedRescuers] = useState({}); // matchId -> rescuerId
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [dispatchLoadingId, setDispatchLoadingId] = useState(null);
  const [dispatchManifest, setDispatchManifest] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/review-queue');
      const matches = res.data?.matches || res.data?.reviewQueue || res.data?.data || [];
      setQueue(matches);

      const initialSelections = {};
      matches.forEach((m) => {
        if (m.rankedCandidates && m.rankedCandidates.length > 0) {
          const firstCandidate = m.rankedCandidates[0]?.rescuer?._id || m.rankedCandidates[0]?.rescuer;
          if (firstCandidate) {
            initialSelections[m._id] = firstCandidate;
          }
        }
        if (!initialSelections[m._id] && m.rescuer) {
          initialSelections[m._id] = m.rescuer._id || m.rescuer;
        }
      });
      setSelectedRescuers(initialSelections);

      if (onQueueUpdated) onQueueUpdated();
    } catch (err) {
      console.error('Error fetching review queue:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load review queue.';
      setMessage({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [onQueueUpdated]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSelectRescuer = (matchId, rescuerId) => {
    setSelectedRescuers((prev) => ({
      ...prev,
      [matchId]: rescuerId,
    }));
  };

  const handleApprove = async (matchId) => {
    const rescuerId = selectedRescuers[matchId];
    if (!rescuerId) {
      const err = 'Please select a rescuer candidate before approving.';
      setMessage({
        type: 'error',
        text: err,
      });
      toast.error(err);
      return;
    }

    setActionLoadingId(matchId);
    setMessage({ type: '', text: '' });

    try {
      await api.patch(`/api/admin/review-queue/${matchId}/approve`, {
        rescuerId,
      });

      const successMsg = 'Match approved! Rescuer assigned and dispatch request sent.';
      setMessage({
        type: 'success',
        text: successMsg,
      });
      toast.success(successMsg);

      setQueue((prev) => prev.filter((m) => m._id !== matchId));
      if (onQueueUpdated) onQueueUpdated();
    } catch (err) {
      console.error('Error approving match in review queue:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to approve match.';
      setMessage({
        type: 'error',
        text: msg,
      });
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDispatchLogistics = async (matchId) => {
    setDispatchLoadingId(matchId);
    try {
      const res = await api.post('/api/admin/dispatch-logistics', { matchId });
      if (res.data?.dispatchManifest) {
        setDispatchManifest(res.data.dispatchManifest);
        toast.success(`Logistics agency notified! Tracking #${res.data.dispatchManifest.trackingNumber}`);
      }
    } catch (err) {
      console.error('Error dispatching logistics:', err);
      toast.error('Failed to notify logistics partner.');
    } finally {
      setDispatchLoadingId(null);
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
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#1F2937]">Manual Review & AI Dispatch Queue</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {queue.length} pending review
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Evaluate ML candidate fits, verify route paths & food safety windows, and dispatch parcel transport.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
        >
          <span>🔄</span>
          <span>{loading ? 'Refreshing...' : 'Refresh Queue'}</span>
        </button>
      </div>

      {/* Alerts */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs ${
            message.type === 'success'
              ? 'bg-[#E8F5EE] border border-[#1F7A4D]/30 text-[#1F7A4D]'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Review Queue Items */}
      {loading ? (
        <ListSkeleton items={2} />
      ) : queue.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center mx-auto mb-4 font-bold text-2xl shadow-xs">
            ✓
          </div>
          <h3 className="text-base font-bold text-[#1F2937] mb-1">
            Manual Review Queue Is Clear
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            All AI match dispatches have met automated confidence thresholds. No manual intervention is needed at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {queue.map((item) => {
            const donation = item.donation || {};
            const donor = donation.donor || {};
            const candidates = item.rankedCandidates && item.rankedCandidates.length > 0
              ? item.rankedCandidates
              : (item.rescuer ? [{ rescuer: item.rescuer, score: item.matchScore }] : []);

            const isProcessing = actionLoadingId === item._id;
            const isDispatching = dispatchLoadingId === item._id;
            const currentSelectedRescuer = selectedRescuers[item._id];

            // Find selected candidate object for route display
            const selectedCandidateObj = candidates.find(
              (c) => (c.rescuer?._id || c.rescuer) === currentSelectedRescuer
            )?.rescuer || item.rescuer || {};

            return (
              <div
                key={item._id}
                className="rounded-2xl border border-stone-200/80 bg-white shadow-xs overflow-hidden"
              >
                {/* Donation Header Bar */}
                <div className="bg-[#FAF9F6] border-b border-stone-200/70 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-[#1F2937] capitalize">
                        {donation.foodType?.replace(/_/g, ' ') || 'Food Batch'}
                      </span>
                      <span className="text-xs font-bold text-[#1F7A4D] bg-[#E8F5EE] px-2.5 py-0.5 rounded-full border border-[#1F7A4D]/20">
                        📦 {donation.quantity} units / meals
                      </span>
                      {item.status === 'confirmed' ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1">
                          <span>✓</span> Shelter Confirmed — Ready for Courier
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          {item.confidence === 'low' ? 'Review AI Match' : 'Match Approval Required'}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                      <span>Donor: <strong className="text-stone-700">{donor.name || 'Donor'}</strong> {donor.phone ? `(${donor.phone})` : ''}</span>
                      <span>Pickup: <strong className="text-stone-700">{donation.location?.address || 'Address provided'}</strong></span>
                      <span>Safety Window: <strong className="text-red-600 font-semibold">⏰ {formatDate(donation.expiryAt)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleDispatchLogistics(item._id)}
                      disabled={isDispatching}
                      className={`py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                        item.status === 'confirmed'
                          ? 'bg-[#1F7A4D] hover:bg-[#18643e] text-white'
                          : 'border border-stone-300 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <span>🚚</span>
                      <span>{isDispatching ? 'Notifying Agency...' : 'Dispatch Parcel Courier Manifest'}</span>
                    </button>

                    {item.status === 'pending_confirmation' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(item._id)}
                        disabled={isProcessing || !currentSelectedRescuer}
                        className="py-2.5 px-5 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {isProcessing ? (
                          <span>Sending Request...</span>
                        ) : (
                          <>
                            <span>✓</span>
                            <span>Approve & Send Request to Shelter</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Route & Safety Window Path Map */}
                <div className="bg-stone-50/70 border-b border-stone-200/70 p-4 sm:p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-2">
                    Visual Route & Safety Window Tracker
                  </span>

                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200">
                    {/* Origin */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        A
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase block">Pickup (Donor)</span>
                        <strong className="text-xs text-[#1F2937] block leading-tight">
                          {donation.location?.address || 'Donor Station'}
                        </strong>
                      </div>
                    </div>

                    {/* Path Connection */}
                    <div className="flex flex-col items-center justify-center px-4 py-1 text-center text-xs">
                      <div className="flex items-center gap-1 text-[#1F7A4D] font-bold text-xs">
                        <span>─── 🚚 ~18 min (~6.4 km) ───▶</span>
                      </div>
                      <span className="text-[10px] text-stone-400 mt-0.5">
                        Food Safety Margin: Verified In-Window
                      </span>
                    </div>

                    {/* Destination */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        B
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase block">Dropoff (Rescuer / Shelter)</span>
                        <strong className="text-xs text-[#1F2937] block leading-tight">
                          {selectedCandidateObj.location?.address || 'Shelter Intake Facility'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ranked Rescuer Candidates List */}
                <div className="p-4 sm:p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Ranked AI Candidates ({candidates.length} available)
                    </span>
                    <span className="text-[11px] sm:text-xs text-stone-400">
                      Select candidate to assign transport responsibility
                    </span>
                  </div>

                  {candidates.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200/60">
                      No candidate rescuers detected within standard criteria.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {candidates.map((cand, idx) => {
                        const rescuer = cand.rescuer || {};
                        const rescuerId = rescuer._id || rescuer;
                        const isSelected = currentSelectedRescuer === rescuerId;

                        return (
                          <label
                            key={rescuerId || idx}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#1F7A4D] bg-[#E8F5EE]/40 ring-1 ring-[#1F7A4D] shadow-xs'
                                : 'border-stone-200 hover:border-stone-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <input
                                type="radio"
                                name={`rescuer-select-${item._id}`}
                                value={rescuerId}
                                checked={isSelected}
                                onChange={() => handleSelectRescuer(item._id, rescuerId)}
                                className="w-4 h-4 mt-1 sm:mt-0 text-[#1F7A4D] border-stone-300 focus:ring-[#1F7A4D]"
                              />

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                                    #{idx + 1}
                                  </span>
                                  <strong className="text-xs sm:text-sm text-[#1F2937]">
                                    {rescuer.name || 'Volunteer Driver'}
                                  </strong>
                                  {rescuer.phone && (
                                    <span className="text-xs text-stone-500">
                                      • {rescuer.phone}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
                                  <span>
                                    Capacity: <strong className="text-stone-700">{rescuer.availableCapacity || 'N/A'} meals</strong>
                                  </span>
                                  {rescuer.location?.address && (
                                    <span>
                                      Base: {rescuer.location.address}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Candidate Score Badge */}
                            <div className="mt-2.5 sm:mt-0 flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0">
                              <div className="text-left sm:text-right">
                                <span className="text-[10px] sm:text-[11px] text-stone-400 block">
                                  AI Match Fit
                                </span>
                                <span className="text-xs sm:text-sm font-mono font-bold text-[#1F7A4D]">
                                  {typeof cand.score === 'number' ? cand.score.toFixed(1) : (item.matchScore || 'N/A')} pts
                                </span>
                              </div>

                              <span
                                className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                                  isSelected
                                    ? 'bg-[#1F7A4D] text-white'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logistics Dispatch Manifest Modal */}
      {dispatchManifest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setDispatchManifest(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-2 text-sm font-bold"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center mx-auto mb-2 text-2xl">
                🚚
              </div>
              <h3 className="text-lg font-bold text-[#1F2937]">
                Logistics Partner Dispatch Manifest
              </h3>
              <p className="text-xs text-stone-500">
                Tracking Order: <span className="font-mono font-bold text-stone-800">{dispatchManifest.trackingNumber}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-3">
              <div>
                <span className="text-stone-400 uppercase font-bold text-[10px] block">Dispatched Email To:</span>
                <strong className="text-stone-800">{dispatchManifest.partnerEmail}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-200/70">
                <div>
                  <span className="text-stone-400 font-bold text-[10px] block">Sender (Donor):</span>
                  <span className="font-medium text-stone-800 block">{dispatchManifest.sender.name}</span>
                  <span className="text-stone-500 text-[11px] block">{dispatchManifest.sender.pickupAddress}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold text-[10px] block">Receiver (Shelter):</span>
                  <span className="font-medium text-stone-800 block">{dispatchManifest.receiver.name}</span>
                  <span className="text-stone-500 text-[11px] block">{dispatchManifest.receiver.deliveryAddress}</span>
                </div>
              </div>

              <div className="pt-1 border-t border-stone-200/70">
                <span className="text-stone-400 font-bold text-[10px] block">Safety Window:</span>
                <span className="text-red-600 font-medium">Pickup & delivery required before {formatDate(dispatchManifest.foodDetails.safetyWindowDeadline)}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setDispatchManifest(null)}
                className="px-5 py-2 rounded-xl bg-[#1F7A4D] text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewQueue;
