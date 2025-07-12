import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaBox, FaTruck, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Orders = () => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders/my-orders');
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}`);
      setSelectedOrder(response.data.order);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'processing':
        return '#2196F3';
      case 'shipped':
        return '#9C27B0';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#f44336';
      default:
        return '#FF9800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="empty-state">
        <h3>Please login to view your orders</h3>
        <Link to="/login" className="btn btn-primary">
          Login
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading your orders...</div>;
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', color: 'var(--text-color)' }}>
        📦 My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
          <h3>No orders yet</h3>
          <p>Start shopping to see your orders here!</p>
          <Link to="/pickles" className="btn btn-primary">
            Browse Pickles
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {orders.map(order => (
            <div key={order.id} className="card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                    Order #{order.id}
                  </h3>
                  <p style={{ color: 'var(--light-text)', fontSize: '0.875rem' }}>
                    {formatDate(order.created_at)}
                  </p>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    color: getStatusColor(order.status)
                  }}>
                    {getStatusIcon(order.status)}
                    <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>
                      {order.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    ₹{order.total_amount}
                  </div>
                  {order.delivery_fee > 0 && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--light-text)' }}>
                      + ₹{order.delivery_fee} delivery
                    </div>
                  )}
                  {order.delivery_fee === 0 && (
                    <div style={{ fontSize: '0.875rem', color: '#4CAF50' }}>
                      ✓ Free delivery
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--light-text)', marginBottom: '0.5rem' }}>
                    {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                  </p>
                  {order.shipping_address && (
                    <p style={{ color: 'var(--light-text)', fontSize: '0.875rem' }}>
                      📍 {order.shipping_address.substring(0, 50)}...
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => fetchOrderDetails(order.id)}
                  className="btn btn-outline btn-small"
                >
                  View Details
                </button>
              </div>

              {/* Order Details Modal */}
              {selectedOrder && selectedOrder.id === order.id && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: 'var(--background)', 
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border)'
                }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Order Details</h4>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Shipping Address:</strong>
                    <p style={{ marginTop: '0.25rem', color: 'var(--light-text)' }}>
                      {selectedOrder.shipping_address}
                    </p>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Delivery Information:</strong>
                    <div style={{ marginTop: '0.25rem', color: 'var(--light-text)' }}>
                      <div>Type: {selectedOrder.delivery_type || 'standard'} delivery</div>
                      {selectedOrder.delivery_fee > 0 ? (
                        <div>Delivery Fee: ₹{selectedOrder.delivery_fee}</div>
                      ) : (
                        <div style={{ color: '#4CAF50' }}>✓ Free delivery</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Order Items:</strong>
                    {selectedOrder.items && selectedOrder.items.map(item => (
                      <div key={item.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        background: 'var(--white)',
                        borderRadius: 'var(--border-radius)'
                      }}>
                        <div>
                          <div style={{ fontWeight: '600' }}>{item.name}</div>
                          <div style={{ color: 'var(--light-text)', fontSize: '0.875rem' }}>
                            Quantity: {item.quantity}
                          </div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border)',
                    fontWeight: 'bold',
                    fontSize: '1.125rem'
                  }}>
                    <span>Total:</span>
                    <span style={{ color: 'var(--primary-color)' }}>
                      ₹{selectedOrder.total_amount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Back to Shopping */}
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <Link to="/pickles" className="btn btn-outline">
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default Orders; 