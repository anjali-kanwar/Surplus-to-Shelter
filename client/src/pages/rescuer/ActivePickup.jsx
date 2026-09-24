import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ActivePickup = () => {
  const [activeMatches, setActiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
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

  const fetchActiveMatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/rescuer/matches');
      const allMatches = response.data?.matches || [];
      // Confirmed (awaiting pickup) or picked_up (in transit to shelter)
      const active = allMatches.filter((m) =>
        ['confirmed', 'picked_up'].includes(m.status)
      );
      setActiveMatches(active);
    } catch (err) {
      console.error('Error fetching active matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveMatches();
  }, []);

  const openVerifyModal = (matchId, type, expectedOtp) => {
    setOtpInput('');
    setModalError('');
    setModalState({
      isOpen: true,
      matchId,
      type,
      expectedOtp,
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
    if (!otpInput.trim()) {
      setModalError('Please enter the 6-digit OTP code.');
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

      setGlobalMessage({
        type: 'success',
        text:
          modalState.type === 'pickup'
            ? 'Pickup verified successfully! Food is now in transit.'
            : 'Delivery successfully verified and marked complete! Donor credit points awarded.',
      });

      closeVerifyModal();
      await fetchActiveMatches();
    } catch (err) {
      console.error('OTP verification error:', err);
      const msg =
        err.response?.data?.message || err.message || 'Invalid OTP. Please check the code.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-[#1F2937]">Active Pickups & Deliveries</h2>
        <p className="text-sm text-stone-600 mt-0.5">
          View your assigned transport orders, display secure verification OTPs, and complete handoffs.
        </p>
      </div>

      {/* Global alert */}
      {globalMessage.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between ${
            globalMessage.type === 'success'
              ? 'bg-[#E8F5EE] border border-[#1F7A4D]/30 text-[#1F7A4D]'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <span>{globalMessage.text}</span>
          <button
            onClick={() => setGlobalMessage({ type: '', text: '' })}
            className="text-stone-400 hover:text-stone-600 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-200/70 p-16 text-center text-sm text-stone-500 shadow-sm">
          Loading active rescue trips...
        </div>
      ) : activeMatches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/70 p-16 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center mx-auto mb-3 font-bold text-lg">
            📦
          </div>
          <p className="text-base font-bold text-[#1F2937] mb-1">
            No active pickups right now
          </p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            When you confirm a match from the "Incoming Matches" tab, it will appear here with verification codes for pickup and delivery.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeMatches.map((match) => {
            const donation = match.donation || {};
            const donor = donation.donor || {};
            const isPickedUp = match.status === 'picked_up';

            return (
              <div
                key={match._id}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden"
              >
                {/* Header status bar */}
                <div className="bg-[#FAF9F6] border-b border-stone-200/70 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-[#1F2937]">
                      Rescue Assignment #{match._id.slice(-6)}
                    </span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                        isPickedUp
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isPickedUp ? 'In Transit to Shelter' : 'Awaiting Donor Pickup'}
                    </span>
                  </div>

                  <span className="text-xs text-stone-500 font-medium">
                    Food Category:{' '}
                    <strong className="text-stone-800 capitalize">
                      {donation.foodType?.replace('_', ' ')}
                    </strong>{' '}
                    ({donation.quantity} units)
                  </span>
                </div>

                {/* Body Details */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Location & Donor info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50/70 p-4 rounded-xl border border-stone-200/60 text-xs">
                    <div>
                      <span className="text-stone-500 block mb-0.5 font-medium">
                        Pickup Location
                      </span>
                      <strong className="text-sm text-[#1F2937] block">
                        {donation.location?.address || 'Donor address'}
                      </strong>
                      <span className="text-stone-500 mt-1 block">
                        Donor: {donor.name || 'Donor'} {donor.phone ? `• ${donor.phone}` : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-500 block mb-0.5 font-medium">
                        Batch Details
                      </span>
                      <span className="text-stone-700 block">
                        {donation.description || 'No special packaging notes'}
                      </span>
                    </div>
                  </div>

                  {/* LARGE SIMPLE OTP SECTION FOR NON-TECHNICAL STAFF */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Pickup OTP Box */}
                    <div
                      className={`p-6 rounded-2xl border-2 flex flex-col justify-between items-center text-center transition-all ${
                        !isPickedUp
                          ? 'bg-[#E8F5EE]/40 border-[#1F7A4D]'
                          : 'bg-stone-50 border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="w-full">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#1F7A4D] block mb-2">
                          1. Pickup Verification OTP
                        </span>

                        {/* Large, Simple, High-Contrast Digits */}
                        <div className="my-3 py-3 px-6 rounded-2xl bg-white border border-[#1F7A4D]/30 inline-block shadow-xs">
                          <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-black tracking-[0.25em] text-[#1F7A4D]">
                            {match.pickupOtp || '------'}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 mt-2 max-w-xs mx-auto">
                          Share this 6-digit code with the food donor when picking up the meals.
                        </p>
                      </div>

                      <div className="mt-5 w-full">
                        {!isPickedUp ? (
                          <button
                            onClick={() =>
                              openVerifyModal(match._id, 'pickup', match.pickupOtp)
                            }
                            className="w-full py-3 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-semibold text-sm shadow-sm transition-colors"
                          >
                            Verify Pickup
                          </button>
                        ) : (
                          <div className="text-xs font-bold text-[#1F7A4D] py-2 flex items-center justify-center gap-1">
                            ✓ Pickup Verified
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery OTP Box */}
                    <div
                      className={`p-6 rounded-2xl border-2 flex flex-col justify-between items-center text-center transition-all ${
                        isPickedUp
                          ? 'bg-[#E8F5EE]/40 border-[#1F7A4D]'
                          : 'bg-stone-50 border-stone-200 opacity-70'
                      }`}
                    >
                      <div className="w-full">
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-700 block mb-2">
                          2. Delivery Verification OTP
                        </span>

                        {/* Large, Simple, High-Contrast Digits */}
                        <div className="my-3 py-3 px-6 rounded-2xl bg-white border border-stone-300 inline-block shadow-xs">
                          <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-black tracking-[0.25em] text-[#1F2937]">
                            {match.deliveryOtp || '------'}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 mt-2 max-w-xs mx-auto">
                          Share this 6-digit code with the shelter staff when handing over the food.
                        </p>
                      </div>

                      <div className="mt-5 w-full">
                        <button
                          onClick={() =>
                            openVerifyModal(match._id, 'delivery', match.deliveryOtp)
                          }
                          disabled={!isPickedUp}
                          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm shadow-sm transition-colors ${
                            isPickedUp
                              ? 'bg-[#1F7A4D] hover:bg-[#18643e] text-white'
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

      {/* OTP Verification Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={closeVerifyModal}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-2 text-sm font-bold"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                🔑
              </div>
              <h3 className="text-xl font-bold text-[#1F2937]">
                {modalState.type === 'pickup'
                  ? 'Verify Food Pickup'
                  : 'Verify Shelter Delivery'}
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
                {modalState.type === 'pickup'
                  ? 'Enter the 6-digit OTP code to confirm food has been picked up from donor.'
                  : 'Enter the 6-digit OTP code provided at the shelter to confirm completed delivery.'}
              </p>
            </div>

            {modalError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-center">
                {modalError}
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 text-center mb-2">
                  Enter 6-Digit OTP
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
                  className="w-full text-center text-3xl sm:text-4xl font-mono font-bold tracking-[0.3em] py-3 px-4 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] bg-[#FAF9F6]"
                />
              </div>

              {/* Helper button to paste current match OTP for testing */}
              {modalState.expectedOtp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setOtpInput(modalState.expectedOtp)}
                    className="text-xs text-[#1F7A4D] hover:underline font-medium"
                  >
                    Quick fill: {modalState.expectedOtp}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeVerifyModal}
                  className="flex-1 py-3 px-4 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || otpInput.length < 6}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {modalLoading ? 'Verifying...' : 'Confirm OTP'}
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
