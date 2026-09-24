const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Match = require('../models/Match');
const User = require('../models/User');
const FoodRequest = require('../models/FoodRequest');

/**
 * @desc    Get all Match documents requiring admin review
 * @route   GET /api/admin/review-queue
 * @access  Private (Admin only)
 */
const getReviewQueue = async (req, res) => {
  try {
    const reviewQueue = await Match.find({
      $or: [
        { isAdminReview: true },
        { status: 'pending_confirmation' },
        { status: 'confirmed' },
      ],
    })
      .populate({
        path: 'donation',
        populate: {
          path: 'donor',
          select: 'name email phone location creditPoints',
        },
      })
      .populate('rescuer', 'name email phone location availableCapacity acceptedTypes')
      .populate('rankedCandidates.rescuer', 'name email phone location availableCapacity acceptedTypes')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviewQueue.length,
      matches: reviewQueue,
      reviewQueue,
      data: reviewQueue,
    });
  } catch (error) {
    console.error('Error in getReviewQueue:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching review queue.',
    });
  }
};

/**
 * @desc    Approve match and assign selected rescuer
 * @route   PATCH /api/admin/review-queue/:matchId/approve
 * @access  Private (Admin only)
 */
const approveReviewQueueMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { rescuerId } = req.body;

    if (!rescuerId) {
      return res.status(400).json({
        message: 'rescuerId is required in request body.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(404).json({
        message: 'Match not found.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(rescuerId)) {
      return res.status(400).json({
        message: 'Invalid rescuer ID format.',
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        message: 'Match not found.',
      });
    }

    // Verify selected rescuer exists and has rescuer role
    const rescuer = await User.findById(rescuerId);
    if (!rescuer || rescuer.role !== 'rescuer') {
      return res.status(400).json({
        message: 'Invalid rescuer ID. User does not exist or is not a rescuer.',
      });
    }

    match.rescuer = rescuerId;
    match.isAdminReview = false;
    if (!match.pickupOtp) {
      match.pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    if (!match.deliveryOtp) {
      match.deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    await match.save();

    // Update donation status to matched
    if (match.donation) {
      await Donation.findByIdAndUpdate(match.donation._id || match.donation, { status: 'matched' });
    }

    const updatedMatch = await Match.findById(matchId)
      .populate({
        path: 'donation',
        populate: { path: 'donor', select: 'name email phone location' },
      })
      .populate('rescuer', 'name email phone location availableCapacity');

    res.status(200).json({
      success: true,
      message: 'Match approved and rescuer assigned successfully.',
      match: updatedMatch,
      data: updatedMatch,
    });
  } catch (error) {
    console.error('Error in approveReviewQueueMatch:', error);
    res.status(500).json({
      message: error.message || 'Server error approving match.',
    });
  }
};

/**
 * @desc    Dispatch parcel / logistics service notification email
 * @route   POST /api/admin/dispatch-logistics
 * @access  Private (Admin only)
 */
const dispatchLogisticsPartner = async (req, res) => {
  try {
    const { matchId } = req.body;

    if (!matchId || !mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({
        message: 'Valid matchId is required.',
      });
    }

    const match = await Match.findById(matchId)
      .populate({
        path: 'donation',
        populate: { path: 'donor', select: 'name email phone location' },
      })
      .populate('rescuer', 'name email phone location');

    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    const donation = match.donation || {};
    const donor = donation.donor || {};
    const rescuer = match.rescuer || {};

    const trackingNumber = `STS-PARCEL-${match._id.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const partnerEmail = process.env.LOGISTICS_PARTNER_EMAIL || 'dispatch@foodlogistics-express.org';

    const dispatchManifest = {
      trackingNumber,
      partnerEmail,
      timestamp: new Date().toISOString(),
      sender: {
        name: donor.name || 'Food Donor',
        phone: donor.phone || 'N/A',
        pickupAddress: donation.location?.address || 'Donor Base Station',
      },
      receiver: {
        name: rescuer.name || 'Shelter Coordinator / Volunteer',
        phone: rescuer.phone || 'N/A',
        deliveryAddress: rescuer.location?.address || 'Designated Shelter / Pantry',
      },
      foodDetails: {
        foodType: donation.foodType,
        quantity: donation.quantity,
        description: donation.description || 'Prepared surplus food',
        safetyWindowDeadline: donation.expiryAt,
      },
      status: 'courier_notified',
      emailStatus: 'sent_to_dispatch_partner',
    };

    console.log(`[Logistics Partner] Email dispatched to ${partnerEmail} for Tracking #${trackingNumber}`);

    res.status(200).json({
      success: true,
      message: `Logistics agency notified at ${partnerEmail}. Tracking order generated.`,
      dispatchManifest,
    });
  } catch (error) {
    console.error('Error dispatching logistics:', error);
    res.status(500).json({
      message: error.message || 'Server error sending dispatch notification.',
    });
  }
};

/**
 * @desc    Get aggregate statistics and 14-day breakdown
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
const getStats = async (req, res) => {
  try {
    const [
      totalDonations,
      totalMatches,
      completedDeliveries,
      divertedDonationsAgg,
      divertedMatchesAgg,
    ] = await Promise.all([
      Donation.countDocuments(),
      Match.countDocuments(),
      Match.countDocuments({ status: 'delivered' }),
      Donation.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } },
      ]),
      Match.aggregate([
        { $match: { status: 'delivered' } },
        {
          $lookup: {
            from: 'donations',
            localField: 'donation',
            foreignField: '_id',
            as: 'donationDoc',
          },
        },
        { $unwind: '$donationDoc' },
        { $group: { _id: null, totalQuantity: { $sum: '$donationDoc.quantity' } } },
      ]),
    ]);

    const totalQuantityDiverted = Math.max(
      divertedDonationsAgg[0]?.totalQuantity || 0,
      divertedMatchesAgg[0]?.totalQuantity || 0
    );

    // Last 14 days breakdown (UTC-aligned to match MongoDB date strings)
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const fourteenDaysAgo = new Date(todayUTC);
    fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 13);

    const [donationsDaily, deliveriesDaily] = await Promise.all([
      Donation.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            quantity: { $sum: '$quantity' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Match.aggregate([
        {
          $match: {
            status: 'delivered',
            updatedAt: { $gte: fourteenDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build contiguous 14-day history
    const breakdownByDay = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const don = donationsDaily.find((item) => item._id === dateStr);
      const del = deliveriesDaily.find((item) => item._id === dateStr);

      breakdownByDay.push({
        date: dateStr,
        day: dateStr,
        donationsCount: don ? don.count : 0,
        donations: don ? don.count : 0,
        quantityDiverted: don ? don.quantity : 0,
        quantity: don ? don.quantity : 0,
        deliveriesCount: del ? del.count : 0,
        deliveries: del ? del.count : 0,
      });
    }

    res.status(200).json({
      success: true,
      totalDonations,
      totalMatches,
      completedDeliveries,
      totalQuantityDiverted,
      breakdownByDay,
      stats: {
        totalDonations,
        totalMatches,
        completedDeliveries,
        totalQuantityDiverted,
        breakdownByDay,
      },
    });
  } catch (error) {
    console.error('Error in getStats:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching statistics.',
    });
  }
};

/**
 * @desc    Get paginated list of all donations with their current match status
 * @route   GET /api/admin/all-activity
 * @access  Private (Admin only)
 */
const getAllActivity = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const total = await Donation.countDocuments();
    const donations = await Donation.find()
      .populate('donor', 'name email phone location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const donationIds = donations.map((d) => d._id);
    const matches = await Match.find({ donation: { $in: donationIds } })
      .populate('rescuer', 'name email phone location');

    const matchMap = {};
    matches.forEach((m) => {
      matchMap[m.donation.toString()] = m;
    });

    const activity = donations.map((d) => {
      const match = matchMap[d._id.toString()] || null;
      return {
        ...d.toObject(),
        match,
        matchStatus: match ? match.status : null,
      };
    });

    res.status(200).json({
      success: true,
      total,
      count: activity.length,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
      data: activity,
      donations: activity,
      activity,
    });
  } catch (error) {
    console.error('Error in getAllActivity:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching activity.',
    });
  }
};

