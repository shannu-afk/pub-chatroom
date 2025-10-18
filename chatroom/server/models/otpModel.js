// server/models/otpModel.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } }, // 5 minutes
  username: { type: String }, // optional: store username with OTP
  passwordHash: { type: String } // optional: hashed password to create user after verify
});

module.exports = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
