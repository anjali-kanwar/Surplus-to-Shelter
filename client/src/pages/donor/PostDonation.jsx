import React, { useState } from 'react';
import toast from 'react-hot-toast';
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
  const getInitialExpiry = () => {
    const now = new Date();
    now.setHours(now.getHours() + 4);
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    foodType: 'cooked_meals',
    quantity: '',
    description: '',
    expiryAt: getInitialExpiry(),
    pickupAddress: '',
    photoUrl: DEFAULT_PLACEHOLDER_IMAGE,
  });

  const [imagePreview, setImagePreview] = useState(DEFAULT_PLACEHOLDER_IMAGE);
  const [loading, setLoading] = useState(false);
  const [analyzingVision, setAnalyzingVision] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState(null);
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

  // Run Computer Vision analysis on the uploaded photo
  const runVisionAnalysis = async (photoData, hintType) => {
    setAnalyzingVision(true);
    try {
      const res = await api.post('/api/donations/analyze-photo', {
        photoUrl: photoData,
        foodType: hintType || formData.foodType,
      });

      if (res.data?.analysis) {
        setVisionAnalysis(res.data.analysis);
        toast.success(`AI Vision: ${res.data.analysis.freshness_score}% Freshness detected!`);
      }
    } catch (err) {
      console.warn('Vision analysis failed:', err);
    } finally {
      setAnalyzingVision(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 5MB.');
      toast.error('Image size should be less than 5MB.');
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
      runVisionAnalysis(base64String, formData.foodType);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyVisionSuggestions = () => {
    if (!visionAnalysis) return;

    setFormData((prev) => ({
      ...prev,
      foodType: visionAnalysis.detected_food_type || prev.foodType,
      quantity: prev.quantity || visionAnalysis.estimated_portions || 20,
      description: prev.description
        ? prev.description
        : `Verified surplus ${visionAnalysis.category_label}. ${visionAnalysis.safety_recommendation}`,
    }));
    toast.success('Applied AI Vision suggestions to form!');
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
        visionAnalysis: visionAnalysis || undefined,
      };

      const response = await api.post('/api/donations', payload);

      const msg = 'Donation posted successfully! Matching engine & Admin are notified.';
      setSuccessMessage(msg);
      toast.success(msg);

      // Reset form
      setFormData({
        foodType: 'cooked_meals',
        quantity: '',
        description: '',
        expiryAt: getInitialExpiry(),
        pickupAddress: '',
        photoUrl: DEFAULT_PLACEHOLDER_IMAGE,
      });
      setImagePreview(DEFAULT_PLACEHOLDER_IMAGE);
      setVisionAnalysis(null);

      if (onDonationPosted) {
        onDonationPosted(response.data?.donation);
      }
    } catch (err) {
      console.error('Error posting donation:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to post donation.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 sm:p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1F2937]">Post Surplus Food</h2>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          List your excess meals or ingredients so volunteer rescuers can deliver them to shelters.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-[#E8F5EE] border border-[#1F7A4D]/30 text-[#1F7A4D] text-xs sm:text-sm font-medium flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-stone-500 hover:text-stone-700 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Photo Upload & AI Computer Vision Analysis */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-stone-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-[#1F2937] flex items-center gap-2">
              <span>📷</span>
              <span>Food Photo & AI Computer Vision Scan</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#1F7A4D] font-bold">
              AI Vision Enabled
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-stone-200 overflow-hidden bg-white flex-shrink-0 relative">
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

              {analyzingVision && (
                <div className="absolute inset-0 bg-[#1F7A4D]/70 backdrop-blur-xs flex items-center justify-center text-white text-[10px] font-bold text-center p-1">
                  Scanning AI...
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#E8F5EE] file:text-[#1F7A4D] hover:file:bg-[#d8ece1] cursor-pointer"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => runVisionAnalysis(formData.photoUrl, formData.foodType)}
                  disabled={analyzingVision}
                  className="text-xs text-[#1F7A4D] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>⚡</span>
                  <span>{analyzingVision ? 'Analyzing...' : 'Re-scan Photo with AI'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Vision Insights Card */}
          {visionAnalysis && (
            <div className="p-3.5 rounded-xl bg-white border border-[#1F7A4D]/30 shadow-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F7A4D] flex items-center gap-1.5">
                  <span>✓</span>
                  <span>AI Quality Inspection: {visionAnalysis.freshness_score}% Freshness Index</span>
                </span>
                <span className="text-[11px] font-mono text-stone-500">
                  Confidence: {Math.round(visionAnalysis.confidence * 100)}%
                </span>
              </div>

              <p className="text-xs text-stone-600 leading-snug">
                <strong>Recommendation:</strong> {visionAnalysis.safety_recommendation}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(visionAnalysis.tags || []).map((tag, idx) => (
                  <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                    {tag}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleApplyVisionSuggestions}
                  className="ml-auto text-xs font-bold text-[#1F7A4D] hover:underline"
                >
                  + Apply AI Suggestions to Form
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Food Type Dropdown */}
        <div>
          <label
            htmlFor="foodType"
            className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
          >
            Food Category <span className="text-red-500">*</span>
          </label>
          <select
            id="foodType"
            name="foodType"
            value={formData.foodType}
            onChange={handleChange}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] bg-white focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
          >
            {FOOD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity and Expiry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label
              htmlFor="quantity"
              className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
            />
          </div>

          <div>
            <label
              htmlFor="expiryAt"
              className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Must Be Picked Up By (Food Safety Window) <span className="text-red-500">*</span>
            </label>
            <input
              id="expiryAt"
              name="expiryAt"
              type="datetime-local"
              required
              value={formData.expiryAt}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
          />
        </div>

        {/* Pickup Address */}
        <div>
          <label
            htmlFor="pickupAddress"
            className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-bold text-xs sm:text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Publishing & Triggering AI Match...</span>
              </>
            ) : (
              <span>Post Food Donation</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostDonation;
