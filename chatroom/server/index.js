// server/index.js
// Full backend with OTP, Socket.IO chat, and call signaling.

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express(); // ✅ Define app FIRST
const server = http.createServer(app); // ✅ Create server AFTER app

// ✅ Allow your Firebase frontend to access backend
app.use(cors({
  origin: ['https://nonnle.web.app'], // your Firebase hosting domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional route files
let authRoutes = null;
let adminRoutes = null;
try {
  authRoutes = require('./routes/auth');
} catch (e) { /* ignore if not present */ }
try {
  adminRoutes = require('./routes/admin');
} catch (e) { /* ignore if not present */ }

// Models
const Message = require('./models/messages');
const User = require('./models/User');

// Validate env
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not set in environment');
  process.exit(1);
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. OTP email sending will fail until these are provided.');
}

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

// OTP Store
const otpStore = {};

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

// =================== OTP ROUTES ===================
app.post('/api/otp/send', async (req, res) => { /* ... same logic ... */ });
app.post('/api/otp/verify', async (req, res) => { /* ... same logic ... */ });
app.post('/api/otp/resend', async (req, res) => { /* ... same logic ... */ });

// =================== API ROUTES ===================
if (authRoutes) app.use('/api/auth', authRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);

// Serve frontend build in production
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

// =================== SOCKET.IO ===================
const io = socketIO(server, {
  cors: {
    origin: ['https://nonnle.web.app'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const users = new Map();
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
    emitOnlineUsers();
  });

  Message.find().sort({ timestamp: 1 })
    .then(messages => socket.emit('loadMessages', messages))
    .catch(err => console.error('Failed to load messages:', err));

  socket.on('chatMessage', async (msg) => {
    try {
      const message = new Message({ sender: msg.sender, content: msg.content, type: 'text', timestamp: new Date() });
      await message.save();
      io.emit('chatMessage', message);
    } catch (error) {
      console.error('Error saving chatMessage:', error);
    }
  });

  socket.on('chatFile', async (msg) => {
    try {
      const message = new Message({ sender: msg.sender, content: msg.content, type: 'file', timestamp: new Date() });
      await message.save();
      io.emit('chatFile', message);
    } catch (error) {
      console.error('Error saving chatFile:', error);
    }
  });

  socket.on('deleteMessage', async (id) => {
    try {
      await Message.findByIdAndDelete(id);
      io.emit('deleteMessage', id);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  // WebRTC signaling
  socket.on('call-user', ({ targetId, offer, caller, isVideo }) => {
    const targetSocket = users.get(targetId);
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
      emitOnlineUsers();
    }
  });
});

// =================== SERVER START ===================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

process.on('SIGINT', () => {
  console.log('Graceful shutdown');
  server.close(async () => {
    await mongoose.disconnect();
    console.log('MongoDB disconnected. Exiting.');
    process.exit(0);
  });
});
