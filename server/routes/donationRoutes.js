const express = require('express');
const {
  createDonation,
  getMyDonations,
  getDonationById,
  analyzeFoodPhoto,
  getTaxCertificate,
} = require('../controllers/donationController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Protected donor-only routes
router.post('/analyze-photo', protect, authorizeRoles('donor'), analyzeFoodPhoto);
router.get('/tax-certificate', protect, authorizeRoles('donor'), getTaxCertificate);
router.post('/', protect, authorizeRoles('donor'), createDonation);
router.get('/my', protect, authorizeRoles('donor'), getMyDonations);

// Protected route to view a single donation
router.get('/:id', protect, getDonationById);

module.exports = router;
