import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const ImpactSummary = () => {
  const user = getUser();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const response = await api.get('/api/donations/my');
        setDonations(response.data?.donations || []);
      } catch (err) {
        console.error('Error fetching donations for impact summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, []);

  // Compute stat metrics
  const stats = useMemo(() => {
    const totalDonations = donations.length;
    
    // Quantity diverted from delivered donations
    const deliveredDonations = donations.filter((d) => d.status === 'delivered');
    const quantityDiverted = deliveredDonations.reduce(
      (sum, d) => sum + (Number(d.quantity) || 0),
      0
    );

    // Total quantity offered across all donations
    const totalQuantityOffered = donations.reduce(
      (sum, d) => sum + (Number(d.quantity) || 0),
      0
    );

    // Credit points: from user profile or calculated
    const creditPoints = user?.creditPoints ?? quantityDiverted;

    return {
      totalDonations,
      quantityDiverted,
      totalQuantityOffered,
      creditPoints,
    };
  }, [donations, user]);

  // Aggregate donation quantities over time for the Recharts bar chart
  const chartData = useMemo(() => {
    if (!donations || donations.length === 0) {
      // Provide default sample days if no donations yet
      const sampleDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return sampleDays.map((day) => ({
        date: day,
        quantity: 0,
        delivered: 0,
      }));
    }

    // Group donations by date (YYYY-MM-DD or Month Day)
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

    // Return chronological array (last 10 dates max)
    return Object.values(grouped).slice(-10);
  }, [donations]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-[#1F2937]">Community Impact Summary</h2>
        <p className="text-sm text-stone-600 mt-0.5">
          See how your surplus food donations prevent waste and feed local shelters.
        </p>
      </div>

      {/* 3 Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Donations */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
              Total Donations
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#1F2937] mt-1">
              {loading ? '...' : stats.totalDonations}
            </div>
          </div>
          <div className="mt-4 text-xs text-stone-500 font-medium">
            Food batches posted to platform
          </div>
        </div>

        {/* Quantity Diverted */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#1F7A4D] mb-1">
              Quantity Diverted
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#1F7A4D] mt-1">
              {loading ? '...' : stats.quantityDiverted}
              <span className="text-base font-normal text-stone-500 ml-1.5">
                units
              </span>
            </div>
          </div>
          <div className="mt-4 text-xs text-stone-500 font-medium">
            {stats.totalQuantityOffered} units total offered
          </div>
        </div>

        {/* Credit Points */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
              Credit Points Earned
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-[#1F2937] mt-1 flex items-center gap-1.5">
              <span>{loading ? '...' : stats.creditPoints}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#1F7A4D] font-semibold">
                Verified
              </span>
            </div>
          </div>
          <div className="mt-4 text-xs text-stone-500 font-medium">
            1 point earned per meal delivered
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/70 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#1F2937]">
              Food Donation Activity Over Time
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Quantity of food donated (units) per date
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#1F7A4D]"></span> Total Donated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#E8F5EE] border border-[#1F7A4D]"></span> Delivered
            </span>
          </div>
        </div>

        <div className="w-full h-72 sm:h-80">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-stone-400">
              Loading impact chart...
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
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
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
    </div>
  );
};

export default ImpactSummary;
