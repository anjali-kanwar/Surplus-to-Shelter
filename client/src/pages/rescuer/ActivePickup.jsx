import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { ListSkeleton } from '../../components/Skeleton';

const ActivePickup = ({ onStatusUpdated }) => {
  const [activeMatches, setActiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    matchId: null,
    type: null, // 'pickup' | 'delivery'
    expectedOtp: '',
  });

  const [otpInput, setOtpInput] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });

  const fetchActiveMatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/rescuer/matches');
      const allMatches = response.data?.matches || [];
      const active = allMatches.filter((m) =>
        ['confirmed', 'picked_up'].includes(m.status)
      );
      setActiveMatches(active);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Error fetching active matches:', err);
    } finally {
      setLoading(false);
    }
  }, [onStatusUpdated]);

  useEffect(() => {
    fetchActiveMatches();
  }, [fetchActiveMatches]);

  const openVerifyModal = (matchId, type, expectedOtp) => {
    setOtpInput('');
    setModalError('');
    setModalState({
      isOpen: true,
      matchId,
      type,
      expectedOtp: expectedOtp || '',
    });
  };

  const closeVerifyModal = () => {
    setModalState({
      isOpen: false,
      matchId: null,
      type: null,
      expectedOtp: '',
    });
    setOtpInput('');
    setModalError('');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length < 6) {
      setModalError('Please enter the full 6-digit OTP code.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const endpoint =
        modalState.type === 'pickup'
          ? `/api/matches/${modalState.matchId}/verify-pickup`
          : `/api/matches/${modalState.matchId}/verify-delivery`;

      await api.patch(endpoint, {
        otp: otpInput.trim(),
      });

      const successText =
        modalState.type === 'pickup'
          ? 'Pickup verified successfully! Food is recorded as in transit.'
          : 'Delivery successfully verified! Donor credit points awarded and record finalized.';

      setGlobalMessage({
        type: 'success',
        text: successText,
      });
      toast.success(successText);

      closeVerifyModal();
      await fetchActiveMatches();
    } catch (err) {
      console.error('OTP verification error:', err);
      const msg =
        err.response?.data?.message || err.message || 'Invalid OTP. Please check the code and try again.';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#1F2937]">Inbound Deliveries & Shelter Intake</h2>
            {activeMatches.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#1F7A4D]">
                {activeMatches.length} active
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Track incoming parcel couriers carrying surplus meals, monitor safety windows, and verify handoff with your Delivery OTP.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchActiveMatches}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
        >
          <span>🔄</span>
          <span>{loading ? 'Refreshing...' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* Global alert banner */}
      {globalMessage.text && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs ${
            globalMessage.type === 'success'
              ? 'bg-[#E8F5EE] border border-[#1F7A4D]/30 text-[#1F7A4D]'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{globalMessage.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{globalMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalMessage({ type: '', text: '' })}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content List */}
      {loading ? (
        <ListSkeleton items={2} />
      ) : activeMatches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/70 p-12 sm:p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center mx-auto mb-4 font-bold text-2xl shadow-xs">
            🚚
          </div>
          <h3 className="text-base font-bold text-[#1F2937] mb-1">
            No Active Pickups In Progress
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            When you accept an assignment from the <strong>Incoming Matches</strong> tab, it will appear here with large, bold OTP verification codes and a route map to show food donors and shelter intake staff.
          </p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {activeMatches.map((match) => {
            const donation = match.donation || {};
            const donor = donation.donor || {};
            const isPickedUp = match.status === 'picked_up';

            const mapUrl = donation.location?.address
              ? `https://maps.google.com/?q=${encodeURIComponent(donation.location.address)}`
              : null;

            return (
              <div
                key={match._id}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden"
              >
                {/* Trip Header Status Bar */}
                <div className="bg-[#FAF9F6] border-b border-stone-200/70 px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-[#1F2937]">
                      Parcel Batch #{match._id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isPickedUp
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isPickedUp ? '🚚 Courier In Transit to Shelter' : '📍 Courier Pickup Scheduled at Donor'}
                    </span>
                  </div>

                  <span className="text-xs text-stone-600 font-medium">
                    Batch:{' '}
                    <strong className="text-stone-900 capitalize">
                      {donation.foodType?.replace(/_/g, ' ') || 'Food batch'}
                    </strong>{' '}
                    ({donation.quantity} units)
                  </span>
                </div>

                {/* Visual Route Path & Safety Window Tracker */}
                <div className="bg-stone-50/70 border-b border-stone-200/70 p-4 sm:p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-2">
                    Visual Route Path & Safety Window
                  </span>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        1
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase block">Donor Pickup</span>
                        <strong className="text-xs text-[#1F2937] block leading-tight">
                          {donation.location?.address || 'Donor Base Location'}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center px-4 py-1 text-center text-xs">
                      <div className="flex items-center gap-1 text-[#1F7A4D] font-bold text-xs">
                        <span>─── 🚚 ~15 min ───▶</span>
                      </div>
                      <span className="text-[10px] text-red-600 font-semibold mt-0.5">
                        Safety Expiry: {formatDate(donation.expiryAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        2
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase block">Shelter Dropoff</span>
                        <strong className="text-xs text-[#1F2937] block leading-tight">
                          Community Shelter Intake Facility
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location & Donor Details */}
                <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50/80 p-4 rounded-xl border border-stone-200/70 text-xs">
                    <div>
                      <span className="text-stone-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">
                        Donor Pickup Address & Contact
                      </span>
                      <strong className="text-xs sm:text-sm text-[#1F2937] block leading-snug">
                        {donation.location?.address || 'Donor address available upon confirmation'}
                      </strong>
                      <div className="mt-2 flex items-center gap-3">
                        {donor.phone && (
                          <a
                            href={`tel:${donor.phone}`}
                            className="text-[#1F7A4D] font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>📞</span>
                            <span>{donor.phone}</span>
                          </a>
                        )}
                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1F7A4D] font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>🗺️</span>
                            <span>Open Navigation Map</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-stone-400 font-semibold block uppercase tracking-wider text-[10px] mb-1">
                        Food Batch Notes
                      </span>
                      <p className="text-stone-700 text-xs leading-relaxed">
                        {donation.description || 'No special handling requirements specified.'}
                      </p>
                      <span className="text-stone-400 block mt-2">
                        Donor: <strong className="text-stone-700">{donor.name || 'Donor'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* LARGE & SIMPLE OTP SECTION FOR NON-TECHNICAL VOLUNTEERS & SHELTER STAFF */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pt-1">
                    {/* Step 1: Pickup OTP Card */}
                    <div
                      className={`p-5 sm:p-7 rounded-2xl border-2 flex flex-col justify-between items-center text-center transition-all ${
                        !isPickedUp
                          ? 'bg-[#E8F5EE]/40 border-[#1F7A4D] shadow-sm'
                          : 'bg-stone-50 border-stone-200 opacity-70'
                      }`}
                    >
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="w-5 h-5 rounded-full bg-[#1F7A4D] text-white text-[11px] font-bold flex items-center justify-center">
                            1
                          </span>
                          <span className="text-xs font-bold uppercase tracking-widest text-[#1F7A4D]">
                            Pickup OTP (Give to Donor)
                          </span>
                        </div>

                        {/* HIGH-CONTRAST LARGE OTP DISPLAY */}
                        <div className="my-3 sm:my-4 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl bg-white border-2 border-[#1F7A4D]/40 shadow-xs inline-block w-full max-w-xs">
                          <span className="text-3xl sm:text-5xl font-mono font-black tracking-[0.25em] text-[#1F7A4D] select-all">
                            {match.pickupOtp || '------'}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
                          Show this 6-digit code to the food donor when picking up the food batch.
                        </p>
                      </div>

                      <div className="mt-5 sm:mt-6 w-full">
                        {!isPickedUp ? (
                          <button
                            type="button"
                            onClick={() =>
                              openVerifyModal(match._id, 'pickup', match.pickupOtp)
                            }
                            className="w-full py-3.5 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
                          >
                            Verify Pickup
                          </button>
                        ) : (
                          <div className="py-3 px-4 rounded-xl bg-[#E8F5EE] text-[#1F7A4D] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#1F7A4D]/20">
                            <span>✓</span>
                            <span>Pickup Completed</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step 2: Delivery OTP Card */}
                    <div
                      className={`p-5 sm:p-7 rounded-2xl border-2 flex flex-col justify-between items-center text-center transition-all ${
                        isPickedUp
                          ? 'bg-[#E8F5EE]/40 border-[#1F7A4D] shadow-sm'
                          : 'bg-stone-50 border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                            isPickedUp ? 'bg-[#1F7A4D] text-white' : 'bg-stone-400 text-white'
                          }`}>
                            2
                          </span>
                          <span className={`text-xs font-bold uppercase tracking-widest ${
                            isPickedUp ? 'text-[#1F7A4D]' : 'text-stone-500'
                          }`}>
                            Delivery OTP (Give to Shelter)
                          </span>
                        </div>

                        {/* HIGH-CONTRAST LARGE OTP DISPLAY */}
                        <div className="my-3 sm:my-4 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl bg-white border-2 border-stone-300 shadow-xs inline-block w-full max-w-xs">
                          <span className={`text-3xl sm:text-5xl font-mono font-black tracking-[0.25em] select-all ${
                            isPickedUp ? 'text-[#1F2937]' : 'text-stone-400'
                          }`}>
                            {match.deliveryOtp || '------'}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
                          Show this 6-digit code to the shelter staff when delivering the food.
                        </p>
                      </div>

                      <div className="mt-5 sm:mt-6 w-full">
                        <button
                          type="button"
                          onClick={() =>
                            openVerifyModal(match._id, 'delivery', match.deliveryOtp)
                          }
                          disabled={!isPickedUp}
                          className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all ${
                            isPickedUp
                              ? 'bg-[#1F7A4D] hover:bg-[#18643e] text-white cursor-pointer'
                              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          Verify Delivery
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Simple OTP Verification Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={closeVerifyModal}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-2 text-sm font-bold"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center mx-auto mb-3 font-bold text-2xl shadow-xs">
                {modalState.type === 'pickup' ? '📍' : '🏢'}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1F2937]">
                {modalState.type === 'pickup'
                  ? 'Verify Food Pickup'
                  : 'Verify Shelter Delivery'}
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
                {modalState.type === 'pickup'
                  ? 'Enter the 6-digit verification code to confirm food collection from the donor.'
                  : 'Enter the 6-digit verification code from shelter staff to mark food delivery complete.'}
              </p>
            </div>

            {modalError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-center">
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 text-center mb-2">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/\D/g, ''));
                    if (modalError) setModalError('');
                  }}
                  autoFocus
                  placeholder="000000"
                  className="w-full text-center text-3xl sm:text-5xl font-mono font-bold tracking-[0.25em] py-3.5 px-4 rounded-xl border-2 border-stone-300 text-[#1F2937] focus:outline-none focus:border-[#1F7A4D] focus:ring-2 focus:ring-[#1F7A4D]/20 bg-[#FAF9F6]"
                />
              </div>

              {modalState.expectedOtp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setOtpInput(modalState.expectedOtp)}
                    className="text-xs text-[#1F7A4D] hover:underline font-semibold"
                  >
                    Quick Fill Test Code: {modalState.expectedOtp}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeVerifyModal}
                  className="flex-1 py-3 px-4 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs sm:text-sm hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || otpInput.length < 6}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {modalLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Confirm OTP</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivePickup;
