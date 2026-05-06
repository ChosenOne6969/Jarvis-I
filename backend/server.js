const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const nodeRoutes = require('./routes/nodes');
const jarvisRoutes = require('./routes/jarvis');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://jarvis-i.vercel.app',
  ],
  credentials: true
}));
app.use(express.json());
app.use('/audio', express.static('public/audio'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/jarvis', jarvisRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(process.env.PORT, () => {
      console.log(`✅ Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log('❌ Connection failed:', err.message);
  });