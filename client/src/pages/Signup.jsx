import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { setAuthSession, decodeToken, getRoleHomeRoute } from '../utils/auth';

const FOOD_TYPES = [
  { id: 'cooked_meals', label: 'Cooked Meals' },
  { id: 'produce', label: 'Fresh Produce' },
  { id: 'baked_goods', label: 'Baked Goods' },
  { id: 'packaged', label: 'Packaged Food' },
  { id: 'other', label: 'Other Groceries' },
];

const SHELTER_TYPES = [
  { id: 'shelter', label: 'Homeless & Family Shelter' },
  { id: 'food_bank', label: 'Community Food Bank / Pantry' },
  { id: 'soup_kitchen', label: 'Soup Kitchen & Meal Center' },
  { id: 'refugee_center', label: 'Refugee & Crisis Aid Center' },
  { id: 'care_home', label: 'Senior / Youth Care Facility' },
  { id: 'other', label: 'Other Nonprofit Aid Group' },
];

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Role can only be 'donor' or 'rescuer'
  const paramRole = searchParams.get('role');
  const initialRole = paramRole === 'rescuer' ? 'rescuer' : 'donor';
  const [role, setRole] = useState(initialRole);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: 'Metro City',
    organizationType: 'shelter',
    acceptedTypes: ['cooked_meals', 'produce'],
    availableCapacity: 50,
    acceptRadiusKm: 15,
    pickupWindowStart: '09:00',
    pickupWindowEnd: '18:00',
    lat: null,
    lng: null,
  });

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    if (error) setError('');
  };

  const toggleFoodType = (typeId) => {
    setFormData((prev) => {
      const exists = prev.acceptedTypes.includes(typeId);
      const updated = exists
        ? prev.acceptedTypes.filter((t) => t !== typeId)
        : [...prev.acceptedTypes, typeId];
      return { ...prev, acceptedTypes: updated };
    });
  };

  // Helper to fetch browser GPS location for the shelter/donor address
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData((prev) => ({
          ...prev,
          lat: Number(latitude.toFixed(5)),
          lng: Number(longitude.toFixed(5)),
          address: prev.address || `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        }));
        toast.success('Exact coordinates captured successfully!');
        setDetectingLocation(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        toast.error('Could not get GPS. Default metropolitan area coordinates will be used.');
        setDetectingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.address.trim()) {
        throw new Error('Please provide your shelter / facility address.');
      }

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role, // strictly 'donor' or 'rescuer'
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        organizationType: formData.organizationType,
        location: {
          address: formData.address.trim(),
          city: formData.city.trim(),
          ...(formData.lat && formData.lng && { lat: formData.lat, lng: formData.lng }),
        },
      };

      if (role === 'rescuer') {
        if (formData.acceptedTypes.length === 0) {
          throw new Error('Please select at least one accepted food category.');
        }
        payload.acceptedTypes = formData.acceptedTypes;
        payload.availableCapacity = Number(formData.availableCapacity) || 20;
        payload.acceptRadiusKm = Number(formData.acceptRadiusKm) || 10;
        payload.pickupWindowStart = formData.pickupWindowStart;
        payload.pickupWindowEnd = formData.pickupWindowEnd;
      }

      const response = await axios.post('/api/auth/register', payload);
      const { token, user } = response.data;

      if (!token) {
        throw new Error('Registration succeeded, but no token was provided.');
      }

      // Store JWT in localStorage
      setAuthSession(token, user);

      // Determine user role and redirect
      const decoded = decodeToken(token);
      const assignedRole = user?.role || decoded?.role || role;

      toast.success(`Account created! Welcome to Surplus to Shelter, ${user?.name || ''}`);

      if (assignedRole === 'donor') {
        navigate('/donor');
      } else if (assignedRole === 'rescuer') {
        navigate('/rescuer');
      } else if (assignedRole === 'admin') {
        navigate('/admin');
      } else {
        const redirectPath = getRoleHomeRoute(assignedRole);
        navigate(redirectPath);
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'Registration failed. Please check your information.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
          <span className="w-9 h-9 rounded-xl bg-[#1F7A4D] flex items-center justify-center text-white font-bold text-base shadow-xs">
            S
          </span>
          <span className="font-semibold text-xl tracking-tight text-[#1F2937]">
            Surplus to Shelter
          </span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2937]">
          Create an account
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-stone-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#1F7A4D] hover:underline">
            Log in here
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-5 sm:px-8 rounded-2xl border border-stone-200/70 shadow-sm">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-2.5">
              Select Your Account Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('donor')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  role === 'donor'
                    ? 'border-[#1F7A4D] bg-[#E8F5EE] ring-1 ring-[#1F7A4D] shadow-xs'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-[#1F2937]">
                      🍲 Food Donor
                    </span>
                    {role === 'donor' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1F7A4D]" />
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-snug">
                    Post surplus meals from restaurants, grocery stores & caterers.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('rescuer')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  role === 'rescuer'
                    ? 'border-[#1F7A4D] bg-[#E8F5EE] ring-1 ring-[#1F7A4D] shadow-xs'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-[#1F2937]">
                      🏢 Food Rescuer (Shelter / Pantry)
                    </span>
                    {role === 'rescuer' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1F7A4D]" />
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-snug">
                    Apply for food aid, specify required quantity ranges, and receive mapped deliveries.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
              >
                {role === 'donor' ? 'Food Donor / Business Name' : 'Shelter / Rescue Organization Name'}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder={role === 'donor' ? 'e.g. Green Leaf Bakery' : 'e.g. Hope Community Shelter'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
              />
            </div>

            {role === 'rescuer' && (
              <div>
                <label
                  htmlFor="organizationType"
                  className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
                >
                  Organization Category
                </label>
                <select
                  id="organizationType"
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] bg-white focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
                >
                  {SHELTER_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
                >
                  Contact Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
              />
            </div>

            {/* Address & Geolocation for Map Plotting */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="address"
                  className="block text-xs sm:text-sm font-semibold text-[#1F2937]"
                >
                  {role === 'rescuer' ? 'Shelter / Intake Facility Address' : 'Facility / Pickup Address'}
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingLocation}
                  className="text-[11px] font-semibold text-[#1F7A4D] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {detectingLocation ? '📍 Detecting...' : '📍 Use GPS Pin'}
                </button>
              </div>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Community Ave, Suite 4B, Metro City"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
              />
              {formData.lat && formData.lng && (
                <div className="mt-1 text-[11px] text-[#1F7A4D] font-medium flex items-center gap-1">
                  <span>✓ Map Pin Coordinates:</span>
                  <span className="font-mono">{formData.lat}, {formData.lng}</span>
                </div>
              )}
            </div>

            {/* Rescuer-Specific Fields */}
            {role === 'rescuer' && (
              <div className="pt-4 border-t border-stone-100 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-2">
                    Accepted Food Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FOOD_TYPES.map((type) => {
                      const selected = formData.acceptedTypes.includes(type.id);
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleFoodType(type.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            selected
                              ? 'bg-[#1F7A4D] text-white border-[#1F7A4D] shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="availableCapacity"
                      className="block text-xs font-semibold text-stone-600 mb-1"
                    >
                      Shelter Intake Capacity (meals / kg)
                    </label>
                    <input
                      id="availableCapacity"
                      name="availableCapacity"
                      type="number"
                      min="1"
                      value={formData.availableCapacity}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="acceptRadiusKm"
                      className="block text-xs font-semibold text-stone-600 mb-1"
                    >
                      Maximum Delivery Distance (km)
                    </label>
                    <input
                      id="acceptRadiusKm"
                      name="acceptRadiusKm"
                      type="number"
                      min="1"
                      value={formData.acceptRadiusKm}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="pickupWindowStart"
                      className="block text-xs font-semibold text-stone-600 mb-1"
                    >
                      Intake Receiving Window Starts
                    </label>
                    <input
                      id="pickupWindowStart"
                      name="pickupWindowStart"
                      type="time"
                      value={formData.pickupWindowStart}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pickupWindowEnd"
                      className="block text-xs font-semibold text-stone-600 mb-1"
                    >
                      Intake Receiving Window Ends
                    </label>
                    <input
                      id="pickupWindowEnd"
                      name="pickupWindowEnd"
                      type="time"
                      value={formData.pickupWindowEnd}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-bold text-xs sm:text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Join as {role === 'donor' ? 'Food Donor' : 'Food Rescuer (Shelter)'}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
