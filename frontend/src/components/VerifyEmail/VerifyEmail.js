// frontend/src/components/VerifyEmail/VerifyEmail.js
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import './VerifyEmail.css';

// Minimal helper for CSRF token so authenticated users don't hit CSRF errors
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

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
      const csrfToken = getCookie('csrftoken');

      const response = await fetch('/api/auth/verify-email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified! You can now access all features.');
        setTimeout(() => {
          window.location.href = '/profile';
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || data.detail || 'Verification failed');
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
              <p className="hint-text">Hang tight while we confirm your activation link.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="verification-icon success">
                <CheckCircle size={48} />
              </div>
              <h2>Email Verified!</h2>
              <p className="verification-message">{message}</p>
              <p className="hint-text">Redirecting you to your profile...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="verification-icon error">
                <AlertCircle size={48} />
              </div>
              <h2>Verification Failed</h2>
              <p className="verification-message">{message}</p>
              <div className="verification-actions">
                <a href="/login" className="auth-button">Back to Login</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
