const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const donationRoutes = require('./routes/donationRoutes');
const rescuerRoutes = require('./routes/rescuerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/rescuer', rescuerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matches', deliveryRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Food Rescue App API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
