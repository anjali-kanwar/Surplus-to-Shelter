import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { setAuthSession, decodeToken, getRoleHomeRoute } from '../utils/auth';

const FOOD_TYPES = [
  { id: 'cooked_meals', label: 'Cooked Meals' },
  { id: 'produce', label: 'Fresh Produce' },
  { id: 'baked_goods', label: 'Baked Goods' },
  { id: 'packaged', label: 'Packaged Food' },
  { id: 'other', label: 'Other Groceries' },
];

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Role can only be 'donor' or 'rescuer'
  const initialRole = searchParams.get('role') === 'rescuer' ? 'rescuer' : 'donor';
  const [role, setRole] = useState(initialRole);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    // Rescuer-specific fields
    acceptedTypes: ['cooked_meals', 'produce'],
    availableCapacity: 50,
    acceptRadiusKm: 15,
    pickupWindowStart: '09:00',
    pickupWindowEnd: '18:00',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const queryRole = searchParams.get('role');
    if (queryRole === 'rescuer' || queryRole === 'donor') {
      setRole(queryRole);
    }
  }, [searchParams]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role, // strictly 'donor' or 'rescuer'
        phone: formData.phone.trim(),
      };

      if (role === 'rescuer') {
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <span className="w-9 h-9 rounded-lg bg-[#1F7A4D] flex items-center justify-center text-white font-bold text-base">
            S
          </span>
          <span className="font-semibold text-xl tracking-tight text-[#1F2937]">
            Surplus to Shelter
          </span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2937]">
          Create an account
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#1F7A4D] hover:underline">
            Log in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-stone-200/70 shadow-sm">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Role Selection: Donor or Rescuer ONLY */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#1F2937] mb-2.5">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setRole('donor')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  role === 'donor'
                    ? 'border-[#1F7A4D] bg-[#E8F5EE] ring-1 ring-[#1F7A4D]'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-[#1F2937]">
                      Food Donor
                    </span>
                    {role === 'donor' && (
                      <span className="w-2 h-2 rounded-full bg-[#1F7A4D]"></span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-snug">
                    Restaurants, supermarkets, caterers & community donors.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('rescuer')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  role === 'rescuer'
                    ? 'border-[#1F7A4D] bg-[#E8F5EE] ring-1 ring-[#1F7A4D]'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-[#1F2937]">
                      Rescue Volunteer
                    </span>
                    {role === 'rescuer' && (
                      <span className="w-2 h-2 rounded-full bg-[#1F7A4D]"></span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-snug">
                    Volunteers & transport drivers delivering meals to shelters.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[#1F2937] mb-1"
              >
                {role === 'donor' ? 'Organization or Donor Name' : 'Full Name'}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder={role === 'donor' ? 'e.g. Green Bakery or John Doe' : 'e.g. Sarah Miller'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#1F2937] mb-1"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#1F2937] mb-1"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-[#1F2937] mb-1"
              >
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] focus:border-transparent text-sm transition"
              />
            </div>

            {/* Rescuer-Specific Fields */}
            {role === 'rescuer' && (
              <div className="pt-4 border-t border-stone-100 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-[#1F7A4D] text-white border-[#1F7A4D]'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="availableCapacity"
                      className="block text-xs font-medium text-stone-600 mb-1"
                    >
                      Vehicle Capacity (meals / kg)
                    </label>
                    <input
                      id="availableCapacity"
                      name="availableCapacity"
                      type="number"
                      min="1"
                      value={formData.availableCapacity}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="acceptRadiusKm"
                      className="block text-xs font-medium text-stone-600 mb-1"
                    >
                      Max Pickup Radius (km)
                    </label>
                    <input
                      id="acceptRadiusKm"
                      name="acceptRadiusKm"
                      type="number"
                      min="1"
                      value={formData.acceptRadiusKm}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="pickupWindowStart"
                      className="block text-xs font-medium text-stone-600 mb-1"
                    >
                      Daily Availability Start
                    </label>
                    <input
                      id="pickupWindowStart"
                      name="pickupWindowStart"
                      type="time"
                      value={formData.pickupWindowStart}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pickupWindowEnd"
                      className="block text-xs font-medium text-stone-600 mb-1"
                    >
                      Daily Availability End
                    </label>
                    <input
                      id="pickupWindowEnd"
                      name="pickupWindowEnd"
                      type="time"
                      value={formData.pickupWindowEnd}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading
                ? 'Creating Account...'
                : `Join as ${role === 'donor' ? 'Food Donor' : 'Rescue Volunteer'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
