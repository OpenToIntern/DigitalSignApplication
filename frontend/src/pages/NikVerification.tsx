import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NikVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const state = location.state as { tempToken?: string } | null;
  const tempToken = state?.tempToken;

  const [nik, setNik] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect to home if tempToken is missing
  useEffect(() => {
    if (!tempToken) {
      navigate('/', { replace: true });
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    setError(null);

    const trimmedNik = nik.trim();
    if (trimmedNik.length !== 16 || !/^\d+$/.test(trimmedNik)) {
      setError('Please enter a valid 16-digit numeric NIK.');
      return;
    }

    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/verify-nik`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tempToken, nik: trimmedNik }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Identity verification failed.');
      }

      // Success - NIK verified, proceeding to MFA OTP
      if (data.mfaPending) {
        navigate('/verify-otp', { replace: true, state: { tempToken: data.tempToken } });
      } else {
        throw new Error('Unexpected response state. Please try logging in again.');
      }
    } catch (err: any) {
      console.error('Verify NIK error:', err);
      setError(err.message || 'An error occurred during NIK verification.');
    } finally {
      setLoading(false);
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

        <h2 className="text-2xl font-bold font-display mb-2 text-on-surface">Identity Verification</h2>
        <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
          Please verify your identity by entering your 16-digit NIK (National ID Number).
        </p>

        {/* NFR/Dev Notice */}
        <div className="mb-6 p-3 rounded-lg bg-surface-container-high border border-outline-variant text-[11px] text-on-surface-variant text-left leading-relaxed">
          <strong>Note:</strong> This is a mockup NIK identity check. Real Dukcapil API access is out of scope. For testing, please use the NIK registered to your signatory account.
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">National ID Number (NIK)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={16}
              value={nik}
              onChange={(e) => {
                setNik(e.target.value.replace(/\D/g, '').slice(0, 16));
                setError(null);
              }}
              placeholder="e.g. 3175010101990001"
              className="input-field text-center font-mono text-lg tracking-[0.2em] py-3.5"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span className="text-left font-medium">{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={nik.length !== 16 || loading}
              className="w-full btn-primary py-3 justify-center text-sm font-bold shadow-md shadow-primary/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Verifying Identity...
                </span>
              ) : (
                'Verify Identity'
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
