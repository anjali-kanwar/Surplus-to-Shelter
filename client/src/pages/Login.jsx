import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { setAuthSession, decodeToken, getRoleHomeRoute } from '../utils/auth';

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        email: formData.email.trim(),
        password: formData.password,
      });

      const { token, user } = response.data;

      if (!token) {
        throw new Error('No token received from server.');
      }

      // Store JWT and user session
      setAuthSession(token, user);

      // Determine user role from user object or decoded JWT
      const decoded = decodeToken(token);
      const role = user?.role || decoded?.role;

      toast.success(`Welcome back, ${user?.name || 'User'}!`);

      // Redirect based on role
      if (role === 'donor') {
        navigate('/donor');
      } else if (role === 'rescuer') {
        navigate('/rescuer');
      } else if (role === 'admin') {
        navigate('/admin');
      } else {
        const redirectPath = getRoleHomeRoute(role);
        navigate(redirectPath);
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'Invalid email or password. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
          <span className="w-9 h-9 rounded-xl bg-[#1F7A4D] flex items-center justify-center text-white font-bold text-base shadow-xs">
            S
          </span>
          <span className="font-semibold text-xl tracking-tight text-[#1F2937]">
            Surplus to Shelter
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-[#1F2937]">
          Log in to your account
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-stone-600">
          Or{' '}
          <Link to="/signup" className="font-semibold text-[#1F7A4D] hover:underline">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 rounded-2xl border border-stone-200/70 shadow-sm">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                htmlFor="password"
                className="block text-xs sm:text-sm font-semibold text-[#1F2937] mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-xs sm:text-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-semibold text-xs sm:text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>

          {/* Sample Credentials for easy testing */}
          <div className="mt-6 pt-5 border-t border-stone-100 text-center text-xs text-stone-500 space-y-2">
            <p className="font-semibold text-stone-700">Sample Admin Credentials for Testing:</p>
            <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-stone-200 text-left text-[11px] font-mono space-y-1">
              <div>Email: <span className="font-bold text-stone-800">admin@foodrescue.org</span></div>
              <div>Password: <span className="font-bold text-stone-800">AdminPassword123!</span></div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ email: 'admin@foodrescue.org', password: 'AdminPassword123!' })}
              className="text-xs font-semibold text-[#1F7A4D] hover:underline"
            >
              Fill Admin Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
