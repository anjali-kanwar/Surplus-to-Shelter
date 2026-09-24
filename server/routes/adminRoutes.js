const express = require('express');
const {
  getReviewQueue,
  approveReviewQueueMatch,
  getStats,
  getAllActivity,
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and restricted to admin role
router.use(protect, authorizeRoles('admin'));

// GET /api/admin/review-queue — returns all Match documents where isAdminReview = true and status = "pending_confirmation"
router.get('/review-queue', getReviewQueue);

// PATCH /api/admin/review-queue/:matchId/approve — body: { rescuerId } — sets that Match's rescuer to chosen one, isAdminReview = false
router.patch('/review-queue/:matchId/approve', approveReviewQueueMatch);

// GET /api/admin/stats — returns aggregate counts and 14-day daily breakdown
router.get('/stats', getStats);

// GET /api/admin/all-activity — paginated list of all donations + their current match status
router.get('/all-activity', getAllActivity);

module.exports = router;
