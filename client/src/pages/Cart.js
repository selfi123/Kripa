import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaPlus, FaMinus, FaShoppingCart, FaTruck, FaRocket } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotal, getCartItems } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const paymentTypes = [
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'gpay', label: 'GPay' },
    { value: 'amazon', label: 'Amazon Pay' }
  ];

  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    paymentType: 'card',
    coupon: ''
  });
  
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Calculate courier charge when cart or delivery options change
  useEffect(() => {
    const calculateCourierCharge = async () => {
      if (cart.length === 0) return;
      
      const subtotal = getCartTotal();
      try {
        const response = await axios.post('/api/orders/calculate-delivery-fee', {
          subtotal,
          state: checkoutForm.state,
          coupon: checkoutForm.coupon
        });
        
        setDeliveryFee(response.data.courierCharge);
        setTotalAmount(response.data.totalAmount);
      } catch (error) {
        console.error('Failed to calculate courier charge:', error);
        setDeliveryFee(0);
        setTotalAmount(subtotal);
      }
    };

    calculateCourierCharge();
  }, [cart, checkoutForm.state, checkoutForm.coupon, getCartTotal]);

  const handleQuantityChange = (pickleId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(pickleId);
    } else {
      updateQuantity(pickleId, newQuantity);
    }
  };

  const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_live_ycqb4Z5j4Weu3L';

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to complete your order');
      navigate('/login');
      return;
    }
    // Validate address fields
    if (!checkoutForm.name.trim() || !checkoutForm.phone.trim() || !checkoutForm.addressLine.trim() || !checkoutForm.city.trim() || !checkoutForm.state.trim() || !checkoutForm.pincode.trim() || !checkoutForm.country.trim()) {
      toast.error('Please fill in all address fields');
      return;
    }

    setCheckoutLoading(true);
    try {
      if (checkoutForm.paymentType !== 'cod') {
        // Create Razorpay order
        const amount = totalAmount;
        const { data } = await axios.post('/api/orders/create-razorpay-order', { amount });
        const razorpayOrder = data.order;
        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        script.onload = () => {
          const options = {
            key: RAZORPAY_KEY_ID,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            name: 'Kripa Pickles',
            description: 'Order Payment',
            order_id: razorpayOrder.id,
            handler: async function (response) {
              // Place order in backend after payment success
              const orderData = {
                items: getCartItems(),
                shippingAddress: `${checkoutForm.name}, ${checkoutForm.phone}, ${checkoutForm.addressLine}, ${checkoutForm.city}, ${checkoutForm.state}, ${checkoutForm.pincode}, ${checkoutForm.country}`,
                paymentType: checkoutForm.paymentType,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              };
              const backendResponse = await axios.post('/api/orders', orderData);
              if (backendResponse.data.message) {
                toast.success('Order placed successfully!');
                clearCart();
                navigate('/orders');
              }
            },
            prefill: {},
            theme: { color: '#4CAF50' }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
        };
        script.onerror = () => {
          toast.error('Failed to load payment gateway');
          setCheckoutLoading(false);
        };
        return;
      }
      // COD: Place order directly
      const orderData = {
        items: getCartItems(),
        shippingAddress: `${checkoutForm.name}, ${checkoutForm.phone}, ${checkoutForm.addressLine}, ${checkoutForm.city}, ${checkoutForm.state}, ${checkoutForm.pincode}, ${checkoutForm.country}`,
        paymentType: checkoutForm.paymentType,
        coupon: checkoutForm.coupon
      };
      const response = await axios.post('/api/orders', orderData);
      
      if (response.data.message) {
        toast.success('Order placed successfully!');
        clearCart();
        navigate('/orders');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to place order';
      toast.error(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some delicious pickles to get started!</p>
        <Link to="/pickles" className="btn btn-primary">
          Browse Pickles
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', color: 'var(--text-color)' }}>
        🛒 Your Cart
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
        {/* Cart Items */}
        <div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Cart Items ({cart.length})</h2>
          
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <img
                src={item.imageUrl || 'https://via.placeholder.com/100x100/4CAF50/ffffff?text=Pickle'}
                alt={item.name}
                className="cart-item-image"
              />
              
              <div className="cart-item-info">
                <h3>{item.name}</h3>
                <div className="cart-item-price">₹{item.price}</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    style={{ width: '30px', height: '30px', fontSize: '0.875rem' }}
                  >
                    <FaMinus />
                  </button>
                  <span style={{ fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    style={{ width: '30px', height: '30px', fontSize: '0.875rem' }}
                  >
                    <FaPlus />
                  </button>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="btn btn-outline btn-small"
                  style={{ color: '#f44336', borderColor: '#f44336' }}
                >
                  <FaTrash /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Section */}
        <div>
          <div className="cart-total">
            <h3>Order Summary</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>{item.name} × {item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Subtotal:</span>
              <span>₹{getCartTotal().toFixed(2)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Courier Charge:</span>
              <span style={{ color: deliveryFee === 0 ? '#4CAF50' : 'inherit' }}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
              </span>
            </div>
            
            {getCartTotal() < 1000 && (
              <div style={{ fontSize: '0.875rem', color: '#4CAF50', marginBottom: '0.5rem', textAlign: 'center' }}>
                Add ₹{(1000 - getCartTotal()).toFixed(2)} more for FREE courier!
              </div>
            )}
            
            <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            
            <div className="total-amount">
              Total: ₹{totalAmount.toFixed(2)}
            </div>

            {!isAuthenticated ? (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <p style={{ color: 'var(--light-text)', marginBottom: '1rem' }}>
                  Please login to complete your order
                </p>
                <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
                  Login to Checkout
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCheckout} style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    name="name"
                    value={checkoutForm.name}
                    onChange={e => setCheckoutForm(f => ({ ...f, name: e.target.value }))}
                    className="form-input"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    name="phone"
                    value={checkoutForm.phone}
                    onChange={e => setCheckoutForm(f => ({ ...f, phone: e.target.value }))}
                    className="form-input"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line</label>
                  <input
                    name="addressLine"
                    value={checkoutForm.addressLine}
                    onChange={e => setCheckoutForm(f => ({ ...f, addressLine: e.target.value }))}
                    className="form-input"
                    placeholder="House/Flat, Street, Area"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    name="city"
                    value={checkoutForm.city}
                    onChange={e => setCheckoutForm(f => ({ ...f, city: e.target.value }))}
                    className="form-input"
                    placeholder="City"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    name="state"
                    value={checkoutForm.state}
                    onChange={e => setCheckoutForm(f => ({ ...f, state: e.target.value }))}
                    className="form-input"
                    placeholder="State"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input
                    name="pincode"
                    value={checkoutForm.pincode}
                    onChange={e => setCheckoutForm(f => ({ ...f, pincode: e.target.value }))}
                    className="form-input"
                    placeholder="Pincode"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input
                    name="country"
                    value={checkoutForm.country}
                    onChange={e => setCheckoutForm(f => ({ ...f, country: e.target.value }))}
                    className="form-input"
                    placeholder="Country"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Payment Type</label>
                  <select
                    name="paymentType"
                    value={checkoutForm.paymentType}
                    onChange={e => setCheckoutForm(f => ({ ...f, paymentType: e.target.value }))}
                    className="form-input"
                    required
                  >
                    {paymentTypes.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Coupon Code (if any)</label>
                  <input
                    name="coupon"
                    value={checkoutForm.coupon}
                    onChange={e => setCheckoutForm(f => ({ ...f, coupon: e.target.value }))}
                    className="form-input"
                    placeholder="Enter coupon code"
                  />
                </div>
                
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: '1rem' }}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Processing...' : 'Place Order'}
                </button>
              </form>
            )}
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              onClick={clearCart}
              className="btn btn-outline"
              style={{ width: '100%' }}
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {/* Continue Shopping */}
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <Link to="/pickles" className="btn btn-outline">
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default Cart; 