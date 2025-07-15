import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FaBox, FaTruck, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';

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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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
      await axios.put(`/api/admin/orders/${id}/status`, { status: newStatus });
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

  const fetchOrderDetails = async (orderId) => {
    setDetailsLoading(true);
    try {
      const response = await axios.get(`/api/admin/orders/${orderId}`);
      setSelectedOrder(response.data.order);
    } catch (error) {
      toast.error('Failed to fetch order details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock style={{ color: '#FF9800' }} />;
      case 'processing':
        return <FaBox style={{ color: '#2196F3' }} />;
      case 'shipped':
        return <FaTruck style={{ color: '#9C27B0' }} />;
      case 'delivered':
        return <FaCheckCircle style={{ color: '#4CAF50' }} />;
      case 'cancelled':
        return <FaTimesCircle style={{ color: '#f44336' }} />;
      default:
        return <FaClock style={{ color: '#FF9800' }} />;
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
              <th>Shipping Address</th>
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
                <td style={{ maxWidth: 180, fontSize: '0.95rem', color: '#666', wordBreak: 'break-word' }}>{o.shipping_address}</td>
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
                  <button
                    className="btn btn-outline btn-small"
                    style={{ marginLeft: 8 }}
                    onClick={() => fetchOrderDetails(o.id)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Order Details Modal */}
      {selectedOrder && (
        <div style={{
          margin: '2rem auto',
          maxWidth: 700,
          background: 'var(--background)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border)',
          padding: '2rem',
          position: 'relative',
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)'
        }}>
          <button
            style={{ position: 'absolute', top: 10, right: 10, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setSelectedOrder(null)}
            aria-label="Close"
          >✕</button>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Order #{selectedOrder.id} Details</h2>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Status:</strong> <span style={{ marginLeft: 8 }}>{getStatusIcon(selectedOrder.status)} {selectedOrder.status}</span>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Customer:</strong> {selectedOrder.username} ({selectedOrder.email})
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Shipping Address:</strong>
            <div style={{ color: 'var(--light-text)', marginTop: 4 }}>{selectedOrder.shipping_address}</div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Payment Type:</strong> {selectedOrder.payment_type || 'N/A'}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Order Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Total Amount:</strong> ₹{Number(selectedOrder.total_amount).toFixed(2)}
            {selectedOrder.delivery_fee > 0 && (
              <span style={{ fontSize: '0.95rem', color: 'var(--light-text)', marginLeft: 8 }}>
                + ₹{selectedOrder.delivery_fee} delivery
              </span>
            )}
            {selectedOrder.delivery_fee === 0 && (
              <span style={{ fontSize: '0.95rem', color: '#4CAF50', marginLeft: 8 }}>
                ✓ Free delivery
              </span>
            )}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Order Items:</strong>
            <ul style={{ marginTop: 8 }}>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                selectedOrder.items.map(item => (
                  <li key={item.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: 14, color: '#666' }}>{item.description}</div>
                        <div style={{ fontSize: 14 }}>Qty: {item.quantity} × ₹{item.price}</div>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li>No items found for this order.</li>
              )}
            </ul>
          </div>
        </div>
      )}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link to="/admin" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default AdminOrders; 