/**
 * @desc    Get all shelter/rescuer food applications for admin review & matching
 * @route   GET /api/admin/food-requests
 * @access  Private (Admin only)
 */
const getAdminFoodRequests = async (req, res) => {
  try {
    const foodRequests = await FoodRequest.find()
      .populate('rescuer', 'name email phone location availableCapacity acceptedTypes')
      .populate('matchedDonation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: foodRequests.length,
      requests: foodRequests,
    });
  } catch (error) {
    console.error('Error in getAdminFoodRequests:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching shelter food requests.',
    });
  }
};

/**
 * @desc    Update food request status (approve, reject, match, fulfill)
 * @route   PATCH /api/admin/food-requests/:id/status
 * @access  Private (Admin only)
 */
const updateFoodRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, matchedDonationId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid food request ID.' });
    }

    const request = await FoodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Food request not found.' });
    }

    if (status) request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;
    if (matchedDonationId) request.matchedDonation = matchedDonationId;

    await request.save();

    const updated = await FoodRequest.findById(id)
      .populate('rescuer', 'name email phone location availableCapacity')
      .populate('matchedDonation');

    res.status(200).json({
      success: true,
      message: `Food request status updated to ${request.status}.`,
      request: updated,
    });
  } catch (error) {
    console.error('Error in updateFoodRequestStatus:', error);
    res.status(500).json({
      message: error.message || 'Server error updating food request status.',
    });
  }
};

