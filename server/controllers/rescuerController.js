const Match = require('../models/Match');
const User = require('../models/User');
const Donation = require('../models/Donation');

// Helper to generate 6-digit numeric OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Update rescuer profile settings
 * @route   PUT /api/rescuer/profile
 * @access  Private (Rescuer only)
 */
const updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      acceptedTypes,
      availableCapacity,
      acceptRadiusKm,
      pickupWindowStart,
      pickupWindowEnd,
      location,
    } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (acceptedTypes !== undefined) updateFields.acceptedTypes = acceptedTypes;
    if (availableCapacity !== undefined) updateFields.availableCapacity = availableCapacity;
    if (acceptRadiusKm !== undefined) updateFields.acceptRadiusKm = acceptRadiusKm;
    if (pickupWindowStart !== undefined) updateFields.pickupWindowStart = pickupWindowStart;
    if (pickupWindowEnd !== undefined) updateFields.pickupWindowEnd = pickupWindowEnd;
    if (location !== undefined) updateFields.location = location;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({
      message: error.message || 'Server error updating rescuer profile.',
    });
  }
};

/**
 * @desc    Get all matches assigned to logged-in rescuer
 * @route   GET /api/rescuer/matches
 * @access  Private (Rescuer only)
 */
const getRescuerMatches = async (req, res) => {
  try {
    const matches = await Match.find({ rescuer: req.user._id })
      .populate({
        path: 'donation',
        populate: {
          path: 'donor',
          select: 'name email phone location',
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error) {
    console.error('Error in getRescuerMatches:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching rescuer matches.',
    });
  }
};

/**
 * @desc    Respond to a match (confirm or reject)
 * @route   PATCH /api/rescuer/matches/:matchId/respond
 * @access  Private (Rescuer only)
 */
const respondToMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { action } = req.body;

    if (!action || !['confirm', 'reject'].includes(action)) {
      return res.status(400).json({
        message: 'Invalid action. Action must be "confirm" or "reject".',
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        message: 'Match not found.',
      });
    }

    // Ensure the match belongs to the logged-in rescuer
    if (match.rescuer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized to respond to this match.',
      });
    }

    if (match.status !== 'pending_confirmation') {
      return res.status(400).json({
        message: `Match cannot be responded to because its status is already '${match.status}'.`,
      });
    }

    if (action === 'confirm') {
      const pickupOtp = generateOtp();
      const deliveryOtp = generateOtp();

      match.status = 'confirmed';
      match.pickupOtp = pickupOtp;
      match.deliveryOtp = deliveryOtp;
      await match.save();

      // Update the associated donation status to matched
      await Donation.findByIdAndUpdate(match.donation, { status: 'matched' });

      // Increment rescuer's total assigned pickups
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { totalAssignedPickups: 1 },
      });

      return res.status(200).json({
        success: true,
        message: 'Match confirmed successfully.',
        match,
        pickupOtp,
        deliveryOtp,
      });
    }

    if (action === 'reject') {
      match.status = 'rejected';
      await match.save();

      let nextMatch = null;

      // Look at rankedCandidates and find the next candidate after current rescuer
      if (match.rankedCandidates && match.rankedCandidates.length > 0) {
        const currentIndex = match.rankedCandidates.findIndex(
          (c) => c.rescuer && c.rescuer.toString() === req.user._id.toString()
        );

        const nextCandidate = match.rankedCandidates[currentIndex + 1];

        if (nextCandidate && nextCandidate.rescuer) {
          nextMatch = await Match.create({
            donation: match.donation,
            rescuer: nextCandidate.rescuer,
            matchScore: nextCandidate.score,
            confidence: match.confidence,
            status: 'pending_confirmation',
            isAdminReview: match.isAdminReview,
            rankedCandidates: match.rankedCandidates,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: nextMatch
          ? 'Match rejected. Reassigned to next best rescuer candidate.'
          : 'Match rejected. No further candidates available.',
        match,
        nextMatch,
      });
    }
  } catch (error) {
    console.error('Error in respondToMatch:', error);
    res.status(500).json({
      message: error.message || 'Server error responding to match.',
    });
  }
};

module.exports = {
  updateProfile,
  getRescuerMatches,
  respondToMatch,
};
