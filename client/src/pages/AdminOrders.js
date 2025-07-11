import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const statusOptions = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
];

const AdminOrders = () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (isAdmin) fetchOrders();
  }, [isAdmin]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/admin/orders');
      setOrders(res.data.orders);
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.patch(`/api/orders/${id}/status`, { status: newStatus });
      setOrders((prev) => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      toast.success('Order status updated!');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
    setUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.delete(`/api/admin/orders/${id}`);
      setOrders((prev) => prev.filter(o => o.id !== id));
      toast.success('Order deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete order');
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

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
    return <div className="loading">Loading orders...</div>;
  }

  if (error) {
    return <div className="empty-state"><h3>{error}</h3></div>;
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', color: 'var(--text-color)' }}>
        📦 Manage Orders
      </h1>
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Items</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.username}</td>
                <td>{o.email}</td>
                <td>₹{Number(o.total_amount).toFixed(2)}</td>
                <td style={{ textTransform: 'capitalize' }}>{o.status}</td>
                <td style={{ textTransform: 'capitalize' }}>{o.payment_type || 'N/A'}</td>
                <td>{o.item_count}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td>
                  <select
                    value={o.status}
                    disabled={updating[o.id]}
                    onChange={e => handleStatusChange(o.id, e.target.value)}
                    style={{ padding: '0.25rem 0.5rem', borderRadius: 4 }}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-danger"
                    style={{ marginLeft: 8 }}
                    onClick={() => handleDeleteOrder(o.id)}
                    disabled={updating[o.id]}
                  >
                    Delete
                  </button>
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

export default AdminOrders; 