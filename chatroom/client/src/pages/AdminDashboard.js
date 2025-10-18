import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  const API_BASE = 'https://chatroom1-6.onrender.com';

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 403) {
        setError('Access denied. You are not an admin.');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        console.error('Fetch users failed:', res.status, text);
        setError(`Failed to fetch users: ${text}`);
        return;
      }

      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users. Please try again later.');
    }
  }, [API_BASE, token]);

  const promoteUser = async (id) => {
    try {
      await fetch(`${API_BASE}/api/admin/make-admin/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to promote user');
    }
  };

  const removeUser = async (id) => {
    try {
      await fetch(`${API_BASE}/api/admin/remove-user/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (role !== 'admin') {
      navigate('/chatroom');
      return;
    }
    fetchUsers();
  }, [fetchUsers, token, role, navigate]);

  if (error) {
    return (
      <div className="p-6 bg-black min-h-screen text-[#ff00ff]">
        <h2 className="text-3xl font-bold mb-4 text-[#ff00ff]">Admin Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black min-h-screen text-[#00ffff]">
      <h2 className="text-3xl font-bold mb-6 text-[#00ffff]">Admin Dashboard</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-black border border-[#00ffff] rounded-lg">
          <thead>
            <tr className="bg-[#00ffff] text-black text-left">
              <th className="px-4 py-2 border border-[#00ffff]">Username</th>
              <th className="px-4 py-2 border border-[#00ffff]">Role</th>
              <th className="px-4 py-2 border border-[#00ffff]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-[#ff00ff] hover:text-black transition-colors">
                <td className="px-4 py-2 border border-[#00ffff]">{user.username}</td>
                <td className="px-4 py-2 border border-[#00ffff]">{user.role}</td>
                <td className="px-4 py-2 border border-[#00ffff] space-x-2">
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => promoteUser(user._id)}
                      className="bg-[#00ffff] hover:bg-[#00cccc] text-black px-3 py-1 rounded transition"
                    >
                      Make Admin
                    </button>
                  )}
                  <button
                    onClick={() => removeUser(user._id)}
                    className="bg-[#ff00ff] hover:bg-[#cc00cc] text-black px-3 py-1 rounded transition"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;
