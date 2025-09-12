import React, { useEffect } from 'react';

const GoogleAuth = () => {
  useEffect(() => {
    // Redirect to backend Google OAuth route
    const backendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://kripapickles.shop';
    window.location.href = `${backendUrl}/api/auth/google`;
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥒</div>
      <h2>Redirecting to Google...</h2>
      <p>Please wait while we redirect you to Google for authentication.</p>
    </div>
  );
};

export default GoogleAuth; 