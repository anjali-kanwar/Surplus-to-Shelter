import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { TableSkeleton } from '../../components/Skeleton';

const ShelterRequests = ({ onRequestsUpdated }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/food-requests');
      setRequests(res.data?.requests || []);
      if (onRequestsUpdated) onRequestsUpdated();
    } catch (err) {
      console.error('Error fetching admin shelter food requests:', err);
      toast.error('Failed to load shelter food applications.');
    } finally {
      setLoading(false);
    }
  }, [onRequestsUpdated]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (requestId, newStatus) => {
    setActionLoadingId(requestId);
    try {
      await api.patch(`/api/admin/food-requests/${requestId}/status`, {
        status: newStatus,
      });
      toast.success(`Request status updated to ${newStatus}.`);
      await fetchRequests();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.message || 'Failed to update request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const shelter = (r.shelterName || r.rescuer?.name || '').toLowerCase();
    const address = (r.address || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = !query || shelter.includes(query) || address.includes(query);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            ⏳ Pending Admin Review
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            ✓ Approved (In Matching Pool)
          </span>
        );
      case 'matched':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            🎯 Matched with Donation
          </span>
        );
      case 'fulfilled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#1F7A4D] border border-[#1F7A4D]/20">
            🍲 Delivered & Fulfilled
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
            ✕ Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🥣</span>
            <h2 className="text-xl font-bold text-[#1F2937]">Shelter Food Applications</h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Incoming demand applications submitted by community shelters and food pantries.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 shadow-xs flex items-center gap-1.5 w-fit"
        >
          <span>🔄</span>
          <span>Refresh Applications</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pending', 'approved', 'matched', 'fulfilled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap border transition-all ${
                statusFilter === st
                  ? 'bg-[#1F7A4D] text-white border-[#1F7A4D] shadow-xs'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              {st === 'all' ? `All Requests (${requests.length})` : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search shelter or address..."
            className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
          />
        </div>
      </div>

      {/* Content Table / Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16 px-4">
            <span className="text-4xl block mb-2">📋</span>
            <h3 className="font-bold text-sm text-[#1F2937]">No Shelter Applications Found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Rescuer organizations have not submitted any food requests yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Shelter / Organization</th>
                  <th className="py-3.5 px-4">Quantity Range</th>
                  <th className="py-3.5 px-4">Food Categories</th>
                  <th className="py-3.5 px-4">Delivery Address & Coordinates</th>
                  <th className="py-3.5 px-4">Urgency / Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRequests.map((r) => (
                  <tr key={r._id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-[#1F2937] text-xs sm:text-sm">
                        {r.shelterName}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {r.rescuer?.name} • {r.rescuer?.phone || r.rescuer?.email}
                      </div>
                      {r.beneficiariesCount > 0 && (
                        <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                          👥 {r.beneficiariesCount} Beneficiaries
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-stone-900 text-xs sm:text-sm">
                        {r.minQuantity} – {r.maxQuantity} {r.quantityUnit || 'meals'}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {r.foodTypes?.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-medium"
                          >
                            {t.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                      {r.notes && (
                        <p className="text-[10px] text-stone-500 italic mt-1 truncate max-w-xs">
                          "{r.notes}"
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <div className="text-stone-800 font-medium truncate flex items-start gap-1">
                        <span>📍</span>
                        <span>{r.address}</span>
                      </div>
                      {r.location?.lat && r.location?.lng && (
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          [{r.location.lat.toFixed(4)}, {r.location.lng.toFixed(4)}]
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div>
                        {r.urgency === 'urgent' ? (
                          <span className="px-2 py-0.5 rounded font-bold bg-red-100 text-red-700 text-[10px]">
                            🚨 Urgent
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-600 font-semibold capitalize">
                            {r.urgency}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-1">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(r._id, 'approved')}
                            disabled={actionLoadingId === r._id}
                            className="px-2.5 py-1 rounded-lg bg-[#1F7A4D] hover:bg-[#18643e] text-white font-bold text-[11px] transition shadow-xs disabled:opacity-50"
                          >
                            ✓ Approve
                          </button>
                        )}

                        {r.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(r._id, 'fulfilled')}
                            disabled={actionLoadingId === r._id}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-xs disabled:opacity-50"
                          >
                            Mark Fulfilled
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShelterRequests;
