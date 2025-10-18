import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [emailForOtp, setEmailForOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Use .env if provided, otherwise default to deployed API
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://chatroom1-6.onrender.com';

  // Step 1: Send OTP
  const sendOTP = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      alert("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed');
      
      setShowOtpSection(true);
      setEmailForOtp(email);
      localStorage.setItem('otpEmail', email);

      alert('OTP sent to your email');
    } catch (err) {
      alert(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Register
  const verifyOTP = async (e) => {
    e.preventDefault();
    const savedEmail = emailForOtp || localStorage.getItem('otpEmail');

    if (!otp || otp.length !== 6) {
      alert('Enter valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedEmail, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Verification failed');

      localStorage.removeItem('otpEmail');
      alert('Registration complete — you can now login');
      navigate('/');
    } catch (err) {
      alert(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden font-sans">
      <h1 className="absolute text-[9rem] text-[#00ffff] opacity-20 font-extrabold tracking-wide select-none z-0">
        KSC
      </h1>

      <form
        onSubmit={showOtpSection ? verifyOTP : sendOTP}
        className="relative z-10 bg-black bg-opacity-80 p-10 rounded-3xl shadow-[0_0_10px_#00ffff] w-full max-w-md border border-[#00ffff]"
      >
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="KSC Logo" className="w-16 h-16 rounded-full shadow-[0_0_10px_#00ffff]" />
        </div>

        <h2 className="text-3xl font-extrabold text-center text-[#00ffff] mb-6">
          {showOtpSection ? 'Verify OTP' : 'Create Account'}
        </h2>

        {!showOtpSection && (
          <>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full mb-4 px-4 py-3 bg-black text-[#00ffff] border border-[#00ffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full mb-4 px-4 py-3 bg-black text-[#00ffff] border border-[#00ffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full mb-4 px-4 py-3 bg-black text-[#00ffff] border border-[#00ffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter Password"
              required
              className="w-full mb-6 px-4 py-3 bg-black text-[#00ffff] border border-[#00ffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
            />
          </>
        )}

        {showOtpSection && (
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter 6-digit OTP"
            required
            className="w-full mb-6 px-4 py-3 bg-black text-[#00ffff] border border-[#00ffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00ffff] hover:bg-[#00cccc] text-black font-semibold py-3 rounded-lg transition"
        >
          {loading ? 'Please wait...' : showOtpSection ? 'Verify OTP' : 'Send OTP'}
        </button>

        {!showOtpSection && (
          <p className="mt-4 text-center text-sm text-[#00ffff]">
            Already have an account?{' '}
            <span
              onClick={() => navigate('/')}
              className="text-[#ff00ff] hover:underline cursor-pointer font-medium"
            >
              Login here
            </span>
          </p>
        )}
      </form>
    </div>
  );
}

export default Register;
