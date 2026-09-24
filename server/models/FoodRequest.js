const mongoose = require('mongoose');

const foodRequestSchema = new mongoose.Schema(
  {
    rescuer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Rescuer is required'],
    },
    shelterName: {
      type: String,
      required: [true, 'Shelter / Organization name is required'],
      trim: true,
    },
    foodTypes: {
      type: [String],
      enum: ['cooked_meals', 'produce', 'baked_goods', 'packaged', 'other'],
      default: ['cooked_meals', 'produce'],
    },
    minQuantity: {
      type: Number,
      required: [true, 'Minimum quantity is required'],
      min: [1, 'Minimum quantity must be at least 1'],
    },
    maxQuantity: {
      type: Number,
      required: [true, 'Maximum quantity is required'],
      min: [1, 'Maximum quantity must be at least 1'],
    },
    quantityUnit: {
      type: String,
      enum: ['meals', 'kg', 'boxes'],
      default: 'meals',
    },
    beneficiariesCount: {
      type: Number,
      default: 0,
    },
    urgency: {
      type: String,
      enum: ['standard', 'urgent', 'scheduled'],
      default: 'standard',
    },
    requiredBy: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // default 24h from now
    },
    address: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
    },
    location: {
      lat: {
        type: Number,
        default: 40.7128,
      },
      lng: {
        type: Number,
        default: -74.006,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'matched', 'fulfilled', 'cancelled'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    matchedDonation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for formatted quantity range string (e.g., "50 - 150 meals")
foodRequestSchema.virtual('quantityRangeString').get(function () {
  return `${this.minQuantity} - ${this.maxQuantity} ${this.quantityUnit || 'meals'}`;
});

foodRequestSchema.set('toJSON', { virtuals: true });
foodRequestSchema.set('toObject', { virtuals: true });

const FoodRequest = mongoose.model('FoodRequest', foodRequestSchema);

module.exports = FoodRequest;
