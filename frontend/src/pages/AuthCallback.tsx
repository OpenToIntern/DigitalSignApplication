import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { normalizeUser } from '../context/AppContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setCurrentUser, setIsAuthenticated, setMfaVerified, setDukcapilVerified } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasExchanged = useRef(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'access_denied') {
      navigate('/', { replace: true, state: { error: 'Sign-in was cancelled. Please try again.' } });
      return;
    } else if (errorParam) {
      navigate('/', { replace: true, state: { error: 'An error occurred during Google authentication. Please try again.' } });
      return;
    }

    const code = searchParams.get('code');
    if (!code) {
      if (hasExchanged.current) return;
      setError('Authorization code is missing. Please try signing in again.');
      setLoading(false);
      return;
    }

    if (hasExchanged.current) return;
    hasExchanged.current = true;

    // Clear code from the URL immediately so back button or refresh doesn't reuse it
    window.history.replaceState({}, document.title, window.location.pathname);

    const exchangeCode = async (authCode: string) => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: authCode }),
        });

        if (res.status === 403) {
          setError("This Google account isn't registered as a signatory. Contact your administrator.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to authenticate with Google.');
        }

        const data = await res.json();
        
        if (data.nikPending) {
          navigate('/verify-nik', { replace: true, state: { tempToken: data.tempToken } });
          return;
        }

        if (data.mfaPending) {
          navigate('/verify-otp', { replace: true, state: { tempToken: data.tempToken } });
          return;
        }

        // Log in the user
        const normalized = normalizeUser(data.user);
        setToken(data.token);
        setCurrentUser(normalized);
        setIsAuthenticated(true);
        setMfaVerified(true);
        setDukcapilVerified(true);

        // Redirect based on role
        const defaultRoutes: Record<string, string> = {
          user: '/dashboard',
          supervisor: '/supervisor',
          manager: '/manager',
        };
        navigate(defaultRoutes[normalized.accessRole] || '/dashboard', { replace: true });
      } catch (err: any) {
        console.error('OAuth exchange error:', err);
        setError(err.message || 'An unexpected error occurred during login.');
        setLoading(false);
      }
    };

    exchangeCode(code);
  }, [searchParams, navigate, setToken, setCurrentUser, setIsAuthenticated, setMfaVerified, setDukcapilVerified]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-surface animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <h2 className="text-xl font-bold font-display">Verifying your Google account...</h2>
          <p className="text-sm text-on-surface-variant">Please wait while we establish your secure session.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-surface px-6 animate-fade-in">
        <div className="max-w-md w-full glass-card rounded-xl p-8 border border-outline-variant/60 shadow-2xl text-center bg-white/70">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold font-display mb-3 text-red-600">Authentication Failed</h2>
          <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
