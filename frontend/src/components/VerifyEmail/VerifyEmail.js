// frontend/src/components/VerifyEmail/VerifyEmail.js
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch('/api/auth/verify-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Email verified! You can now access all features.');
        setTimeout(() => {
          window.location.href = '/profile';
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="verification-status">
          {status === 'verifying' && (
            <>
              <div className="spinner"></div>
              <h2>Verifying your email...</h2>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle size={64} color="#10b981" />
              <h2>Email Verified!</h2>
              <p>{message}</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle size={64} color="#ef4444" />
              <h2>Verification Failed</h2>
              <p>{message}</p>
              <a href="/login" className="auth-button">Back to Login</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;