import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Use .env if provided, otherwise default to deployed API
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://chatroom1-6.onrender.com';

  const loginUser = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || data.message || 'Invalid credentials');

      // Save login data
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      // Navigate to chatroom for all users
      navigate('/chatroom');
    } catch (err) {
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#191970] overflow-hidden font-sans">
      {/* Background neon text */}
      <h1 className="absolute text-[9rem] text-[#00ffff] opacity-20 font-extrabold tracking-wide select-none z-0">
        KSC
      </h1>

      {/* Login Form */}
      <form
        onSubmit={loginUser}
        className="relative z-10 bg-black bg-opacity-80 p-10 rounded-3xl shadow-[0_0_10px_#00ffff] w-full max-w-md border border-[#00ffff]"
      >
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="KSC Logo" className="w-16 h-16 rounded-full shadow-[0_0_10px_#00ffff]" />
        </div>

        <h2 className="text-3xl font-extrabold text-center text-[#00ffff] mb-6">
          Login to Chat
        </h2>

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          className="w-full mb-4 px-4 py-3 bg-black text-[#00ffff] border border-[#00ffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full mb-6 px-4 py-3 bg-black text-[#00ffff] border border-[#00ffff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00ffff] hover:bg-[#00cccc] text-black font-semibold py-3 rounded-lg transition"
        >
          {loading ? 'Please wait...' : 'Login'}
        </button>

        <p className="mt-4 text-center text-sm text-[#00ffff]">
          Don&apos;t have an account?{' '}
          <span
            onClick={() => navigate('/register')}
            className="text-[#ff00ff] hover:underline cursor-pointer font-medium"
          >
            Register here
          </span>
        </p>
      </form>
    </div>
  );
}

export default Login;
