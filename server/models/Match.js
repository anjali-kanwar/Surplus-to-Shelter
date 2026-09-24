const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: [true, 'Donation reference is required'],
    },
    rescuer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Rescuer reference is required'],
    },
    matchScore: {
      type: Number,
    },
    confidence: {
      type: String,
      enum: ['high', 'low'],
    },
    status: {
      type: String,
      enum: ['pending_confirmation', 'confirmed', 'rejected', 'picked_up', 'delivered'],
      default: 'pending_confirmation',
    },
    pickupOtp: {
      type: String,
    },
    deliveryOtp: {
      type: String,
    },
    isAdminReview: {
      type: Boolean,
      default: false,
    },
    rankedCandidates: [
      {
        rescuer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        score: {
          type: Number,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