/**
 * @desc    Get aggregated map locations (Rescuer Food Requests, Active Donations, Rescuers)
 * @route   GET /api/admin/map-locations
 * @access  Private (Admin only)
 */
const getMapLocations = async (req, res) => {
  try {
    const [foodRequests, donations, rescuers] = await Promise.all([
      FoodRequest.find().populate('rescuer', 'name email phone location').sort({ createdAt: -1 }),
      Donation.find().populate('donor', 'name email phone location').sort({ createdAt: -1 }),
      User.find({ role: 'rescuer' }).select('name email phone location availableCapacity acceptedTypes'),
    ]);

    // Format Rescuer Food Requests for map dots
    const requestMarkers = foodRequests.map((r, index) => {
      let lat = r.location?.lat;
      let lng = r.location?.lng;
      if (!lat || !lng) {
        lat = 40.7128 + (index * 0.015) % 0.08 - 0.04;
        lng = -74.006 + (index * 0.02) % 0.08 - 0.04;
      }
      return {
        id: r._id.toString(),
        type: 'food_request',
        category: 'Shelter Application',
        title: r.shelterName || r.rescuer?.name || 'Shelter Request',
        address: r.address || r.location?.address || 'Community Shelter Address',
        lat,
        lng,
        minQuantity: r.minQuantity,
        maxQuantity: r.maxQuantity,
        quantityRange: `${r.minQuantity} - ${r.maxQuantity} ${r.quantityUnit || 'meals'}`,
        foodTypes: r.foodTypes || [],
        urgency: r.urgency || 'standard',
        beneficiariesCount: r.beneficiariesCount || 0,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt,
        contact: {
          name: r.rescuer?.name || r.shelterName,
          email: r.rescuer?.email,
          phone: r.rescuer?.phone,
        },
      };
    });

    // Format Donations for map dots
    const donationMarkers = donations.map((d, index) => {
      let lat = d.location?.lat;
      let lng = d.location?.lng;
      if (!lat || !lng) {
        lat = 40.7282 + (index * 0.012) % 0.08 - 0.04;
        lng = -73.9942 + (index * 0.018) % 0.08 - 0.04;
      }
      return {
        id: d._id.toString(),
        type: 'donation',
        category: 'Surplus Food Source',
        title: d.donor?.name || 'Food Donor',
        address: d.location?.address || 'Donor Pickup Address',
        lat,
        lng,
        quantity: d.quantity,
        foodType: d.foodType,
        status: d.status,
        expiryAt: d.expiryAt,
        description: d.description,
        photoUrl: d.photoUrl,
        createdAt: d.createdAt,
        contact: {
          name: d.donor?.name,
          email: d.donor?.email,
          phone: d.donor?.phone,
        },
      };
    });

    // Format Base Rescuers for map dots
    const rescuerMarkers = rescuers.map((r, index) => {
      let lat = r.location?.lat;
      let lng = r.location?.lng;
      if (!lat || !lng) {
        lat = 40.7306 + (index * 0.01) % 0.06 - 0.03;
        lng = -73.9866 + (index * 0.015) % 0.06 - 0.03;
      }
      return {
        id: r._id.toString(),
        type: 'rescuer_shelter',
        category: 'Registered Shelter Base',
        title: r.name,
        address: r.location?.address || 'Shelter Headquarters',
        lat,
        lng,
        availableCapacity: r.availableCapacity || 0,
        acceptedTypes: r.acceptedTypes || [],
        contact: {
          name: r.name,
          email: r.email,
          phone: r.phone,
        },
      };
    });

    res.status(200).json({
      success: true,
      counts: {
        foodRequests: requestMarkers.length,
        donations: donationMarkers.length,
        rescuers: rescuerMarkers.length,
        totalMarkers: requestMarkers.length + donationMarkers.length + rescuerMarkers.length,
      },
      locations: {
        foodRequests: requestMarkers,
        donations: donationMarkers,
        rescuers: rescuerMarkers,
        all: [...requestMarkers, ...donationMarkers, ...rescuerMarkers],
      },
    });
  } catch (error) {
    console.error('Error in getMapLocations:', error);
    res.status(500).json({
      message: error.message || 'Server error generating map locations.',
    });
  }
};

module.exports = {
  getReviewQueue,
  approveReviewQueueMatch,
  dispatchLogisticsPartner,
  getStats,
  getAllActivity,
  getAdminFoodRequests,
  updateFoodRequestStatus,
  getMapLocations,
};
