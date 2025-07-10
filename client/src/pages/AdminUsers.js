import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const AdminUsers = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/admin/users');
      setUsers(res.data.users);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    setUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.patch(`/api/admin/users/${id}/role`, { role: newRole });
      setUsers((prev) => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      toast.success('Role updated!');
    } catch (err) {
      toast.error('Failed to update role');
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.delete(`/api/admin/users/${id}`);
      setUsers((prev) => prev.filter(u => u.id !== id));
      toast.success('User deleted!');
    } catch (err) {
      toast.error('Failed to delete user');
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <h3>Access Denied</h3>
        <p>You need admin privileges to view this page.</p>
        <Link to="/" className="btn btn-primary">
          Go Home
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return <div className="empty-state"><h3>{error}</h3></div>;
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', color: 'var(--text-color)' }}>
        👥 Manage Users
      </h1>
      <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '0.5rem 1rem', borderRadius: 4, border: '1px solid var(--border)', minWidth: 250 }}
        />
      </div>
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                <td>{u.order_count || 0}</td>
                <td>${Number(u.total_spent || 0).toFixed(2)}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  {u.id === currentUser?.id ? (
                    <span style={{ color: 'var(--accent-color)' }}>You</span>
                  ) : (
                    <>
                      <select
                        value={u.role}
                        disabled={updating[u.id]}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: 4 }}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        className="btn btn-outline btn-small"
                        style={{ color: 'red', borderColor: 'red' }}
                        disabled={updating[u.id]}
                        onClick={() => handleDelete(u.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link to="/admin" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default AdminUsers; 