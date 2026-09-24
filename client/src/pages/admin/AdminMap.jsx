import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Custom Map Marker HTML Icons
const createRescuerRequestIcon = (urgency) => {
  const isUrgent = urgency === 'urgent';
  const pulseClass = isUrgent ? 'map-pulse-purple' : 'map-pulse-purple';
  const bgColor = isUrgent ? '#DC2626' : '#9333EA';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div class="${pulseClass}" style="width: 32px; height: 32px; border-radius: 9999px; background-color: ${bgColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; color: white; font-size: 14px; font-weight: bold;">
          🥣
        </div>
        ${
          isUrgent
            ? '<span style="position: absolute; top: -6px; right: -6px; background-color: #EF4444; color: white; font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 9999px; border: 1px solid white;">URGENT</span>'
            : ''
        }
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

const createDonationIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div class="map-pulse-green" style="width: 30px; height: 30px; border-radius: 9999px; background-color: #1F7A4D; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white; color: white; font-size: 14px;">
          🍲
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
};

const createShelterBaseIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="width: 26px; height: 26px; border-radius: 8px; background-color: #2563EB; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 2px solid white; color: white; font-size: 12px;">
        🏢
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
};

const AdminMap = ({ onDataUpdated }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerGroupRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState({
    foodRequests: [],
    donations: [],
    rescuers: [],
    all: [],
  });

  const [filter, setFilter] = useState('all'); // 'all' | 'requests' | 'donations' | 'urgent'
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/map-locations');
      if (res.data?.locations) {
        setLocations(res.data.locations);
      }
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error('Error fetching admin map locations:', err);
      toast.error('Failed to load live map locations.');
    } finally {
      setLoading(false);
    }
  }, [onDataUpdated]);

  // Initial load
  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [40.7128, -74.006],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers whenever locations or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current) return;

    const map = mapInstanceRef.current;
    const group = markersLayerGroupRef.current;
    group.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    // Filter items
    let itemsToRender = [];
    if (filter === 'all') {
      itemsToRender = locations.all || [];
    } else if (filter === 'requests') {
      itemsToRender = locations.foodRequests || [];
    } else if (filter === 'donations') {
      itemsToRender = locations.donations || [];
    } else if (filter === 'urgent') {
      itemsToRender = (locations.foodRequests || []).filter((r) => r.urgency === 'urgent');
    }

    itemsToRender.forEach((item) => {
      if (!item.lat || !item.lng) return;

      const latLng = [item.lat, item.lng];
      bounds.extend(latLng);
      hasPoints = true;

      let icon;
      if (item.type === 'food_request') {
        icon = createRescuerRequestIcon(item.urgency, item.status);
      } else if (item.type === 'donation') {
        icon = createDonationIcon();
      } else {
        icon = createShelterBaseIcon();
      }

      const marker = L.marker(latLng, { icon }).addTo(group);

      // Popup Content
      const popupHtml = document.createElement('div');
      popupHtml.className = 'p-3 text-stone-800 text-xs font-sans max-w-xs';
      
      let badgeColor = 'bg-purple-100 text-purple-800';
      let typeLabel = '🥣 Rescuer Food Request';
      if (item.type === 'donation') {
        badgeColor = 'bg-emerald-100 text-emerald-800';
        typeLabel = '🍲 Surplus Donation';
      } else if (item.type === 'rescuer_shelter') {
        badgeColor = 'bg-blue-100 text-blue-800';
        typeLabel = '🏢 Shelter Base';
      }

      popupHtml.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2 border-b border-stone-100 pb-1.5">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}">${typeLabel}</span>
            <span class="text-[10px] text-stone-500 font-semibold">${item.status || 'Active'}</span>
          </div>
          <h4 class="font-bold text-sm text-stone-900 leading-tight">${item.title}</h4>
          <p class="text-[11px] text-stone-600 flex items-start gap-1">
            <span>📍</span>
            <span>${item.address}</span>
          </p>
          ${
            item.quantityRange
              ? `<div class="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span class="block text-[10px] text-stone-500 font-semibold uppercase">Requested Range</span>
                  <strong class="text-xs text-purple-800 font-bold">${item.quantityRange}</strong>
                </div>`
              : ''
          }
          ${
            item.quantity
              ? `<div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span class="block text-[10px] text-emerald-700 font-semibold uppercase">Available Quantity</span>
                  <strong class="text-xs text-emerald-900 font-bold">${item.quantity} units (${item.foodType || ''})</strong>
                </div>`
              : ''
          }
          ${
            item.contact
              ? `<div class="text-[10px] text-stone-500 pt-1">
                  <span>Contact: <strong>${item.contact.name || ''}</strong> (${item.contact.phone || item.contact.email || 'N/A'})</span>
                </div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        setSelectedMarker(item);
      });
    });

    if (hasPoints && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [locations, filter]);

  const handleApproveRequest = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      await api.patch(`/api/admin/food-requests/${requestId}/status`, {
        status: 'approved',
      });
      toast.success('Food request approved! Active for surplus matching.');
      await fetchMapData();
    } catch (err) {
      console.error('Error approving food request:', err);
      toast.error('Failed to approve request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const urgentCount = (locations.foodRequests || []).filter((r) => r.urgency === 'urgent').length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <h2 className="text-xl font-bold text-[#1F2937]">Live Impact Map & Shelter Requests</h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Real-time geospatial visualization of rescuer food applications, donor surplus batches, and active relief hubs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMapData}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 shadow-xs flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Refresh Map</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-stone-500">Rescuer Applications</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-900">
            {locations.foodRequests?.length || 0}
          </div>
          <span className="text-[11px] text-stone-500">Shelters awaiting food aid</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-stone-500">Surplus Food Posts</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F7A4D]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#1F7A4D]">
            {locations.donations?.length || 0}
          </div>
          <span className="text-[11px] text-stone-500">Available food donations</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-stone-500">Urgent Demands</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-600">
            {urgentCount}
          </div>
          <span className="text-[11px] text-stone-500">Immediate priority response</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-stone-500">Total Map Pins</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-900">
            {locations.all?.length || 0}
          </div>
          <span className="text-[11px] text-stone-500">Active geolocated nodes</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
            filter === 'all'
              ? 'bg-[#1F7A4D] text-white border-[#1F7A4D] shadow-xs'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}
        >
          📍 All Map Pins ({locations.all?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setFilter('requests')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
            filter === 'requests'
              ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}
        >
          🥣 Rescuer Food Applications ({locations.foodRequests?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setFilter('donations')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
            filter === 'donations'
              ? 'bg-[#1F7A4D] text-white border-[#1F7A4D] shadow-xs'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}
        >
          🍲 Donor Surplus ({locations.donations?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setFilter('urgent')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
            filter === 'urgent'
              ? 'bg-red-600 text-white border-red-600 shadow-xs'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}
        >
          🚨 Urgent Only ({urgentCount})
        </button>
      </div>

      {/* Map + Side Info Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leaflet Map Box */}
        <div className="lg:col-span-8 bg-white p-3 rounded-2xl border border-stone-200/80 shadow-sm relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[520px] rounded-xl z-10"
            style={{ minHeight: '520px' }}
          />

          {/* Map Legend Overlay */}
          <div className="absolute bottom-6 left-6 z-[400] bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-stone-200/80 shadow-md text-xs space-y-1.5">
            <span className="font-bold text-stone-900 block mb-1">Map Legend</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
              <span className="text-stone-700">Rescuer Food Request (Need)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1F7A4D] inline-block" />
              <span className="text-stone-700">Donor Surplus Food (Supply)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-blue-600 inline-block" />
              <span className="text-stone-700">Shelter Hub Station</span>
            </div>
          </div>
        </div>

        {/* Selected Pin Details / Quick List */}
        <div className="lg:col-span-4 space-y-4">
          {selectedMarker ? (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                <div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedMarker.type === 'food_request'
                        ? 'bg-purple-100 text-purple-800'
                        : selectedMarker.type === 'donation'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedMarker.category || selectedMarker.type}
                  </span>
                  <h3 className="font-bold text-base text-[#1F2937] mt-1.5">
                    {selectedMarker.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMarker(null)}
                  className="text-stone-400 hover:text-stone-600 text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <div className="text-xs text-stone-600 space-y-2">
                <div className="flex items-start gap-2">
                  <span>📍</span>
                  <span className="font-medium text-stone-800">{selectedMarker.address}</span>
                </div>

                {selectedMarker.lat && selectedMarker.lng && (
                  <div className="text-[11px] text-stone-400 font-mono">
                    Coordinates: [{selectedMarker.lat.toFixed(4)}, {selectedMarker.lng.toFixed(4)}]
                  </div>
                )}

                {selectedMarker.quantityRange && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-purple-700 block">
                      Target Food Demand Range
                    </span>
                    <strong className="text-sm font-bold text-purple-900 block">
                      {selectedMarker.quantityRange}
                    </strong>
                    {selectedMarker.foodTypes && (
                      <p className="text-[11px] text-purple-800">
                        Categories: {selectedMarker.foodTypes.map((t) => t.replace('_', ' ')).join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {selectedMarker.quantity && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                      Available Surplus Quantity
                    </span>
                    <strong className="text-sm font-bold text-emerald-900 block">
                      {selectedMarker.quantity} units ({selectedMarker.foodType})
                    </strong>
                  </div>
                )}

                {selectedMarker.urgency && (
                  <div className="flex items-center justify-between text-xs py-1 border-t border-stone-100">
                    <span className="text-stone-500">Urgency:</span>
                    <span
                      className={`font-bold ${
                        selectedMarker.urgency === 'urgent' ? 'text-red-600' : 'text-stone-700'
                      }`}
                    >
                      {selectedMarker.urgency.toUpperCase()}
                    </span>
                  </div>
                )}

                {selectedMarker.contact && (
                  <div className="pt-2 border-t border-stone-100 text-xs">
                    <span className="block font-bold text-stone-700 mb-1">Coordinator Contact</span>
                    <p className="text-stone-600 font-medium">{selectedMarker.contact.name}</p>
                    <p className="text-stone-500 text-[11px]">{selectedMarker.contact.phone || selectedMarker.contact.email}</p>
                  </div>
                )}
              </div>

              {selectedMarker.type === 'food_request' && selectedMarker.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleApproveRequest(selectedMarker.id)}
                  disabled={actionLoadingId === selectedMarker.id}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white font-bold text-xs transition shadow-sm disabled:opacity-50"
                >
                  {actionLoadingId === selectedMarker.id ? 'Approving...' : '✓ Approve Shelter Request'}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-[#1F2937] pb-2 border-b border-stone-100">
                Active Rescuer Food Applications
              </h3>

              {locations.foodRequests?.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-xs">
                  No active food applications at the moment.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {locations.foodRequests?.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => setSelectedMarker(req)}
                      className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-purple-50/50 hover:border-purple-200 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#1F2937] truncate max-w-[170px]">
                          {req.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            req.urgency === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {req.quantityRange}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate flex items-center gap-1">
                        <span>📍</span>
                        <span>{req.address}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMap;
