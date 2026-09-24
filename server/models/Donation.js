const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donor is required'],
    },
    foodType: {
      type: String,
      enum: ['cooked_meals', 'produce', 'baked_goods', 'packaged', 'other'],
      required: [true, 'Food type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    photoUrl: {
      type: String,
    },
    expiryAt: {
      type: Date,
      required: [true, 'Expiry date and time is required'],
    },
    location: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    status: {
      type: String,
      enum: ['posted', 'matched', 'pickup_confirmed', 'delivered', 'expired'],
      default: 'posted',
    },
    visionAnalysis: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation;
