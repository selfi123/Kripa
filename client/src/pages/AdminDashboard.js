import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaUsers, FaBox, FaDollarSign, FaShoppingCart, FaCog, FaPlus, FaList } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      setStats(response.data.stats);
      setRecentOrders(response.data.recentOrders);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', color: 'var(--text-color)' }}>
        🛠️ Admin Dashboard
      </h1>

      {/* Quick Actions */}
      <div style={{ 
        background: 'var(--white)', 
        padding: '2rem', 
        borderRadius: 'var(--border-radius)', 
        marginBottom: '2rem',
        boxShadow: 'var(--shadow)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link to="/admin/pickles" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaPlus /> Add New Pickle
          </Link>
          <Link to="/admin/orders" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaList /> Manage Orders
          </Link>
          <Link to="/admin/users" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaUsers /> Manage Users
          </Link>
          <Link to="/pickles" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaBox /> View Catalog
          </Link>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="admin-grid">
          <div className="admin-card">
            <FaShoppingCart style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '1rem' }} />
            <h3>Total Orders</h3>
            <div className="number">{stats.total_orders || 0}</div>
          </div>
          
          <div className="admin-card">
            <FaDollarSign style={{ fontSize: '2rem', color: 'var(--secondary-color)', marginBottom: '1rem' }} />
            <h3>Total Revenue</h3>
            <div className="number">{formatCurrency(stats.total_revenue)}</div>
          </div>
          
          <div className="admin-card">
            <FaUsers style={{ fontSize: '2rem', color: 'var(--accent-color)', marginBottom: '1rem' }} />
            <h3>Total Users</h3>
            <div className="number">{stats.total_users || 0}</div>
          </div>
          
          <div className="admin-card">
            <FaBox style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '1rem' }} />
            <h3>Total Pickles</h3>
            <div className="number">{stats.total_pickles || 0}</div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div style={{ 
        background: 'var(--white)', 
        padding: '2rem', 
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ color: 'var(--text-color)' }}>Recent Orders</h2>
          <Link to="/admin/orders" className="btn btn-outline btn-small">
            View All Orders
          </Link>
        </div>
        
        {recentOrders.length > 0 ? (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.username}</td>
                    <td style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: 'var(--border-radius)', 
                        fontSize: '0.875rem',
                        textTransform: 'capitalize',
                        background: order.status === 'delivered' ? '#4CAF50' : 
                                  order.status === 'shipped' ? '#9C27B0' :
                                  order.status === 'processing' ? '#2196F3' :
                                  order.status === 'cancelled' ? '#f44336' : '#FF9800',
                        color: 'white'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No recent orders</p>
          </div>
        )}
      </div>

      {/* Additional Stats */}
      {stats && (
        <div style={{ 
          background: 'var(--white)', 
          padding: '2rem', 
          borderRadius: 'var(--border-radius)',
          marginTop: '2rem',
          boxShadow: 'var(--shadow)'
        }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Additional Statistics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            <div>
              <h4 style={{ color: 'var(--light-text)', marginBottom: '0.5rem' }}>Average Order Value</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(stats.avg_order_value)}
              </div>
            </div>
            <div>
              <h4 style={{ color: 'var(--light-text)', marginBottom: '0.5rem' }}>Orders This Month</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>
                {stats.total_orders || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div style={{ 
        background: 'var(--white)', 
        padding: '2rem', 
        borderRadius: 'var(--border-radius)',
        marginTop: '2rem',
        boxShadow: 'var(--shadow)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Admin Tools</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <Link to="/admin/pickles" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ padding: '1.5rem' }}>
              <FaBox style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '1rem' }} />
              <h3>Manage Pickles</h3>
              <p style={{ color: 'var(--light-text)' }}>Add, edit, or remove pickles from the catalog</p>
            </div>
          </Link>
          
          <Link to="/admin/orders" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ padding: '1.5rem' }}>
              <FaShoppingCart style={{ fontSize: '2rem', color: 'var(--secondary-color)', marginBottom: '1rem' }} />
              <h3>Manage Orders</h3>
              <p style={{ color: 'var(--light-text)' }}>View and update order status</p>
            </div>
          </Link>
          
          <Link to="/admin/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ padding: '1.5rem' }}>
              <FaUsers style={{ fontSize: '2rem', color: 'var(--accent-color)', marginBottom: '1rem' }} />
              <h3>Manage Users</h3>
              <p style={{ color: 'var(--light-text)' }}>View user accounts and manage roles</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 