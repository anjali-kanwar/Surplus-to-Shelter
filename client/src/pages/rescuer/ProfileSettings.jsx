import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getUser, setAuthSession, getToken } from '../../utils/auth';

const FOOD_TYPES = [
  { id: 'cooked_meals', label: 'Cooked Meals', description: 'Prepared trays, hot cafeteria surplus, catering dishes' },
  { id: 'produce', label: 'Fresh Produce', description: 'Fruits, raw vegetables, herbs, perishables' },
  { id: 'baked_goods', label: 'Baked Goods', description: 'Bread, bagels, pastries, muffins, baked items' },
  { id: 'packaged', label: 'Packaged Food', description: 'Canned goods, dry boxes, pantry staples, unopened dairy' },
  { id: 'other', label: 'Other Groceries / Mixed', description: 'Assorted grocery items, beverages, bulk surplus' },
];

const ProfileSettings = ({ onProfileUpdated }) => {
  const currentUser = getUser() || {};

  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    phone: currentUser.phone || '',
    acceptedTypes: Array.isArray(currentUser.acceptedTypes) && currentUser.acceptedTypes.length > 0
      ? currentUser.acceptedTypes
      : ['cooked_meals', 'produce'],
    availableCapacity: currentUser.availableCapacity || 50,
    acceptRadiusKm: currentUser.acceptRadiusKm || 15,
    pickupWindowStart: currentUser.pickupWindowStart || '09:00',
    pickupWindowEnd: currentUser.pickupWindowEnd || '18:00',
    address: currentUser.location?.address || '',
    lat: currentUser.location?.lat || '',
    lng: currentUser.location?.lng || '',
  });

  const [loading, setLoading] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill / refresh from server on load
  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const stored = getUser();
        if (stored) {
          setFormData((prev) => ({
            ...prev,
            name: stored.name || prev.name,
            phone: stored.phone || prev.phone,
            acceptedTypes: Array.isArray(stored.acceptedTypes) && stored.acceptedTypes.length > 0
              ? stored.acceptedTypes
              : prev.acceptedTypes,
            availableCapacity: stored.availableCapacity ?? prev.availableCapacity,
            acceptRadiusKm: stored.acceptRadiusKm ?? prev.acceptRadiusKm,
            pickupWindowStart: stored.pickupWindowStart || prev.pickupWindowStart,
            pickupWindowEnd: stored.pickupWindowEnd || prev.pickupWindowEnd,
            address: stored.location?.address || prev.address,
            lat: stored.location?.lat ?? prev.lat,
            lng: stored.location?.lng ?? prev.lng,
          }));
        }
      } catch (err) {
        console.error('Error loading initial profile:', err);
      }
    };
    fetchLatestProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleCheckboxToggle = (typeId) => {
    setFormData((prev) => {
      const exists = prev.acceptedTypes.includes(typeId);
      const updated = exists
        ? prev.acceptedTypes.filter((t) => t !== typeId)
        : [...prev.acceptedTypes, typeId];
      return { ...prev, acceptedTypes: updated };
    });
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
          address: prev.address || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
        }));
        setGeoLocating(false);
        toast.success('GPS coordinates detected!');
      },
      (error) => {
        console.warn('Geolocation error:', error);
        toast.error('Unable to retrieve location automatically. Please enter your address.');
        setGeoLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (formData.acceptedTypes.length === 0) {
        throw new Error('Please select at least one accepted food category.');
      }

      if (Number(formData.availableCapacity) <= 0) {
        throw new Error('Available capacity must be greater than 0.');
      }

      if (Number(formData.acceptRadiusKm) <= 0) {
        throw new Error('Accept radius must be greater than 0 km.');
      }

      const locationPayload = {};
      if (formData.address) locationPayload.address = formData.address.trim();
      if (formData.lat !== '' && !isNaN(Number(formData.lat))) locationPayload.lat = Number(formData.lat);
      if (formData.lng !== '' && !isNaN(Number(formData.lng))) locationPayload.lng = Number(formData.lng);

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        acceptedTypes: formData.acceptedTypes,
        availableCapacity: Number(formData.availableCapacity),
        acceptRadiusKm: Number(formData.acceptRadiusKm),
        pickupWindowStart: formData.pickupWindowStart,
        pickupWindowEnd: formData.pickupWindowEnd,
        location: Object.keys(locationPayload).length > 0 ? locationPayload : undefined,
      };

      const response = await api.put('/api/rescuer/profile', payload);
      const updatedUser = response.data?.user;

      if (updatedUser) {
        setAuthSession(getToken(), updatedUser);
      }

      const msg = 'Profile and vehicle capacity settings updated successfully!';
      setSuccessMessage(msg);
      toast.success(msg);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error('Error updating rescuer profile:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update profile settings.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 sm:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6 pb-5 border-b border-stone-100">
        <h2 className="text-xl font-bold text-[#1F2937]">Shelter Profile & Receiving Capacity</h2>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Configure your accepted food categories, shelter intake capacity, delivery radius, and intake receiving windows.
        </p>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-[#E8F5EE] border border-[#1F7A4D]/30 text-[#1F7A4D] text-xs sm:text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-400 hover:text-red-700 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Personal & Contact Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label htmlFor="name" className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5">
              Shelter / Rescue Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Hope Community Shelter"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5">
              Contact Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +1 (555) 019-2834"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
            />
          </div>
        </div>

        {/* Accepted Food Types (Checkboxes) */}
        <div className="pt-2">
          <label className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5">
            Accepted Food Types <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-stone-500 block mb-3">
            Select all food categories your shelter facility and storage can safely accept.
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {FOOD_TYPES.map((type) => {
              const isChecked = formData.acceptedTypes.includes(type.id);
              return (
                <label
                  key={type.id}
                  className={`flex items-start gap-3.5 p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-[#1F7A4D] bg-[#E8F5EE]/40 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCheckboxToggle(type.id)}
                    className="w-4 h-4 mt-0.5 text-[#1F7A4D] rounded border-stone-300 focus:ring-[#1F7A4D]"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-[#1F2937] block leading-snug">
                      {type.label}
                    </span>
                    <span className="text-[11px] sm:text-xs text-stone-500 block mt-0.5">
                      {type.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Vehicle Capacity and Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
          <div>
            <label
              htmlFor="availableCapacity"
              className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Shelter Intake Capacity (meals / units) <span className="text-red-500">*</span>
            </label>
            <input
              id="availableCapacity"
              name="availableCapacity"
              type="number"
              min="1"
              required
              value={formData.availableCapacity}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              Maximum meal portions or quantity units your shelter can receive and store per batch.
            </span>
          </div>

          <div>
            <label
              htmlFor="acceptRadiusKm"
              className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Maximum Delivery Distance (km) <span className="text-red-500">*</span>
            </label>
            <input
              id="acceptRadiusKm"
              name="acceptRadiusKm"
              type="number"
              min="1"
              required
              value={formData.acceptRadiusKm}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              Maximum courier transit distance from your shelter location.
            </span>
          </div>
        </div>

        {/* Availability Windows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
          <div>
            <label
              htmlFor="pickupWindowStart"
              className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Daily Availability Starts
            </label>
            <input
              id="pickupWindowStart"
              name="pickupWindowStart"
              type="time"
              required
              value={formData.pickupWindowStart}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
            />
          </div>

          <div>
            <label
              htmlFor="pickupWindowEnd"
              className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Daily Availability Ends
            </label>
            <input
              id="pickupWindowEnd"
              name="pickupWindowEnd"
              type="time"
              required
              value={formData.pickupWindowEnd}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
            />
          </div>
        </div>

        {/* Base Location */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="address" className="block text-xs sm:text-sm font-semibold text-[#1F2937]">
              Base Station / Location Address
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geoLocating}
              className="text-xs text-[#1F7A4D] hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              <span>📍</span>
              <span>{geoLocating ? 'Detecting...' : 'Use Current GPS'}</span>
            </button>
          </div>

          <input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            placeholder="e.g. Mission District, San Francisco, CA"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
          />
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-semibold text-xs sm:text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <span>Save & Update Profile</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
