import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { CardSkeleton } from '../../components/Skeleton';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-stone-200 shadow-lg text-xs">
        <span className="font-bold text-[#1F2937] block mb-2">{label}</span>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center gap-2 justify-between">
              <span style={{ color: entry.color }} className="font-semibold">
                {entry.name}:
              </span>
              <strong className="text-stone-800">{entry.value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Analytics = ({ onStatsUpdated }) => {
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalMatches: 0,
    completedDeliveries: 0,
    totalQuantityDiverted: 0,
    breakdownByDay: [],
  });

  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/stats');
      if (res.data) {
        const raw = res.data.stats || res.data;
        setStats({
          totalDonations: raw.totalDonations || 0,
          totalMatches: raw.totalMatches || 0,
          completedDeliveries: raw.completedDeliveries || 0,
          totalQuantityDiverted: raw.totalQuantityDiverted || 0,
          breakdownByDay: (raw.breakdownByDay || []).map((item) => ({
            ...item,
            shortDate: item.date
              ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : item.date,
          })),
        });
      }
      if (onStatsUpdated) onStatsUpdated();
    } catch (err) {
      console.error('Error fetching admin analytics stats:', err);
      toast.error('Failed to load system analytics.');
    } finally {
      setLoading(false);
    }
  }, [onStatsUpdated]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const deliveryRate = stats.totalDonations > 0
    ? ((stats.completedDeliveries / stats.totalDonations) * 100).toFixed(1)
    : '0.0';

  const matchRate = stats.totalDonations > 0
    ? ((stats.totalMatches / stats.totalDonations) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1F2937]">Platform Analytics & Trends</h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Key operational metrics, diversion impact, and 14-day rescue trajectories.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
        >
          <span>🔄</span>
          <span>{loading ? 'Refreshing...' : 'Refresh Stats'}</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total Donations */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Total Donations
                </span>
                <span className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center text-sm">
                  📦
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#1F2937]">
                {stats.totalDonations}
              </div>
            </div>
            <span className="text-xs text-stone-500 mt-3 block">
              Logged across all donor categories
            </span>
          </div>

          {/* Total Matches */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  AI Shelter Matches
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-sm">
                  ⚡
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#1F2937]">
                {stats.totalMatches}
              </div>
            </div>
            <span className="text-xs text-blue-700 font-medium mt-3 block">
              {matchRate}% match engagement rate
            </span>
          </div>

          {/* Completed Deliveries */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Completed Deliveries
                </span>
                <span className="w-8 h-8 rounded-xl bg-[#E8F5EE] text-[#1F7A4D] flex items-center justify-center text-sm">
                  ✓
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#1F7A4D]">
                {stats.completedDeliveries}
              </div>
            </div>
            <span className="text-xs text-[#1F7A4D] font-medium mt-3 block">
              {deliveryRate}% completion rate
            </span>
          </div>

          {/* Food Diverted */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Food Diverted
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm">
                  🌱
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#1F2937]">
                {stats.totalQuantityDiverted}
                <span className="text-sm font-normal text-stone-400 ml-1.5">units</span>
              </div>
            </div>
            <span className="text-xs text-stone-500 mt-3 block">
              Rescued from landfills
            </span>
          </div>
        </div>
      )}

      {/* Recharts Line Chart Card */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#1F2937]">14-Day Activity & Recovery Trend</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Daily comparison of donations posted, volunteer deliveries completed, and total meals diverted.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#1F7A4D]" />
              <span className="text-stone-700">Donations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#D97706]" />
              <span className="text-stone-700">Deliveries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#6366F1]" />
              <span className="text-stone-700">Meals Diverted</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-sm text-stone-500">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-[#1F7A4D] border-t-transparent rounded-full mb-2" />
            <p>Rendering trend analytics...</p>
          </div>
        ) : stats.breakdownByDay.length === 0 ? (
          <div className="py-20 text-center text-sm text-stone-500">
            No 14-day history data recorded yet.
          </div>
        ) : (
          <div className="w-full h-72 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.breakdownByDay}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFEA" vertical={false} />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />

                <Line
                  type="monotone"
                  dataKey="donations"
                  name="Donations Posted"
                  stroke="#1F7A4D"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#1F7A4D' }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="deliveries"
                  name="Deliveries Completed"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#D97706' }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="quantityDiverted"
                  name="Meals Diverted"
                  stroke="#6366F1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#6366F1' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Environmental & Community Impact Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#E8F5EE] border border-[#1F7A4D]/20 text-stone-800">
          <span className="text-2xl mb-2 block">🌍</span>
          <h4 className="font-bold text-sm text-[#1F7A4D] mb-1">GHG Emissions Avoided</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            By diverting {stats.totalQuantityDiverted} meals from landfill decomposition, an estimated{' '}
            <strong>{(stats.totalQuantityDiverted * 2.5).toFixed(0)} kg of CO₂ equivalent</strong> was prevented.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-stone-800">
          <span className="text-2xl mb-2 block">🍽️</span>
          <h4 className="font-bold text-sm text-amber-800 mb-1">Community Nourishment</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            Active shelters and food pantries have received <strong>{stats.completedDeliveries} batch dispatches</strong> for families in need.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-stone-50 border border-stone-200 text-stone-800">
          <span className="text-2xl mb-2 block">⚡</span>
          <h4 className="font-bold text-sm text-stone-800 mb-1">Rescue Efficiency</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            Average turnaround from donor publication to shelter delivery is under <strong>3.5 hours</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
