import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState('Authenticating...');

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token');
      
      if (token) {
        try {
          setStatus('Completing login...');
          // Call login in silent mode to suppress toasts
          const result = await login(token, undefined, true);
          
          if (result.success) {
            setStatus('Login successful! Redirecting...');
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 1000);
          } else {
            setStatus('Login failed. Redirecting to login page...');
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 2000);
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          setStatus('Login failed. Redirecting to login page...');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
        }
      } else {
        setStatus('No token found. Redirecting to login page...');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    };

    handleAuth();
  }, [searchParams, navigate, login]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥒</div>
      <h2>{status}</h2>
      <p>Please wait while we complete your login.</p>
    </div>
  );
};

export default AuthCallback; 