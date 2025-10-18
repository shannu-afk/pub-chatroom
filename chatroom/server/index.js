// server/index.js
// Full backend with OTP, Socket.IO chat, and call signaling.

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs'); // bcryptjs is stable for Node
require('dotenv').config();

// Optional route files - remove or add those files in ./routes if you don't have them
let authRoutes = null;
let adminRoutes = null;
try {
  authRoutes = require('./routes/auth');
} catch (e) { /* ignore if not present */ }
try {
  adminRoutes = require('./routes/admin');
} catch (e) { /* ignore if not present */ }

// Models (these must exist)
const Message = require('./models/messages');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'https://chatroom1-6.onrender.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate env
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not set in environment');
  process.exit(1);
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. OTP email sending will fail until these are provided.');
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

// -----------------
// OTP Implementation
// -----------------
// In-memory OTP store (dev only). Keys are normalized emails.
const otpStore = {}; // { "user@example.com": { otp: "123456", username, password, expires: timestamp } }

// Nodemailer transporter (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Utility: normalize email
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

// Send OTP endpoint
app.post('/api/otp/send', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields required: username, email, password' });
    }

    const cleanEmail = normalizeEmail(email);

    // Check if user already exists
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    // Generate 6-digit OTP as string (preserve leading zeros)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in memory (expires in 5 minutes)
    otpStore[cleanEmail] = {
      otp,
      username,
      password, // NOTE: password is plain here only for temp storage — we hash on final verify
      expires: Date.now() + (5 * 60 * 1000)
    };

    // Send email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('EMAIL_USER/PASS not set — skipping real email send (OTP in logs).');
      console.log(`OTP for ${cleanEmail}: ${otp}`);
    } else {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: cleanEmail,
        subject: 'KSC Chatroom — Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width:600px;">
            <h3>Your KSC Chatroom OTP</h3>
            <p>Hello <strong>${username}</strong>,</p>
            <p>Your one-time verification code is:</p>
            <div style="font-size:20px; font-weight:bold; background:#f3f4f6;padding:10px;border-radius:6px;display:inline-block">${otp}</div>
            <p>This code will expire in 5 minutes.</p>
          </div>
        `
      });
    }

    console.log(`OTP created for ${cleanEmail} (expires in 5 minutes).`);
    return res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error in /api/otp/send:', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint
app.post('/api/otp/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const stored = otpStore[email];

    if (!stored) return res.status(400).json({ message: 'No OTP for this email' });
    if (stored.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (Date.now() > stored.expires) return res.status(400).json({ message: 'OTP expired' });

    // Check duplicates for both email and username
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

    const existingUsername = await User.findOne({ username: stored.username });
    if (existingUsername) return res.status(400).json({ message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(stored.password, 10);
    await User.create({
      username: stored.username,
      email,
      password: hashedPassword,
      isVerified: true
    });

    delete otpStore[email];
    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ message: 'OTP verification failed' });
  }
});


// Optional: resend OTP (regenerates and mails)
app.post('/api/otp/resend', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const cleanEmail = normalizeEmail(email);
    const rec = otpStore[cleanEmail];
    if (!rec) return res.status(400).json({ message: 'No pending registration for this email' });

    // Create new OTP, update store
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[cleanEmail].otp = newOtp;
    otpStore[cleanEmail].expires = Date.now() + (5 * 60 * 1000);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`Resent OTP for ${cleanEmail}: ${newOtp}`);
    } else {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: cleanEmail,
        subject: 'KSC Chatroom — Your New OTP Code',
        text: `Your new OTP is ${newOtp}`
      });
    }

    return res.json({ success: true, message: 'New OTP sent' });
  } catch (err) {
    console.error('Error in /api/otp/resend:', err);
    return res.status(500).json({ message: 'Failed to resend OTP' });
  }
});

// -----------------
// Other routes (if available)
// -----------------
if (authRoutes) app.use('/api/auth', authRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);

// Serve frontend build in production (optional)
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

// -----------------
// Socket.IO: chat + signaling
// -----------------
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const users = new Map(); // username -> socketId

function emitOnlineUsers() {
  const online = Array.from(users.keys());
  io.emit('online-users', online);
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('register-user', (username) => {
    if (!username) return;
    users.set(username, socket.id);
    socket.username = username;
    console.log(`Registered user ${username} -> ${socket.id}`);
    emitOnlineUsers();
  });

  // Send chat history to new connection
  Message.find().sort({ timestamp: 1 })
    .then(messages => socket.emit('loadMessages', messages))
    .catch(err => console.error('Failed to load messages:', err));

  // Text message
  socket.on('chatMessage', async (msg) => {
    try {
      const message = new Message({
        sender: msg.sender,
        content: msg.content,
        type: 'text',
        timestamp: new Date()
      });
      await message.save();
      io.emit('chatMessage', message);
    } catch (error) {
      console.error('Error saving chatMessage:', error);
    }
  });

  // File message (image/video/other base64)
  socket.on('chatFile', async (msg) => {
    try {
      const message = new Message({
        sender: msg.sender,
        content: msg.content,
        type: 'file',
        timestamp: new Date()
      });
      await message.save();
      io.emit('chatFile', message);
    } catch (error) {
      console.error('Error saving chatFile:', error);
    }
  });

  // Delete
  socket.on('deleteMessage', async (id) => {
    try {
      await Message.findByIdAndDelete(id);
      io.emit('deleteMessage', id);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  // WebRTC signaling: call, answer, ice-candidate, reject, end
  socket.on('call-user', ({ targetId, offer, caller, isVideo }) => {
    const targetSocket = users.get(targetId);
    console.log(`call-user from ${socket.username} to ${targetId} (isVideo=${!!isVideo})`);
    if (targetSocket) {
      io.to(targetSocket).emit('incoming-call', { from: socket.username, offer, caller, isVideo: !!isVideo });
    }
  });

  socket.on('answer-call', ({ targetId, answer }) => {
    const targetSocket = users.get(targetId);
    if (targetSocket) io.to(targetSocket).emit('call-answered', { answer });
  });

  socket.on('ice-candidate', ({ targetId, candidate }) => {
    const targetSocket = users.get(targetId);
    if (targetSocket) io.to(targetSocket).emit('ice-candidate', { candidate });
  });

  socket.on('reject-call', ({ targetId }) => {
    const targetSocket = users.get(targetId);
    if (targetSocket) io.to(targetSocket).emit('call-rejected');
  });

  socket.on('end-call', ({ targetId }) => {
    const targetSocket = users.get(targetId);
    if (targetSocket) io.to(targetSocket).emit('end-call');
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      users.delete(socket.username);
      console.log(`User ${socket.username} disconnected`);
      emitOnlineUsers();
    }
  });
});

// -----------------
// Start server
// -----------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// graceful shutdown
process.on('SIGINT', () => {
  console.log('Graceful shutdown');
  server.close(async () => {
    await mongoose.disconnect();
    console.log('MongoDB disconnected. Exiting.');
    process.exit(0);
  });
});
