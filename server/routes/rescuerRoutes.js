const express = require('express');
const {
  updateProfile,
  getRescuerMatches,
  respondToMatch,
} = require('../controllers/rescuerController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and restricted to rescuer role
router.use(protect, authorizeRoles('rescuer'));

router.put('/profile', updateProfile);
router.get('/matches', getRescuerMatches);
router.patch('/matches/:matchId/respond', respondToMatch);

module.exports = router;
