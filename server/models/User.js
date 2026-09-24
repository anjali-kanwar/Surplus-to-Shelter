const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
    },
    role: {
      type: String,
      enum: ['donor', 'rescuer'],
      required: [true, 'Please specify a role'],
    },
    phone: {
      type: String,
      trim: true,
    },
    location: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },
    // Rescuer-only fields (optional / undefined for donors)
    acceptedTypes: {
      type: [String],
      default: undefined,
    },
    availableCapacity: {
      type: Number,
    },
    acceptRadiusKm: {
      type: Number,
    },
    pickupWindowStart: {
      type: String, // "HH:MM"
    },
    pickupWindowEnd: {
      type: String, // "HH:MM"
    },
    completedPickups: {
      type: Number,
      default: 0,
    },
    totalAssignedPickups: {
      type: Number,
      default: 0,
    },
    creditPoints: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password with bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
