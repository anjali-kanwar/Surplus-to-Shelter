const express = require('express');
const {
  updateProfile,
  getRescuerMatches,
  respondToMatch,
  createFoodRequest,
  getMyFoodRequests,
  cancelFoodRequest,
} = require('../controllers/rescuerController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and restricted to rescuer role
router.use(protect, authorizeRoles('rescuer'));

router.put('/profile', updateProfile);
router.get('/matches', getRescuerMatches);
router.patch('/matches/:matchId/respond', respondToMatch);

// Food Requests (Shelter Applications)
router.post('/food-requests', createFoodRequest);
router.get('/my-food-requests', getMyFoodRequests);
router.delete('/food-requests/:id', cancelFoodRequest);

module.exports = router;
