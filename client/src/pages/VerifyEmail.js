import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Verifying...');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      if (!token || !email) {
        setStatus('Invalid verification link.');
        setSuccess(false);
        return;
      }
      try {
        const res = await axios.get('/api/auth/verify-email', {
          params: { token, email }
        });
        setStatus(res.data.message || 'Email verified successfully!');
        setSuccess(true);
      } catch (err) {
        setStatus(err.response?.data?.error || 'Verification failed.');
        setSuccess(false);
      }
    };
    verify();
  }, [searchParams]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍋</div>
      <h2>{status}</h2>
      <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => navigate('/login')}>
        Go to Login
      </button>
    </div>
  );
};

export default VerifyEmail; 