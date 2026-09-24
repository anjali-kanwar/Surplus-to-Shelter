import React from 'react';
import { Link } from 'react-router-dom';
import { getUserRole, getRoleHomeRoute } from '../utils/auth';

const NotFound = () => {
  const currentRole = getUserRole();
  const dashboardLink = currentRole ? getRoleHomeRoute(currentRole) : '/login';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-stone-200/70 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#1F7A4D] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              S
            </span>
            <span className="font-semibold text-lg tracking-tight text-[#1F2937]">
              Surplus to Shelter
            </span>
          </Link>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-12">
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-8 sm:p-12 max-w-lg w-full text-center">
          <span className="text-6xl sm:text-7xl font-black font-mono text-[#1F7A4D] block mb-4 tracking-tighter">
            404
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] mb-3">
            Page Not Found
          </h1>

          <p className="text-sm text-stone-600 mb-8 max-w-sm mx-auto leading-relaxed">
            The page you are looking for doesn't exist, has been moved, or is restricted to other volunteer access roles.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-semibold text-xs shadow-sm transition-all text-center"
            >
              Go to Homepage
            </Link>

            <Link
              to={dashboardLink}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors text-center"
            >
              {currentRole ? `Back to ${currentRole} Dashboard` : 'Log In to Account'}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/70 py-6 text-center text-xs text-stone-500 bg-white">
        Surplus to Shelter • 404 Not Found
      </footer>
    </div>
  );
};

export default NotFound;
