import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const STATUS_CONFIG = {
  posted: {
    label: 'Posted / Searching',
    className: 'bg-amber-50 text-amber-800 border border-amber-200',
  },
  matched: {
    label: 'Rescuer Matched',
    className: 'bg-blue-50 text-blue-800 border border-blue-200',
  },
  pickup_confirmed: {
    label: 'In Transit (Picked Up)',
    className: 'bg-purple-50 text-purple-800 border border-purple-200',
  },
  delivered: {
    label: 'Delivered to Shelter',
    className: 'bg-[#E8F5EE] text-[#1F7A4D] border border-[#1F7A4D]/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-50 text-red-800 border border-red-200',
  },
};

const DonationHistory = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDonations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/donations/my');
      setDonations(response.data?.donations || []);
    } catch (err) {
      console.error('Error fetching donation history:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const filteredDonations = donations.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-6 sm:p-8">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1F2937]">Donation History</h2>
          <p className="text-sm text-stone-600 mt-0.5">
            Track real-time status of your surplus donations from posting to delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium text-[#1F2937] bg-white focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
          >
            <option value="all">All Statuses ({donations.length})</option>
            <option value="posted">Posted</option>
            <option value="matched">Matched</option>
            <option value="pickup_confirmed">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="expired">Expired</option>
          </select>

          <button
            onClick={fetchDonations}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Content list */}
      {loading ? (
        <div className="py-16 text-center text-sm text-stone-500">
          Loading donation records...
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            ?
          </div>
          <p className="text-base font-medium text-[#1F2937] mb-1">
            No donations found
          </p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `No donations found with status "${statusFilter}". Try changing your filter.`
              : 'You have not posted any donations yet. Go to "Post Donation" to create your first batch!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDonations.map((donation) => {
            const statusConfig = STATUS_CONFIG[donation.status] || {
              label: donation.status,
              className: 'bg-stone-100 text-stone-700',
            };

            return (
              <div
                key={donation._id}
                className="p-5 rounded-xl border border-stone-200/80 hover:border-stone-300 transition-colors bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left details */}
                <div className="flex items-start gap-4">
                  {donation.photoUrl && (
                    <img
                      src={donation.photoUrl}
                      alt={donation.foodType}
                      className="w-16 h-16 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                    />
                  )}

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <span className="font-bold text-sm text-[#1F2937] capitalize">
                        {donation.foodType?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-stone-400">•</span>
                      <span className="text-xs font-semibold text-[#1F7A4D] bg-[#E8F5EE] px-2 py-0.5 rounded-md">
                        {donation.quantity} units
                      </span>
                      <span className="text-xs text-stone-400">•</span>
                      <span className="text-xs text-stone-500">
                        Posted {formatDate(donation.createdAt)}
                      </span>
                    </div>

                    {donation.description && (
                      <p className="text-xs text-stone-600 line-clamp-2 mb-1.5">
                        {donation.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
                      <span>
                        Expires:{' '}
                        <strong className="font-medium text-stone-700">
                          {formatDate(donation.expiryAt)}
                        </strong>
                      </span>
                      {donation.location?.address && (
                        <span>
                          Pickup:{' '}
                          <strong className="font-medium text-stone-700">
                            {donation.location.address}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right status badge + match info */}
                <div className="flex flex-col md:items-end justify-between gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.className}`}
                  >
                    {statusConfig.label}
                  </span>

                  {donation.match?.rescuer?.name && (
                    <span className="text-xs text-stone-500">
                      Rescuer:{' '}
                      <strong className="text-[#1F2937]">
                        {donation.match.rescuer.name}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonationHistory;
