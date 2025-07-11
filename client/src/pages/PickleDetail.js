import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaStar, FaPlus, FaMinus } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const PickleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();

  const [pickle, setPickle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchPickle = async () => {
      try {
        const response = await axios.get(`/api/pickles/${id}`);
        setPickle(response.data.pickle);
      } catch (error) {
        navigate('/pickles');
      } finally {
        setLoading(false);
      }
    };
    fetchPickle();
  }, [id, navigate]);

  const handleQuantityChange = (delta) => {
    setQuantity(q => Math.max(1, Math.min(q + delta, pickle?.stock || 1)));
  };

  const handleAddToCart = () => {
    if (pickle && pickle.stock > 0) {
      addToCart(pickle, quantity);
    }
  };

  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewForm(prev => ({ ...prev, [name]: value }));
    setReviewError('');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
      setReviewError('Please select a rating between 1 and 5.');
      return;
    }
    setSubmittingReview(true);
    try {
      await axios.post(`/api/pickles/${id}/reviews`, reviewForm);
      setReviewForm({ rating: 5, comment: '' });
      // Refresh pickle data to show new review
      const response = await axios.get(`/api/pickles/${id}`);
      setPickle(response.data.pickle);
    } catch (error) {
      setReviewError(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar key={i} style={{ color: i <= rating ? '#FFD700' : '#ddd' }} />
      );
    }
    return stars;
  };

  if (loading) return <div className="loading">Loading pickle details...</div>;
  if (!pickle) return <div className="empty-state">Pickle not found.</div>;

  return (
    <div>
      <div className="pickle-detail">
        <img
          src={pickle.image_url || 'https://via.placeholder.com/400x400/4CAF50/ffffff?text=Pickle'}
          alt={pickle.name}
          className="pickle-image"
        />
        <div className="pickle-info">
          <h1>{pickle.name}</h1>
          <div className="pickle-price">₹{pickle.price}</div>
          <div className="card-rating" style={{ marginBottom: '1rem' }}>
            <span className="stars">{renderStars(Math.round(pickle.avg_rating))}</span>
            <span style={{ marginLeft: '0.5rem' }}>({pickle.review_count} reviews)</span>
          </div>
          <div className="pickle-description">{pickle.description}</div>
          <div style={{ marginBottom: '1rem', color: 'var(--light-text)' }}>
            Category: <b>{pickle.category || 'Uncategorized'}</b>
          </div>
          <div style={{ marginBottom: '1rem', color: pickle.stock > 0 ? 'var(--primary-color)' : '#f44336' }}>
            {pickle.stock > 0 ? `In Stock (${pickle.stock} available)` : 'Out of Stock'}
          </div>
          <div className="quantity-controls">
            <button className="quantity-btn" onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>
              <FaMinus />
            </button>
            <span className="quantity-display">{quantity}</span>
            <button className="quantity-btn" onClick={() => handleQuantityChange(1)} disabled={quantity >= pickle.stock}>
              <FaPlus />
            </button>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            onClick={handleAddToCart}
            disabled={pickle.stock === 0}
          >
            Add to Cart
          </button>
          <Link to="/pickles" className="btn btn-outline" style={{ width: '100%' }}>
            ← Back to Pickles
          </Link>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <h2 style={{ marginBottom: '1rem' }}>Reviews</h2>
        {pickle.reviews && pickle.reviews.length > 0 ? (
          pickle.reviews.map(review => (
            <div key={review.id} className="review">
              <div className="review-header">
                <span className="review-author">{review.username}</span>
                <span className="review-rating">{renderStars(review.rating)}</span>
                <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              <div className="review-comment">{review.comment}</div>
            </div>
          ))
        ) : (
          <div className="empty-state">No reviews yet. Be the first to review this pickle!</div>
        )}

        {/* Add Review Form */}
        {isAuthenticated ? (
          <form onSubmit={handleReviewSubmit} style={{ marginTop: '2rem', background: 'var(--white)', padding: '2rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Add Your Review</h3>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <select
                name="rating"
                value={reviewForm.rating}
                onChange={handleReviewChange}
                className="form-input"
                style={{ maxWidth: '120px' }}
                required
              >
                {[5,4,3,2,1].map(r => (
                  <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Comment</label>
              <textarea
                name="comment"
                value={reviewForm.comment}
                onChange={handleReviewChange}
                className="form-input"
                rows={3}
                placeholder="Share your thoughts about this pickle..."
                required
              />
            </div>
            {reviewError && <div className="form-error">{reviewError}</div>}
            <button type="submit" className="btn btn-primary" disabled={submittingReview}>
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        ) : (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link to="/login" className="btn btn-outline">Login to add a review</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickleDetail; 