const express = require('express');
const {
  verifyPickup,
  verifyDelivery,
} = require('../controllers/deliveryController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Protected, rescuer only
router.use(protect, authorizeRoles('rescuer'));

// PATCH /api/matches/:matchId/verify-pickup
router.patch('/:matchId/verify-pickup', verifyPickup);

// PATCH /api/matches/:matchId/verify-delivery
router.patch('/:matchId/verify-delivery', verifyDelivery);

module.exports = router;
