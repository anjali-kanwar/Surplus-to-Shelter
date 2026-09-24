import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { TableSkeleton } from '../../components/Skeleton';

const AllActivity = ({ onActivityUpdated }) => {
  const [activity, setActivity] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/all-activity?page=${targetPage}&limit=${targetLimit}`);
      const data = res.data?.activity || res.data?.donations || res.data?.data || [];
      setActivity(data);
      setTotal(res.data?.total || data.length);
      setTotalPages(res.data?.totalPages || 1);
      setPage(res.data?.page || targetPage);
      if (onActivityUpdated) onActivityUpdated();
    } catch (err) {
      console.error('Error fetching admin all activity:', err);
      toast.error('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, onActivityUpdated]);

  useEffect(() => {
    fetchActivity(page, limit);
  }, [page, limit, fetchActivity]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    setPage(1);
  };

  const filteredActivity = activity.filter((item) => {
    const foodType = (item.foodType || '').toLowerCase();
    const donorName = (item.donor?.name || '').toLowerCase();
    const rescuerName = (item.match?.rescuer?.name || '').toLowerCase();
    const status = (item.status || item.matchStatus || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      !query ||
      foodType.includes(query) ||
      donorName.includes(query) ||
      rescuerName.includes(query) ||
      item._id.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' ||
      status === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (item) => {
    const status = item.status || item.matchStatus || 'posted';
    switch (status) {
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#1F7A4D] border border-[#1F7A4D]/20 whitespace-nowrap">
            ✓ Delivered to Shelter
          </span>
        );
      case 'picked_up':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
            🚚 Courier In Transit
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            📍 Confirmed by Shelter
          </span>
        );
      case 'matched':
      case 'pending_confirmation':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
            ⚡ Awaiting Confirmation
          </span>
        );
      case 'rejected':
      case 'expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200 whitespace-nowrap">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#1F2937]">Platform All Activity</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
              {total} Total Donations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Audit-log and live tracking of every surplus food donation and rescue dispatch.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchActivity(page, limit)}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
        >
          <span>🔄</span>
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="sm:col-span-2">
          <input
            type="text"
            placeholder="Search by food type, donor name, rescuer, or donation ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-[#1F2937] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] bg-[#FAF9F6]"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] bg-[#FAF9F6]"
          >
            <option value="all">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="picked_up">In Transit</option>
            <option value="confirmed">Confirmed</option>
            <option value="matched">Matched (Pending)</option>
            <option value="posted">Posted / Open</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Donation / ID</th>
                <th className="py-3 px-4">Category & Qty</th>
                <th className="py-3 px-4">Donor</th>
                <th className="py-3 px-4">Recipient Shelter</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expiry Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredActivity.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-stone-500">
                    No activity found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredActivity.map((item) => {
                  const donor = item.donor || {};
                  const rescuer = item.match?.rescuer || {};

                  return (
                    <tr key={item._id} className="hover:bg-stone-50/70 transition-colors">
                      {/* ID & Timestamp */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="font-bold text-[#1F2937] block">
                          #{item._id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-stone-400 text-[11px] block mt-0.5">
                          {formatDate(item.createdAt)}
                        </span>
                      </td>

                      {/* Category & Quantity */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#1F2937] capitalize block">
                          {item.foodType?.replace(/_/g, ' ') || 'Food batch'}
                        </span>
                        <span className="text-stone-500 text-xs">
                          {item.quantity} units / meals
                        </span>
                      </td>

                      {/* Donor */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#1F2937] block">
                          {donor.name || 'Donor'}
                        </span>
                        <span className="text-stone-400 text-[11px] block">
                          {donor.phone || donor.email || 'No contact'}
                        </span>
                      </td>

                      {/* Rescuer */}
                      <td className="py-3.5 px-4">
                        {rescuer.name ? (
                          <div>
                            <span className="font-medium text-[#1F2937] block">
                              {rescuer.name}
                            </span>
                            <span className="text-stone-400 text-[11px] block">
                              {rescuer.phone || rescuer.email || 'Assigned'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic text-xs">
                            {item.match ? 'Pending Acceptance' : 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(item)}
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4 text-xs text-stone-600">
                        {formatDate(item.expiryAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-100 text-xs text-stone-600">
        <div className="flex items-center gap-3">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={handleLimitChange}
            className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-stone-400">
            Page {page} of {totalPages} ({total} items)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3.5 py-2 rounded-xl border border-stone-300 font-semibold text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Previous
          </button>

          <span className="px-3 py-1.5 font-bold text-xs bg-[#E8F5EE] text-[#1F7A4D] rounded-lg">
            {page}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-3.5 py-2 rounded-xl border border-stone-300 font-semibold text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllActivity;
