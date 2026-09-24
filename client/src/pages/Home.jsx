import React from 'react';
import { Link } from 'react-router-dom';
import { getUserRole, getRoleHomeRoute, logout } from '../utils/auth';

const Home = () => {
  const currentRole = getUserRole();

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] flex flex-col font-sans">
      {/* Navigation Bar */}
      <header className="border-b border-stone-200/70 bg-[#FAF9F6] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#1F7A4D] flex items-center justify-center text-white font-bold text-sm">
              S
            </span>
            <span className="font-semibold text-lg tracking-tight text-[#1F2937]">
              Surplus to Shelter
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4">
            {currentRole ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getRoleHomeRoute(currentRole)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#1F7A4D] text-white hover:bg-[#18643e] transition-colors"
                >
                  Dashboard ({currentRole})
                </Link>
                <button
                  onClick={() => {
                    logout();
                    window.location.reload();
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-stone-600 hover:text-[#1F2937] transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-stone-700 hover:text-[#1F2937] hover:bg-stone-100/70 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#1F7A4D] text-white hover:bg-[#18643e] transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4 sm:px-6 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F5EE] text-[#1F7A4D] text-xs font-semibold tracking-wide uppercase mb-6">
            <span className="w-2 h-2 rounded-full bg-[#1F7A4D]"></span>
            Community Food Recovery Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#1F2937] leading-[1.15] mb-6">
            Turn surplus food into a shelter's next meal
          </h1>

          <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Connect food donors, community shelters & food rescue organizations with seamless parcel dispatch. Safe, verified, and direct.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup?role=donor"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1F7A4D] text-white font-medium hover:bg-[#18643e] transition-colors shadow-sm"
            >
              Sign Up as Food Donor
            </Link>
            <Link
              to="/signup?role=rescuer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-stone-300 text-[#1F2937] font-medium hover:bg-stone-50 transition-colors shadow-sm"
            >
              Register as Shelter / Rescuer
            </Link>
          </div>
        </section>

        {/* 3-Step How It Works Section */}
        <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1F2937] mb-3">
              How It Works
            </h2>
            <p className="text-stone-600 text-sm sm:text-base">
              A streamlined, three-step journey connecting surplus food providers directly with community shelters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-7 border border-stone-200/70 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] text-[#1F7A4D] font-bold text-sm flex items-center justify-center mb-5">
                  01
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
                  Donors Post Surplus
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Restaurants, caterers, and grocery stores post surplus food details, portions, expiry windows, and pickup location in seconds.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-stone-500 font-medium">
                Instant posting • AI vision inspection
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-7 border border-stone-200/70 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] text-[#1F7A4D] font-bold text-sm flex items-center justify-center mb-5">
                  02
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
                  Smart Match & Parcel Dispatch
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Our system matches donations with shelters based on capacity and dietary preferences. Admin coordinates courier pickup manifests directly with parcel partners.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-stone-500 font-medium">
                Capacity matching • Courier dispatch
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-7 border border-stone-200/70 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] text-[#1F7A4D] font-bold text-sm flex items-center justify-center mb-5">
                  03
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
                  Shelter Intake & Verified OTP
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Shelters receive deliveries and confirm arrival using secure dual 6-digit OTP verification, ensuring complete food safety traceability.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-stone-500 font-medium">
                Dual OTP security • Tax credit certificates
              </div>
            </div>
          </div>
        </section>

        {/* Roles Feature Section */}
        <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-8 border border-stone-200/70 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1F7A4D]">
                For Food Donors
              </span>
              <h3 className="text-xl font-bold text-[#1F2937] mt-2 mb-3">
                Zero Waste, Maximum Community Good
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">
                Prevent edible food from reaching landfills, earn community credit points, and get official IRS 501(c)(3) tax write-off certificates.
              </p>
              <Link
                to="/signup?role=donor"
                className="text-sm font-semibold text-[#1F7A4D] hover:text-[#18643e] inline-flex items-center gap-1"
              >
                Register as a Donor &rarr;
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-stone-200/70 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1F7A4D]">
                For Shelters & Food Rescuers
              </span>
              <h3 className="text-xl font-bold text-[#1F2937] mt-2 mb-3">
                Reliable Surplus Supply for Your Shelter
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">
                Receive matched fresh meals directly at your facility tailored to your dietary guidelines, intake hours, and storage capacity.
              </p>
              <Link
                to="/signup?role=rescuer"
                className="text-sm font-semibold text-[#1F7A4D] hover:text-[#18643e] inline-flex items-center gap-1"
              >
                Register as a Rescuer (Shelter) &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/70 py-8 px-4 sm:px-6 bg-[#FAF9F6] text-center text-xs text-stone-500">
        <p className="mb-1 font-medium text-stone-600">Surplus to Shelter</p>
        <p>Turning surplus food into a shelter's next meal • Verified rescue network</p>
      </footer>
    </div>
  );
};

export default Home;
