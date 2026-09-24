const Donation = require('../models/Donation');
const Match = require('../models/Match');
const User = require('../models/User');

const { triggerMatching } = require('./matchingController');

/**
 * Helper function to award credit points to donor upon successful delivery
 * @param {string|ObjectId} donorId
 * @param {number} quantity
 */
const awardDonorCreditPoints = async (donorId, quantity) => {
  try {
    const pointsToAward = Math.max(0, Number(quantity) * 1);
    const updatedUser = await User.findByIdAndUpdate(
      donorId,
      { $inc: { creditPoints: pointsToAward } },
      { new: true }
    );
    console.log(`[Credit Points] Awarded ${pointsToAward} points to donor ${donorId}. Total: ${updatedUser?.creditPoints}`);
    return updatedUser;
  } catch (error) {
    console.error(`[Credit Points Error] Failed to award points to donor ${donorId}:`, error.message);
  }
};

/**
 * @desc    Create a new donation & trigger matching
 * @route   POST /api/donations
 * @access  Private (Donor only)
 */
const createDonation = async (req, res) => {
  try {
    const { foodType, quantity, description, photoUrl, expiryAt, location } = req.body;

    if (!foodType || !quantity || !expiryAt) {
      return res.status(400).json({
        message: 'Please provide all required fields: foodType, quantity, and expiryAt.',
      });
    }

    const donationLocation = location || req.user.location || {};

    const donation = await Donation.create({
      donor: req.user._id,
      foodType,
      quantity,
      description,
      photoUrl,
      expiryAt,
      location: donationLocation,
      status: 'posted',
    });

    // Trigger matching flow asynchronously
    try {
      await triggerMatching(donation._id);
    } catch (matchErr) {
      console.error('Error triggering matching flow:', matchErr);
    }

    res.status(201).json({
      success: true,
      donation,
    });
  } catch (error) {
    console.error('Error in createDonation:', error);
    res.status(500).json({
      message: error.message || 'Server error creating donation.',
    });
  }
};

/**
 * @desc    Get all donations created by the logged-in donor
 * @route   GET /api/donations/my
 * @access  Private (Donor only)
 */
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .sort({ createdAt: -1 });

    // Fetch matching details for each donation if available
    const donationIds = donations.map((d) => d._id);
    const matches = await Match.find({ donation: { $in: donationIds } })
      .populate('rescuer', 'name email phone');

    const matchMap = {};
    matches.forEach((m) => {
      matchMap[m.donation.toString()] = m;
    });

    const donationsWithMatch = donations.map((d) => ({
      ...d.toObject(),
      match: matchMap[d._id.toString()] || null,
    }));

    res.status(200).json({
      success: true,
      count: donationsWithMatch.length,
      donations: donationsWithMatch,
    });
  } catch (error) {
    console.error('Error in getMyDonations:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching your donations.',
    });
  }
};

/**
 * @desc    Get single donation by ID with populated donor and match details
 * @route   GET /api/donations/:id
 * @access  Private
 */
const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name email phone location creditPoints');

    if (!donation) {
      return res.status(404).json({
        message: 'Donation not found.',
      });
    }

    const match = await Match.findOne({ donation: donation._id })
      .populate('rescuer', 'name email phone location availableCapacity');

    res.status(200).json({
      success: true,
      donation,
      match: match || null,
    });
  } catch (error) {
    console.error('Error in getDonationById:', error);
    res.status(500).json({
      message: error.message || 'Server error fetching donation details.',
    });
  }
};

module.exports = {
  triggerMatching,
  awardDonorCreditPoints,
  createDonation,
  getMyDonations,
  getDonationById,
};
