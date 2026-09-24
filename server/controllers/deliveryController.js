const mongoose = require('mongoose');
const Match = require('../models/Match');
const Donation = require('../models/Donation');
const User = require('../models/User');

/**
 * @desc    Verify pickup via OTP
 * @route   PATCH /api/matches/:matchId/verify-pickup
 * @access  Private (Rescuer only)
 */
const verifyPickup = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { otp } = req.body;

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(404).json({
        message: 'Match not found.',
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        message: 'Match not found.',
      });
    }

    if (!match.pickupOtp || !otp || String(otp).trim() !== String(match.pickupOtp).trim()) {
      return res.status(400).json({
        message: 'Invalid OTP',
      });
    }

    match.status = 'picked_up';
    await match.save();

    let donation = null;
    if (match.donation) {
      donation = await Donation.findByIdAndUpdate(
        match.donation._id || match.donation,
        { status: 'pickup_confirmed' },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Pickup verified successfully.',
      match,
      donation,
    });
  } catch (error) {
    console.error('Error in verifyPickup:', error);
    res.status(500).json({
      message: error.message || 'Server error verifying pickup.',
    });
  }
};

/**
 * @desc    Verify delivery via OTP
 * @route   PATCH /api/matches/:matchId/verify-delivery
 * @access  Private (Rescuer only)
 */
const verifyDelivery = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { otp } = req.body;

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(404).json({
        message: 'Match not found.',
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        message: 'Match not found.',
      });
    }

    if (!match.deliveryOtp || !otp || String(otp).trim() !== String(match.deliveryOtp).trim()) {
      return res.status(400).json({
        message: 'Invalid OTP',
      });
    }

    match.status = 'delivered';
    await match.save();

    let donation = null;
    if (match.donation) {
      donation = await Donation.findByIdAndUpdate(
        match.donation._id || match.donation,
        { status: 'delivered' },
        { new: true }
      );
    }

    // Increment donor credit points
    if (donation && donation.donor) {
      const donorId = donation.donor._id || donation.donor;
      const points = (donation.quantity && Number(donation.quantity) > 0)
        ? Number(donation.quantity)
        : 10;

      await User.findByIdAndUpdate(donorId, {
        $inc: { creditPoints: points },
      });
    }

    // Increment rescuer completedPickups and totalAssignedPickups
    const rescuerId = match.rescuer?._id || match.rescuer || req.user?._id;
    if (rescuerId) {
      await User.findByIdAndUpdate(rescuerId, {
        $inc: {
          completedPickups: 1,
          totalAssignedPickups: 1,
        },
      });
    }
    if (req.user?._id && rescuerId && req.user._id.toString() !== rescuerId.toString()) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          completedPickups: 1,
          totalAssignedPickups: 1,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery verified successfully.',
      match,
      donation,
    });
  } catch (error) {
    console.error('Error in verifyDelivery:', error);
    res.status(500).json({
      message: error.message || 'Server error verifying delivery.',
    });
  }
};

module.exports = {
  verifyPickup,
  verifyDelivery,
};
