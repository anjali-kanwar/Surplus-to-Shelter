const Donation = require('../models/Donation');
const Match = require('../models/Match');
const User = require('../models/User');

/**
 * @desc    Get all Match documents requiring admin review
 * @route   GET /api/admin/review-queue
 * @access  Private (Admin only)
 */
const getReviewQueue = async (req, res) => {
  try {
    const reviewQueue = await Match.find({
      isAdminReview: true,
      status: 'pending_confirmation',
    })
      .populate({
        path: 'donation',
        populate: {
          path: 'donor',
          select: 'name email phone location',
        },
      })
      .populate('rescuer', 'name email phone location availableCapacity acceptedTypes')
      .populate('rankedCandidates.rescuer', 'name email phone location availableCapacity acceptedTypes')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviewQueue.length,
      matches: reviewQueue,
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
    await match.save();

    // Update donation status to matched
    await Donation.findByIdAndUpdate(match.donation, { status: 'matched' });

    const updatedMatch = await Match.findById(matchId)
      .populate({
        path: 'donation',
        populate: { path: 'donor', select: 'name email phone' },
      })
      .populate('rescuer', 'name email phone location availableCapacity');

    res.status(200).json({
      success: true,
      message: 'Match approved and rescuer assigned successfully.',
      match: updatedMatch,
    });
  } catch (error) {
    console.error('Error in approveReviewQueueMatch:', error);
    res.status(500).json({
      message: error.message || 'Server error approving match.',
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
    const [totalDonations, totalMatches, completedDeliveries, divertedAgg] = await Promise.all([
      Donation.countDocuments(),
      Match.countDocuments(),
      Match.countDocuments({ status: 'delivered' }),
      Donation.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } },
      ]),
    ]);

    const totalQuantityDiverted = divertedAgg[0]?.totalQuantity || 0;

    // Last 14 days breakdown
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

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
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const don = donationsDaily.find((item) => item._id === dateStr);
      const del = deliveriesDaily.find((item) => item._id === dateStr);

      breakdownByDay.push({
        date: dateStr,
        donationsCount: don ? don.count : 0,
        quantityDiverted: don ? don.quantity : 0,
        deliveriesCount: del ? del.count : 0,
      });
    }

    res.status(200).json({
      success: true,
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

    const activity = donations.map((d) => ({
      ...d.toObject(),
      match: matchMap[d._id.toString()] || null,
    }));

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
      data: activity,
    });
  } catch (error) {
    console.error('Error in getAllActivity:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching activity.',
    });
  }
};

module.exports = {
  getReviewQueue,
  approveReviewQueueMatch,
  getStats,
  getAllActivity,
};
