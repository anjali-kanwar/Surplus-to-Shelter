import React, { useState } from 'react';
import api from '../../services/api';

const FOOD_TYPES = [
  { value: 'cooked_meals', label: 'Cooked Meals (prepared, catered, trays)' },
  { value: 'produce', label: 'Fresh Produce (fruits, vegetables)' },
  { value: 'baked_goods', label: 'Baked Goods (bread, pastries, bagels)' },
  { value: 'packaged', label: 'Packaged Food (canned, dry goods, dairy)' },
  { value: 'other', label: 'Other Groceries / Mixed' },
];

const DEFAULT_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

const PostDonation = ({ onDonationPosted }) => {
  // Default expiry date+time set to 4 hours from now
  const getDefaultExpiry = () => {
    const d = new Date(Date.now() + 4 * 60 * 60 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const [formData, setFormData] = useState({
    foodType: 'cooked_meals',
    quantity: '',
    description: '',
    expiryAt: getDefaultExpiry(),
    pickupAddress: '',
    photoUrl: DEFAULT_PLACEHOLDER_IMAGE,
  });

  const [imagePreview, setImagePreview] = useState(DEFAULT_PLACEHOLDER_IMAGE);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setFormData((prev) => ({
        ...prev,
        photoUrl: base64String,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUsePlaceholder = () => {
    setImagePreview(DEFAULT_PLACEHOLDER_IMAGE);
    setFormData((prev) => ({
      ...prev,
      photoUrl: DEFAULT_PLACEHOLDER_IMAGE,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!formData.foodType || !formData.quantity || !formData.expiryAt) {
        throw new Error('Please fill in food type, quantity, and expiry date & time.');
      }

      const payload = {
        foodType: formData.foodType,
        quantity: Number(formData.quantity),
        description: formData.description.trim(),
        expiryAt: new Date(formData.expiryAt).toISOString(),
        location: {
          address: formData.pickupAddress.trim() || 'Default donor address',
        },
        photoUrl: formData.photoUrl || DEFAULT_PLACEHOLDER_IMAGE,
      };

      const response = await api.post('/api/donations', payload);

      setSuccessMessage('Donation posted successfully! Our matching engine is notifying certified rescuers nearby.');
      
      // Reset form
      setFormData({
        foodType: 'cooked_meals',
        quantity: '',
        description: '',
        expiryAt: getDefaultExpiry(),
        pickupAddress: '',
        photoUrl: DEFAULT_PLACEHOLDER_IMAGE,
      });
      setImagePreview(DEFAULT_PLACEHOLDER_IMAGE);

      if (onDonationPosted) {
        onDonationPosted(response.data?.donation);
      }
    } catch (err) {
      console.error('Error posting donation:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to post donation.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-6 sm:p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1F2937]">Post Surplus Food</h2>
        <p className="text-sm text-stone-600 mt-1">
          List your excess meals or ingredients so volunteer rescuers can deliver them to shelters.
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
        {/* Food Type Dropdown */}
        <div>
          <label
            htmlFor="foodType"
            className="block text-sm font-semibold text-[#1F2937] mb-1.5"
          >
            Food Category <span className="text-red-500">*</span>
          </label>
          <select
            id="foodType"
            name="foodType"
            value={formData.foodType}
            onChange={handleChange}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] bg-white focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
          >
            {FOOD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Quantity (meals / kg / units) <span className="text-red-500">*</span>
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              required
              value={formData.quantity}
              onChange={handleChange}
              placeholder="e.g. 25"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
            />
          </div>

          {/* Expiry Date & Time */}
          <div>
            <label
              htmlFor="expiryAt"
              className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Must Be Picked Up By <span className="text-red-500">*</span>
            </label>
            <input
              id="expiryAt"
              name="expiryAt"
              type="datetime-local"
              required
              value={formData.expiryAt}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-[#1F2937] mb-1.5"
          >
            Description & Packaging Details
          </label>
          <textarea
            id="description"
            name="description"
            rows="3"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g. 10 trays of vegetable pasta and 15 boxed sandwiches. Packed cold, ready in bakery kitchen."
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
          />
        </div>

        {/* Pickup Address */}
        <div>
          <label
            htmlFor="pickupAddress"
            className="block text-sm font-semibold text-[#1F2937] mb-1.5"
          >
            Pickup Location & Address <span className="text-red-500">*</span>
          </label>
          <input
            id="pickupAddress"
            name="pickupAddress"
            type="text"
            required
            value={formData.pickupAddress}
            onChange={handleChange}
            placeholder="e.g. 450 Market Street, Service Entrance, San Francisco"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-sm transition"
          />
        </div>

        {/* Photo Upload (Base64 or Placeholder) */}
        <div>
          <label className="block text-sm font-semibold text-[#1F2937] mb-1.5">
            Food Photo (Base64 Upload or Placeholder)
          </label>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-24 h-24 rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex-shrink-0">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Donation preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                  No Photo
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#E8F5EE] file:text-[#1F7A4D] hover:file:bg-[#d8ece1] cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUsePlaceholder}
                  className="text-xs text-stone-500 hover:text-[#1F7A4D] underline"
                >
                  Reset to default placeholder image
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Posting Donation...' : 'Post Donation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostDonation;
