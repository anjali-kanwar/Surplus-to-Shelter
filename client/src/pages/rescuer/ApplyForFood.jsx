import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { ListSkeleton } from '../../components/Skeleton';

const FOOD_TYPES = [
  { id: 'cooked_meals', label: 'Cooked Meals', icon: '🍲' },
  { id: 'produce', label: 'Fresh Produce', icon: '🥦' },
  { id: 'baked_goods', label: 'Baked Goods', icon: '🍞' },
  { id: 'packaged', label: 'Packaged Food', icon: '🥫' },
  { id: 'other', label: 'Other Groceries', icon: '📦' },
];

const URGENCY_LEVELS = [
  {
    id: 'standard',
    label: 'Standard (Next 24-48h)',
    desc: 'Regular daily intake / pantry restock',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  {
    id: 'urgent',
    label: 'Urgent (Today / ASAP)',
    desc: 'Immediate emergency shelter demand',
    color: 'border-red-200 bg-red-50 text-red-800',
  },
  {
    id: 'scheduled',
    label: 'Scheduled Event',
    desc: 'Planned community meal distribution',
    color: 'border-blue-200 bg-blue-50 text-blue-800',
  },
];

const ApplyForFood = ({ onRequestSubmitted }) => {
  const user = getUser() || {};

  const [formData, setFormData] = useState({
    shelterName: user.name || '',
    foodTypes: ['cooked_meals', 'produce'],
    minQuantity: 30,
    maxQuantity: 100,
    quantityUnit: 'meals',
    beneficiariesCount: 50,
    urgency: 'standard',
    address: user.location?.address || '',
    lat: user.location?.lat || null,
    lng: user.location?.lng || null,
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchMyRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get('/api/rescuer/my-food-requests');
      setMyRequests(res.data?.requests || []);
    } catch (err) {
      console.error('Error fetching my food requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const toggleFoodType = (id) => {
    setFormData((prev) => {
      const exists = prev.foodTypes.includes(id);
      const updated = exists
        ? prev.foodTypes.filter((t) => t !== id)
        : [...prev.foodTypes, id];
      return { ...prev, foodTypes: updated };
    });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData((prev) => ({
          ...prev,
          lat: Number(latitude.toFixed(5)),
          lng: Number(longitude.toFixed(5)),
          address: prev.address || `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        }));
        toast.success('Captured shelter GPS coordinates!');
        setDetectingGps(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        toast.error('Could not get GPS. Please type the address manually.');
        setDetectingGps(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (formData.foodTypes.length === 0) {
        throw new Error('Please select at least one food category.');
      }
      if (!formData.address.trim()) {
        throw new Error('Please specify the delivery / shelter address.');
      }
      if (Number(formData.minQuantity) <= 0 || Number(formData.maxQuantity) <= 0) {
        throw new Error('Quantities must be greater than 0.');
      }
      if (Number(formData.minQuantity) > Number(formData.maxQuantity)) {
        throw new Error('Minimum quantity cannot be greater than maximum quantity.');
      }

      const payload = {
        shelterName: formData.shelterName.trim(),
        foodTypes: formData.foodTypes,
        minQuantity: Number(formData.minQuantity),
        maxQuantity: Number(formData.maxQuantity),
        quantityUnit: formData.quantityUnit,
        beneficiariesCount: Number(formData.beneficiariesCount) || 0,
        urgency: formData.urgency,
        address: formData.address.trim(),
        location: {
          address: formData.address.trim(),
          ...(formData.lat && formData.lng && { lat: formData.lat, lng: formData.lng }),
        },
        notes: formData.notes.trim(),
      };

      const res = await api.post('/api/rescuer/food-requests', payload);

      toast.success('Food request submitted! Sent to Admin & plotted on Live Map.');
      
      // Reset some fields
      setFormData((prev) => ({
        ...prev,
        notes: '',
        minQuantity: 30,
        maxQuantity: 100,
      }));

      await fetchMyRequests();
      if (onRequestSubmitted) onRequestSubmitted(res.data?.foodRequest);
    } catch (err) {
      console.error('Error submitting food request:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to submit food request.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this food request?')) return;
    setCancellingId(requestId);
    try {
      await api.delete(`/api/rescuer/food-requests/${requestId}`);
      toast.success('Food request cancelled.');
      await fetchMyRequests();
    } catch (err) {
      console.error('Error cancelling food request:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            ⏳ Pending Admin Review
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            ✓ Approved (Searching Matches)
          </span>
        );
      case 'matched':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            🎯 Matched with Surplus Food
          </span>
        );
      case 'fulfilled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#1F7A4D] border border-[#1F7A4D]/20">
            🍲 Delivered & Fulfilled
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
            ✕ Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1F7A4D]/10 via-[#1F7A4D]/5 to-transparent p-5 sm:p-6 rounded-2xl border border-[#1F7A4D]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🥣</span>
            <h2 className="text-xl font-bold text-[#1F2937]">Apply for Food Supplies</h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Specify your shelter's required quantity range and delivery address. Your request will immediately appear on the <strong>Admin Live Map</strong> for dispatch & matching.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-700 shadow-xs w-fit">
          <span>📍</span>
          <span>{myRequests.filter((r) => r.status === 'pending').length} Active Applications</span>
        </div>
      </div>

      {/* Grid: Form on Left/Top + Active Requests on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Container */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-2xl border border-stone-200/70 shadow-sm">
          <h3 className="text-base font-bold text-[#1F2937] mb-4 pb-3 border-b border-stone-100 flex items-center justify-between">
            <span>New Food Application</span>
            <span className="text-xs font-normal text-stone-500">Fast Shelter Intake Flow</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#1F2937] mb-1.5">
                Shelter / Organization Name
              </label>
              <input
                type="text"
                name="shelterName"
                required
                value={formData.shelterName}
                onChange={handleChange}
                placeholder="e.g. Hope Community Shelter"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
              />
            </div>

            {/* Food Categories */}
            <div>
              <label className="block text-xs font-bold text-[#1F2937] mb-2">
                Food Categories Needed (Select all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FOOD_TYPES.map((t) => {
                  const selected = formData.foodTypes.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleFoodType(t.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                        selected
                          ? 'border-[#1F7A4D] bg-[#E8F5EE] text-[#1F7A4D] ring-1 ring-[#1F7A4D]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className="text-sm">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Range */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#1F2937]">
                  Quantity Range Required
                </label>
                <span className="text-xs font-semibold text-[#1F7A4D]">
                  Target: {formData.minQuantity} – {formData.maxQuantity} {formData.quantityUnit}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="block text-[11px] font-semibold text-stone-500 mb-1">
                    Min Quantity
                  </span>
                  <input
                    type="number"
                    name="minQuantity"
                    min="1"
                    required
                    value={formData.minQuantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-stone-500 mb-1">
                    Max Quantity
                  </span>
                  <input
                    type="number"
                    name="maxQuantity"
                    min="1"
                    required
                    value={formData.maxQuantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-stone-500 mb-1">
                    Unit
                  </span>
                  <select
                    name="quantityUnit"
                    value={formData.quantityUnit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                  >
                    <option value="meals">Meals</option>
                    <option value="kg">kg (weight)</option>
                    <option value="boxes">Boxes / Trays</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address & GPS Location */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#1F2937]">
                  Delivery / Shelter Address
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingGps}
                  className="text-[11px] font-semibold text-[#1F7A4D] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {detectingGps ? '📍 Detecting GPS...' : '📍 Use GPS Coordinates'}
                </button>
              </div>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. 742 Evergreen Terrace, North District, Metro City"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
              />
              {formData.lat && formData.lng && (
                <div className="mt-1 text-[11px] text-[#1F7A4D] font-medium flex items-center gap-1">
                  <span>✓ Geolocation Tagged:</span>
                  <span className="font-mono">[{formData.lat}, {formData.lng}]</span>
                  <span className="text-stone-500 font-normal">— Will appear on Admin Map dot</span>
                </div>
              )}
            </div>

            {/* Urgency & Beneficiaries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1F2937] mb-1.5">
                  Urgency Level
                </label>
                <div className="space-y-1.5">
                  {URGENCY_LEVELS.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                        formData.urgency === u.id
                          ? 'border-[#1F7A4D] bg-[#E8F5EE] ring-1 ring-[#1F7A4D]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={u.id}
                        checked={formData.urgency === u.id}
                        onChange={handleChange}
                        className="mt-0.5 accent-[#1F7A4D]"
                      />
                      <div>
                        <strong className="block text-stone-800 font-semibold">{u.label}</strong>
                        <span className="text-[11px] text-stone-500">{u.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F2937] mb-1.5">
                    Estimated Beneficiaries (People)
                  </label>
                  <input
                    type="number"
                    name="beneficiariesCount"
                    min="1"
                    value={formData.beneficiariesCount}
                    onChange={handleChange}
                    placeholder="e.g. 75"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2937] mb-1.5">
                    Handling / Dietary Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    rows="2"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="e.g. Halal or vegetarian preferred. Cold storage available on-site."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-bold text-xs sm:text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Submit Food Application to Admin</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* My Submitted Requests History */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/70 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-[#1F2937]">
                My Food Requests ({myRequests.length})
              </h3>
              <button
                onClick={fetchMyRequests}
                className="text-xs font-semibold text-[#1F7A4D] hover:underline"
              >
                Refresh
              </button>
            </div>

            {loadingRequests ? (
              <ListSkeleton count={3} />
            ) : myRequests.length === 0 ? (
              <div className="text-center py-10 px-4">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-xs font-bold text-stone-700">No Food Requests Yet</p>
                <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
                  Submit an application using the form on the left to request food supplies for your shelter.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {myRequests.map((req) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-50 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-[#1F2937]">
                            {req.minQuantity} – {req.maxQuantity} {req.quantityUnit || 'meals'}
                          </span>
                          {req.urgency === 'urgent' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {req.foodTypes?.map((t) => t.replace('_', ' ')).join(', ')}
                        </p>
                      </div>
                      <div>{getStatusBadge(req.status)}</div>
                    </div>

                    <div className="text-[11px] text-stone-600 space-y-1 pt-1 border-t border-stone-200/60">
                      <div className="flex items-center gap-1.5">
                        <span>📍</span>
                        <span className="truncate">{req.address}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-400">
                        <span>Submitted: {new Date(req.createdAt).toLocaleDateString()}</span>
                        {req.beneficiariesCount > 0 && (
                          <span>👥 {req.beneficiariesCount} people</span>
                        )}
                      </div>
                    </div>

                    {req.notes && (
                      <p className="text-[11px] bg-white p-2 rounded-lg border border-stone-200 text-stone-600 italic">
                        "{req.notes}"
                      </p>
                    )}

                    {req.status === 'pending' && (
                      <div className="pt-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(req._id)}
                          disabled={cancellingId === req._id}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {cancellingId === req._id ? 'Cancelling...' : 'Cancel Request'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyForFood;
