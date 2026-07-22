import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, normalizeUser } from '../context/AppContext';
import { ShieldCheck, Loader2, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function OtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, setCurrentUser, setIsAuthenticated, setMfaVerified, setDukcapilVerified } = useApp();

  const state = location.state as { tempToken?: string } | null;
  const tempToken = state?.tempToken;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const timerRef = useRef<any>(null);

  // Redirect to home if tempToken is missing
  useEffect(() => {
    if (!tempToken) {
      navigate('/', { replace: true });
    }
  }, [tempToken, navigate]);

  // Start 5-minute countdown timer
  useEffect(() => {
    if (!tempToken) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setError('OTP has expired. Please request a new code.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tempToken]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    setError(null);
    setSuccessMessage(null);

    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6 || !/^\d+$/.test(trimmedOtp)) {
      setError('Please enter a valid 6-digit numeric OTP code.');
      return;
    }

    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tempToken, otp: trimmedOtp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      // Successful verification
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
      console.error('Verify OTP error:', err);
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!tempToken || resending) return;
    setError(null);
    setSuccessMessage(null);
    setResending(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tempToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend OTP.');
      }

      // Reset timer and state
      setTimeLeft(300);
      setOtp('');
      setSuccessMessage('A fresh OTP code has been sent to your Gmail inbox.');

      // Restart timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setError('OTP has expired. Please request a new code.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (!tempToken) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-surface px-6 animate-fade-in">
      <div className="max-w-md w-full glass-card rounded-xl p-8 border border-outline-variant/60 shadow-2xl text-center bg-white/70">

        {/* Header Icon */}
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
          <ShieldCheck size={32} />
        </div>

        <h2 className="text-2xl font-bold font-display mb-2 text-on-surface">Enter Verification Code</h2>
        <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
          For security, we sent a 6-digit verification code to your registered Google email address. Please enter it below.
        </p>

        {/* Expiry Countdown */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 rounded-full bg-surface-container-high text-xs font-semibold text-primary">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          Code expires in: <span className="font-mono">{formatTime(timeLeft)}</span>
        </div>

        <form onSubmit={handleVerify} className="space-y-6 text-left">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">MFA Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
              placeholder="e.g. 123456"
              className="input-field text-center font-mono text-xl tracking-[0.5em] py-3.5"
              autoFocus
              disabled={timeLeft === 0 || loading}
            />
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span className="text-left font-medium">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <ShieldCheck size={14} className="flex-shrink-0 text-emerald-600" />
              <span className="text-left font-medium">{successMessage}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={otp.length !== 6 || timeLeft === 0 || loading}
              className="w-full btn-primary py-3 justify-center text-sm font-bold shadow-md shadow-primary/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Verifying Code...
                </span>
              ) : (
                'Verify & Log In'
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full btn-secondary py-3 justify-center text-sm font-bold border-outline hover:bg-surface-container"
            >
              {resending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Sending...
                </span>
              ) : (
                'Resend Verification Code'
              )}
            </button>
          </div>
        </form>

        {/* Back Link */}
        <div className="mt-8 pt-6 border-t border-outline-variant/60">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1.5 mx-auto font-semibold"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </button>
        </div>

      </div>
    </div>
  );
}
