const express = require('express');
const {
  createDonation,
  getMyDonations,
  getDonationById,
} = require('../controllers/donationController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Protected donor-only routes
router.post('/', protect, authorizeRoles('donor'), createDonation);
router.get('/my', protect, authorizeRoles('donor'), getMyDonations);

// Protected route to view a single donation (with donor + match info)
router.get('/:id', protect, getDonationById);

module.exports = router;
