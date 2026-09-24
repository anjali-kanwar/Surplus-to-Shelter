const Match = require('../models/Match');
const User = require('../models/User');
const Donation = require('../models/Donation');
const FoodRequest = require('../models/FoodRequest');

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

/**
 * @desc    Rescuer applies for food supplies / shelter food request
 * @route   POST /api/rescuer/food-requests
 * @access  Private (Rescuer only)
 */
const createFoodRequest = async (req, res) => {
  try {
    const {
      shelterName,
      foodTypes,
      minQuantity,
      maxQuantity,
      quantityUnit,
      beneficiariesCount,
      urgency,
      requiredBy,
      address,
      location,
      notes,
    } = req.body;

    if (!minQuantity || !maxQuantity) {
      return res.status(400).json({
        message: 'Please provide both minimum and maximum quantity in your range.',
      });
    }

    if (Number(minQuantity) > Number(maxQuantity)) {
      return res.status(400).json({
        message: 'Minimum quantity cannot exceed maximum quantity.',
      });
    }

    const deliveryAddress =
      address?.trim() ||
      location?.address?.trim() ||
      req.user.location?.address ||
      'Community Shelter Intake Facility';

    // Calculate coordinates
    let reqLat = location?.lat !== undefined ? Number(location.lat) : req.user.location?.lat;
    let reqLng = location?.lng !== undefined ? Number(location.lng) : req.user.location?.lng;

    if (reqLat === undefined || reqLng === undefined || isNaN(reqLat) || isNaN(reqLng)) {
      const baseLat = 40.7128;
      const baseLng = -74.0060;
      const jitterLat = (Math.random() - 0.5) * 0.08;
      const jitterLng = (Math.random() - 0.5) * 0.08;
      reqLat = Number((baseLat + jitterLat).toFixed(5));
      reqLng = Number((baseLng + jitterLng).toFixed(5));
    }

    const foodRequest = await FoodRequest.create({
      rescuer: req.user._id,
      shelterName: shelterName?.trim() || req.user.name || 'Community Shelter',
      foodTypes: Array.isArray(foodTypes) && foodTypes.length > 0 ? foodTypes : ['cooked_meals', 'produce'],
      minQuantity: Number(minQuantity),
      maxQuantity: Number(maxQuantity),
      quantityUnit: quantityUnit || 'meals',
      beneficiariesCount: Number(beneficiariesCount) || 0,
      urgency: urgency || 'standard',
      requiredBy: requiredBy ? new Date(requiredBy) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      address: deliveryAddress,
      location: {
        lat: reqLat,
        lng: reqLng,
        address: deliveryAddress,
      },
      notes: notes?.trim() || '',
      status: 'pending',
    });

    const populatedRequest = await FoodRequest.findById(foodRequest._id).populate(
      'rescuer',
      'name email phone location availableCapacity'
    );

    res.status(201).json({
      success: true,
      message: 'Food request submitted successfully! Admin has been notified and plotted on the map.',
      foodRequest: populatedRequest,
    });
  } catch (error) {
    console.error('Error creating food request:', error);
    res.status(500).json({
      message: error.message || 'Server error submitting food request.',
    });
  }
};

/**
 * @desc    Get all food requests created by the logged-in rescuer
 * @route   GET /api/rescuer/my-food-requests
 * @access  Private (Rescuer only)
 */
const getMyFoodRequests = async (req, res) => {
  try {
    const requests = await FoodRequest.find({ rescuer: req.user._id })
      .populate('matchedDonation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Error fetching rescuer food requests:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching your food requests.',
    });
  }
};

/**
 * @desc    Cancel a pending food request
 * @route   DELETE /api/rescuer/food-requests/:id
 * @access  Private (Rescuer only)
 */
const cancelFoodRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await FoodRequest.findOne({
      _id: id,
      rescuer: req.user._id,
    });

    if (!request) {
      return res.status(404).json({
        message: 'Food request not found or unauthorized.',
      });
    }

    if (request.status === 'fulfilled') {
      return res.status(400).json({
        message: 'Cannot cancel a fulfilled request.',
      });
    }

    request.status = 'cancelled';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Food request has been cancelled.',
      request,
    });
  } catch (error) {
    console.error('Error cancelling food request:', error);
    res.status(500).json({
      message: error.message || 'Server error cancelling food request.',
    });
  }
};

module.exports = {
  updateProfile,
  getRescuerMatches,
  respondToMatch,
  createFoodRequest,
  getMyFoodRequests,
  cancelFoodRequest,
};
