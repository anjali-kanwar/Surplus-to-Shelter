import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { getUser, setAuthSession, getToken } from '../../utils/auth';

const FOOD_TYPES = [
  { id: 'cooked_meals', label: 'Cooked Meals (prepared, catered, trays)' },
  { id: 'produce', label: 'Fresh Produce (fruits, vegetables)' },
  { id: 'baked_goods', label: 'Baked Goods (bread, pastries, bagels)' },
  { id: 'packaged', label: 'Packaged Food (canned, dry goods, dairy)' },
  { id: 'other', label: 'Other Groceries / Mixed' },
];

const ProfileSettings = () => {
  const currentUser = getUser() || {};

  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    phone: currentUser.phone || '',
    acceptedTypes: currentUser.acceptedTypes || ['cooked_meals', 'produce'],
    availableCapacity: currentUser.availableCapacity || 50,
    acceptRadiusKm: currentUser.acceptRadiusKm || 15,
    pickupWindowStart: currentUser.pickupWindowStart || '09:00',
    pickupWindowEnd: currentUser.pickupWindowEnd || '18:00',
    address: currentUser.location?.address || '',
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (formData.acceptedTypes.length === 0) {
        throw new Error('Please select at least one accepted food category.');
      }

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        acceptedTypes: formData.acceptedTypes,
        availableCapacity: Number(formData.availableCapacity),
        acceptRadiusKm: Number(formData.acceptRadiusKm),
        pickupWindowStart: formData.pickupWindowStart,
        pickupWindowEnd: formData.pickupWindowEnd,
        location: {
          address: formData.address.trim(),
        },
      };

      const response = await api.put('/api/rescuer/profile', payload);
      const updatedUser = response.data?.user;

      if (updatedUser) {
        // Update user in local storage
        setAuthSession(getToken(), updatedUser);
      }

      setSuccessMessage('Profile and vehicle capacity settings updated successfully!');
    } catch (err) {
      console.error('Error updating rescuer profile:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update profile.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-6 sm:p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1F2937]">Profile & Rescue Capacity</h2>
        <p className="text-sm text-stone-600 mt-1">
          Configure your rescue radius, vehicle limits, and availability for matching algorithms.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-[#E8F5EE] border border-[#1F7A4D]/30 text-[#1F7A4D] text-sm font-medium flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-stone-500 hover:text-stone-700 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage('')}
            className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[#1F2937] mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-[#1F2937] mb-1.5">
              Contact Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 000-0000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
            />
          </div>
        </div>

        {/* Accepted Food Types (Checkboxes) */}
        <div>
          <label className="block text-sm font-semibold text-[#1F2937] mb-2.5">
            Accepted Food Types (Check all you can safely transport) <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2.5">
            {FOOD_TYPES.map((type) => {
              const isChecked = formData.acceptedTypes.includes(type.id);
              return (
                <label
                  key={type.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-[#1F7A4D] bg-[#E8F5EE]/50'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCheckboxToggle(type.id)}
                    className="w-4 h-4 text-[#1F7A4D] rounded border-stone-300 focus:ring-[#1F7A4D]"
                  />
                  <span className="text-sm font-medium text-[#1F2937]">{type.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Capacity and Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="availableCapacity"
              className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Vehicle Capacity (meals / kg) <span className="text-red-500">*</span>
            </label>
            <input
              id="availableCapacity"
              name="availableCapacity"
              type="number"
              min="1"
              required
              value={formData.availableCapacity}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
            />
            <span className="text-xs text-stone-500 mt-1 block">
              Max load your vehicle can safely carry per trip.
            </span>
          </div>

          <div>
            <label
              htmlFor="acceptRadiusKm"
              className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Pickup Radius (km) <span className="text-red-500">*</span>
            </label>
            <input
              id="acceptRadiusKm"
              name="acceptRadiusKm"
              type="number"
              min="1"
              required
              value={formData.acceptRadiusKm}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
            />
            <span className="text-xs text-stone-500 mt-1 block">
              Maximum travel distance from your location.
            </span>
          </div>
        </div>

        {/* Pickup Window Start & End */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="pickupWindowStart"
              className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Availability Starts
            </label>
            <input
              id="pickupWindowStart"
              name="pickupWindowStart"
              type="time"
              required
              value={formData.pickupWindowStart}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
            />
          </div>

          <div>
            <label
              htmlFor="pickupWindowEnd"
              className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Availability Ends
            </label>
            <input
              id="pickupWindowEnd"
              name="pickupWindowEnd"
              type="time"
              required
              value={formData.pickupWindowEnd}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
            />
          </div>
        </div>

        {/* Location / Base Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-semibold text-[#1F2937] mb-1.5">
            Base Location / Neighborhood Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            placeholder="e.g. Mission District, San Francisco, CA"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
          />
          <span className="text-xs text-stone-500 mt-1 block">
            Used as the center point for calculating your pickup radius.
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? 'Saving Profile...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
