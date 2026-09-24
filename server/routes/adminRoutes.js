const express = require('express');
const {
  getReviewQueue,
  approveReviewQueueMatch,
  dispatchLogisticsPartner,
  getStats,
  getAllActivity,
  getAdminFoodRequests,
  updateFoodRequestStatus,
  getMapLocations,
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and restricted to admin role
router.use(protect, authorizeRoles('admin'));

// GET /api/admin/review-queue — returns all Match documents where isAdminReview = true and status = "pending_confirmation"
router.get('/review-queue', getReviewQueue);

// PATCH /api/admin/review-queue/:matchId/approve — body: { rescuerId } — sets that Match's rescuer to chosen one, isAdminReview = false
router.patch('/review-queue/:matchId/approve', approveReviewQueueMatch);

// POST /api/admin/dispatch-logistics — triggers courier/parcel agency notification
router.post('/dispatch-logistics', dispatchLogisticsPartner);

// GET /api/admin/stats — returns aggregate counts and 14-day daily breakdown
router.get('/stats', getStats);

// GET /api/admin/all-activity — paginated list of all donations + their current match status
router.get('/all-activity', getAllActivity);

// Food Requests (Shelter Applications)
router.get('/food-requests', getAdminFoodRequests);
router.patch('/food-requests/:id/status', updateFoodRequestStatus);

// Map Locations (Rescuer food requests + Donations + Rescuers)
router.get('/map-locations', getMapLocations);

module.exports = router;
