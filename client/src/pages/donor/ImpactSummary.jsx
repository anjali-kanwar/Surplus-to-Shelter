import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { CardSkeleton } from '../../components/Skeleton';

const ImpactSummary = () => {
  const user = getUser() || {};
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const [certLoading, setCertLoading] = useState(false);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/donations/my');
      setDonations(response.data?.donations || []);
    } catch (err) {
      console.error('Error fetching donations for impact summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleOpenCertificate = async () => {
    setCertLoading(true);
    setCertModalOpen(true);
    try {
      const res = await api.get('/api/donations/tax-certificate');
      if (res.data?.certificate) {
        setCertificateData(res.data.certificate);
      }
    } catch (err) {
      console.error('Error fetching tax certificate:', err);
      toast.error('Failed to generate tax certificate.');
    } finally {
      setCertLoading(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  // Compute stat metrics
  const stats = useMemo(() => {
    const totalDonations = donations.length;
    const deliveredDonations = donations.filter((d) => d.status === 'delivered');
    const quantityDiverted = deliveredDonations.reduce(
      (sum, d) => sum + (Number(d.quantity) || 0),
      0
    );
    const totalQuantityOffered = donations.reduce(
      (sum, d) => sum + (Number(d.quantity) || 0),
      0
    );
    const creditPoints = user?.creditPoints ?? quantityDiverted;
    const estimatedTaxDeductionUSD = (quantityDiverted * 2.50).toFixed(2);
    const co2KgAvoided = (quantityDiverted * 2.5).toFixed(1);

    return {
      totalDonations,
      quantityDiverted,
      totalQuantityOffered,
      creditPoints,
      estimatedTaxDeductionUSD,
      co2KgAvoided,
    };
  }, [donations, user]);

  const chartData = useMemo(() => {
    if (!donations || donations.length === 0) {
      const sampleDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return sampleDays.map((day) => ({
        date: day,
        quantity: 0,
        delivered: 0,
      }));
    }

    const grouped = {};
    donations.forEach((d) => {
      const dateKey = d.createdAt
        ? new Date(d.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : 'Unknown';

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          quantity: 0,
          delivered: 0,
        };
      }
      grouped[dateKey].quantity += Number(d.quantity) || 0;
      if (d.status === 'delivered') {
        grouped[dateKey].delivered += Number(d.quantity) || 0;
      }
    });

    return Object.values(grouped).slice(-10);
  }, [donations]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Title & Tax Certificate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1F2937]">Community Impact & Tax Reporting</h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Track your surplus food diversion, earned credit tokens, and official tax documentation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCertificate}
          className="px-4 py-2.5 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <span>📄</span>
          <span>Generate Tax Certificate</span>
        </button>
      </div>

      {/* 4 Main Stat Cards */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total Donations */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Total Batches
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#1F2937] mt-1">
                {stats.totalDonations}
              </div>
            </div>
            <div className="mt-4 text-xs text-stone-500 font-medium">
              Food batches posted to platform
            </div>
          </div>

          {/* Quantity Diverted */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#1F7A4D] mb-1">
                Quantity Diverted
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#1F7A4D] mt-1">
                {stats.quantityDiverted}
                <span className="text-sm font-normal text-stone-500 ml-1.5">
                  units
                </span>
              </div>
            </div>
            <div className="mt-4 text-xs text-stone-500 font-medium">
              {stats.totalQuantityOffered} units total offered
            </div>
          </div>

          {/* Credit Points */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Credit Tokens Earned
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#1F2937] mt-1 flex items-center gap-1.5">
                <span>{stats.creditPoints}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#1F7A4D] font-semibold">
                  Verified
                </span>
              </div>
            </div>
            <div className="mt-4 text-xs text-stone-500 font-medium">
              1 token earned per meal delivered
            </div>
          </div>

          {/* Tax Write-Off Value */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                Est. Tax Credit Value
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-800 mt-1">
                ${stats.estimatedTaxDeductionUSD}
              </div>
            </div>
            <div className="mt-4 text-xs text-stone-500 font-medium">
              IRS 501(c)(3) fair-market valuation
            </div>
          </div>
        </div>
      )}

      {/* Recharts Bar Chart Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-8 border border-stone-200/70 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#1F2937]">
              Food Donation Activity Over Time
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Quantity of food donated (units) per date
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#1F7A4D]"></span> Total Donated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#99D1B3]"></span> Delivered
            </span>
          </div>
        </div>

        <div className="w-full h-72 sm:h-80">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-stone-400">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-[#1F7A4D] border-t-transparent rounded-full mb-2" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#FAF9F6' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm text-xs">
                          <p className="font-bold text-[#1F2937] mb-1">{label}</p>
                          <p className="text-[#1F7A4D]">
                            Total Quantity: <span className="font-semibold">{payload[0]?.value}</span>
                          </p>
                          {payload[1] && (
                            <p className="text-stone-600">
                              Delivered: <span className="font-semibold">{payload[1]?.value}</span>
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="quantity"
                  fill="#1F7A4D"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="delivered"
                  fill="#99D1B3"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Official Tax Certificate Modal */}
      {certModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-2xl w-full p-6 sm:p-10 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setCertModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-2 text-sm font-bold"
            >
              ✕
            </button>

            {certLoading || !certificateData ? (
              <div className="py-16 text-center text-sm text-stone-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-[#1F7A4D] border-t-transparent rounded-full mb-2" />
                <p>Generating verified 501(c)(3) tax documentation...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Certificate Border & Header */}
                <div className="border-4 border-double border-[#1F7A4D]/40 p-6 sm:p-8 rounded-2xl bg-[#FAF9F6]">
                  <div className="text-center pb-6 border-b border-stone-200">
                    <div className="w-12 h-12 rounded-xl bg-[#1F7A4D] text-white flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-xs">
                      S
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#1F7A4D]">
                      Surplus to Shelter Network
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1F2937] mt-1">
                      Official Tax Exemption & Impact Certificate
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      Certificate ID: <span className="font-mono font-bold text-stone-800">{certificateData.certificateId}</span>
                    </p>
                  </div>

                  <div className="py-6 space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
                    <p>
                      This certifies that <strong>{certificateData.donorName}</strong> ({certificateData.donorEmail}) has contributed verified surplus food through the Surplus to Shelter Network during Tax Year <strong>{certificateData.taxYear}</strong>.
                    </p>

                    {/* Stats table */}
                    <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-stone-200 text-xs">
                      <div>
                        <span className="text-stone-400 block">Total Food Diverted</span>
                        <strong className="text-sm text-[#1F2937]">{certificateData.totalQuantityUnits} meals / kg</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Credit Tokens Awarded</span>
                        <strong className="text-sm text-[#1F7A4D]">{certificateData.creditPointsBalance} pts</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">CO₂ Emissions Prevented</span>
                        <strong className="text-sm text-stone-800">{certificateData.co2KgAvoided} kg CO₂e</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Estimated Tax Deductible Value</span>
                        <strong className="text-sm text-amber-800">${certificateData.estimatedDeductionValueUSD} USD</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-500 italic">
                      Qualifies under IRS Section 170(e)(3) for enhanced charitable food inventory tax deduction. Verified non-profit community distribution.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
                    <div>
                      <span className="block font-bold text-stone-700">Digital Seal:</span>
                      <span className="font-mono text-[10px] text-stone-400">{certificateData.verificationSeal}</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold text-[#1F7A4D]">✓ Status Verified</span>
                      <span className="text-[10px]">{new Date(certificateData.issuedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCertModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintCertificate}
                    className="px-6 py-2.5 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
                  >
                    <span>🖨️</span>
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpactSummary;
