// server/controllers/otpController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Otp = require('../models/otpModel');
const User = require('../models/User'); // your existing User model
const sendEmail = require('../utils/sendEmail');

function generateOtp() {
  // 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendOtp = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check if user/email already exists
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ error: 'Username or email already registered' });
    }

    const otp = generateOtp();
    const passwordHash = await bcrypt.hash(password, 10);

    // Save OTP record (old ones automatically expire due to TTL index)
    await Otp.findOneAndDelete({ email }); // remove previous OTPs for same email
    const record = new Otp({ username, email, otp, passwordHash });
    await record.save();

    // Send email (both text and HTML)
    await sendEmail({
      to: email,
      subject: 'Your KSC Chatroom OTP',
      text: `Hello ${username},\n\nYour OTP code is: ${otp}\nIt is valid for 5 minutes.\n\nIf you didn't request this, ignore.`,
      html: `<div style="font-family:Arial,sans-serif">
               <h3>Your KSC Chatroom OTP</h3>
               <p>Hello <strong>${username}</strong>,</p>
               <div style="padding:10px;border-radius:6px;background:#f3f4f6;display:inline-block">
                 <strong style="font-size:20px">${otp}</strong>
               </div>
               <p>This code is valid for 5 minutes.</p>
             </div>`
    });

    return res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('sendOtp error:', err);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const record = await Otp.findOne({ email, otp });
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Create the user (using stored username & hashed password)
    const existing = await User.findOne({ $or: [{ username: record.username }, { email: record.email }] });
    if (existing) {
      // Clean up OTP record
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ error: 'Username or email already registered' });
    }

    const newUser = new User({
      username: record.username,
      email: record.email,
      password: record.passwordHash,
      isVerified: true
    });
    await newUser.save();

    // Remove OTP entry
    await Otp.deleteOne({ _id: record._id });

    return res.json({ message: 'Registration complete', username: newUser.username });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};
