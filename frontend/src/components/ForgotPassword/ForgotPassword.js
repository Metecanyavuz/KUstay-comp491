import { useState } from 'react';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import './ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || t('general.error', 'Something went wrong'));
      }
    } catch (err) {
      setError(t('general.error', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="success-message">
            <CheckCircle size={64} color="#2f855a" />
            <h2>{t('auth.resetSentTitle', 'Check Your Email')}</h2>
            <p>{t('auth.resetSentBody', "We've sent password reset instructions to")} <strong>{email}</strong></p>
            <p className="hint-text">
              {t('auth.resetSpamHint', "If you don't see the email, check your spam folder.")}
            </p>
            <a href="/login" className="back-link">
              <ArrowLeft size={18} />
              {t('auth.backToLogin', 'Back to Login')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-icon">
            <Mail size={32} />
          </div>
          <h1>{t('auth.forgotTitle', 'Reset password')}</h1>
          <p>{t('auth.forgotSubtitle', "Enter your email and we'll send you reset instructions")}</p>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t('auth.email', 'Email')}</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? t('general.loading', 'Loading...') : t('auth.forgotButton', 'Send reset link')}
          </button>
        </form>

        <div className="auth-switch">
          <a href="/login" className="back-link">
            <ArrowLeft size={18} />
            {t('auth.backToLogin', 'Back to Login')}
          </a>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
