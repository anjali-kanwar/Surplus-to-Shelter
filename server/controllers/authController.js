const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT token (expires in 7 days)
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * @desc    Register a new user (donor or rescuer)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      city,
      location,
      organizationType,
      acceptedTypes,
      availableCapacity,
      acceptRadiusKm,
      pickupWindowStart,
      pickupWindowEnd,
    } = req.body;

    // Validate role: only "donor" or "rescuer" allowed
    if (!role || (role !== 'donor' && role !== 'rescuer')) {
      return res.status(400).json({
        message: 'Invalid role. Role must be either "donor" or "rescuer".',
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Please provide all required fields: name, email, and password.',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        message: 'User already exists with this email.',
      });
    }

    // Determine location coords
    let userLat = location?.lat;
    let userLng = location?.lng;
    const userAddress = address || location?.address || (role === 'rescuer' ? 'Community Shelter Base Station' : 'Donor Facility');
    const userCity = city || location?.city || 'Metro City';

    // If coordinates not supplied, provide slight random offset around metro center so each shelter/donor shows distinct on map
    if (userLat === undefined || userLng === undefined || isNaN(userLat) || isNaN(userLng)) {
      const baseLat = 40.7128;
      const baseLng = -74.0060;
      const randomOffsetLat = (Math.random() - 0.5) * 0.08;
      const randomOffsetLng = (Math.random() - 0.5) * 0.08;
      userLat = Number((baseLat + randomOffsetLat).toFixed(5));
      userLng = Number((baseLng + randomOffsetLng).toFixed(5));
    }

    // Prepare user data
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      phone,
      organizationType: organizationType || (role === 'rescuer' ? 'shelter' : 'business'),
      location: {
        lat: userLat,
        lng: userLng,
        address: userAddress,
        city: userCity,
      },
    };

    if (role === 'rescuer') {
      if (acceptedTypes) userData.acceptedTypes = acceptedTypes;
      if (availableCapacity !== undefined) userData.availableCapacity = availableCapacity;
      if (acceptRadiusKm !== undefined) userData.acceptRadiusKm = acceptRadiusKm;
      if (pickupWindowStart) userData.pickupWindowStart = pickupWindowStart;
      if (pickupWindowEnd) userData.pickupWindowEnd = pickupWindowEnd;
    }

    // Create user (password is hashed in pre-save hook)
    const user = await User.create(userData);

    // Generate token
    const token = generateToken({ id: user._id, role: user.role });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        organizationType: user.organizationType,
        ...(user.role === 'rescuer' && {
          acceptedTypes: user.acceptedTypes,
          availableCapacity: user.availableCapacity,
          acceptRadiusKm: user.acceptRadiusKm,
          pickupWindowStart: user.pickupWindowStart,
          pickupWindowEnd: user.pickupWindowEnd,
          completedPickups: user.completedPickups,
          totalAssignedPickups: user.totalAssignedPickups,
          creditPoints: user.creditPoints,
        }),
      },
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({
      message: error.message || 'Server error during registration.',
    });
  }
};

/**
 * @desc    Authenticate user / admin & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. FIRST check if credentials match admin credentials from .env
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : null;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && normalizedEmail === adminEmail && password === adminPassword) {
      const token = generateToken({ role: 'admin', email: normalizedEmail });
      return res.status(200).json({
        token,
        user: {
          email: normalizedEmail,
          role: 'admin',
          name: 'System Administrator',
        },
      });
    }

    // 2. Otherwise, look up user in MongoDB by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    // Compare password with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    // Issue JWT token with { id, role }
    const token = generateToken({ id: user._id, role: user.role });

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        ...(user.role === 'rescuer' && {
          acceptedTypes: user.acceptedTypes,
          availableCapacity: user.availableCapacity,
          acceptRadiusKm: user.acceptRadiusKm,
          pickupWindowStart: user.pickupWindowStart,
          pickupWindowEnd: user.pickupWindowEnd,
          completedPickups: user.completedPickups,
          totalAssignedPickups: user.totalAssignedPickups,
          creditPoints: user.creditPoints,
        }),
      },
    });
  } catch (error) {
    console.error('Error in loginUser:', error);
    res.status(500).json({
      message: error.message || 'Server error during login.',
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
