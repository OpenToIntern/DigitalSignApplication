import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PenSquare, Shield, CheckCircle, ArrowRight, ShieldCheck, Bell, FileText, Lock, Cloud, Sparkles, UserPlus, History, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react'



export default function Landing() {
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  // Toggle between signup and login modes in the modal
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login')

  // Signup form state
  const [fullName, setFullName] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Form feedback state
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  // Handle errors passed from OAuth callback redirection
  useEffect(() => {
    if (location.state?.error) {
      setFormError(location.state.error);
      setShowAuthDialog(true);
      setAuthMode('login');
      // Clear navigation state to prevent persistence on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);


  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'openid email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  // Reusable post-auth routing: handles nikPending and mfaPending responses
  const handleAuthResponse = (data: any) => {
    if (data.nikPending) {
      navigate('/verify-nik', { replace: true, state: { tempToken: data.tempToken } });
      return;
    }
    if (data.mfaPending) {
      navigate('/verify-otp', { replace: true, state: { tempToken: data.tempToken } });
      return;
    }
    // Unexpected: no pending step — shouldn't happen in normal flow
    setFormError('Unexpected server response. Please try again.');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !emailAddress.trim() || !password) {
      setFormError('Please fill out all fields.');
      return;
    }

    setFormLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: emailAddress.trim(), password }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setFormError(data.error || 'This email is already registered. Please log in instead.');
        return;
      }
      if (!res.ok) {
        setFormError(data.error || 'Registration failed. Please try again.');
        return;
      }

      setShowAuthDialog(false);
      handleAuthResponse(data);
    } catch (err: any) {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!emailAddress.trim() || !password) {
      setFormError('Please enter your email and password.');
      return;
    }

    setFormLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddress.trim(), password }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setFormError(data.error || 'Invalid email or password.');
        return;
      }
      if (!res.ok) {
        setFormError(data.error || 'Login failed. Please try again.');
        return;
      }

      setShowAuthDialog(false);
      handleAuthResponse(data);
    } catch (err: any) {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const openDialog = (mode: 'signup' | 'login' = 'signup') => {
    setAuthMode(mode);
    setFormError(null);
    setFullName('');
    setEmailAddress('');
    setPassword('');
    setShowPassword(false);
    setShowAuthDialog(true);
  };

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary/20 selection:text-primary min-h-screen flex flex-col justify-between">
      
      {/* TopNavBar Shell */}
      <nav className="flex justify-between items-center w-full px-6 md:px-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant h-16">
        <div className="flex items-center gap-8">
          <span 
            className="text-headline-md font-headline-md font-bold text-primary tracking-tight cursor-pointer"
            onClick={() => navigate('/')}
          >
            SignHere
          </span>
          <div className="hidden md:flex gap-6">
            <button className="text-primary font-bold border-b-2 border-primary pb-1 font-label-md text-label-md">
              Documents
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors" title="Search">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <div className="h-8 w-[1px] bg-outline-variant mx-1 hidden md:block"></div>
          <button className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors" title="Notifications">
            <Bell size={18} />
          </button>
          <button 
            onClick={() => openDialog('login')}
            className="btn-primary text-xs py-1.5 px-3 rounded-lg"
          >
            Log In
          </button>

        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="hero-gradient pt-20 pb-24 px-6 md:px-16 relative overflow-hidden bg-gradient-to-b from-primary-container/30 to-background">
          <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <div className="z-10 animate-fade-in text-left">
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary font-label-md text-label-md tracking-wider uppercase">
                Enterprise Trust Guaranteed
              </span>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-6 leading-[1.1]">
                The Gold Standard for <span className="text-primary text-glow font-bold">Digital Identity</span> and Signing.
              </h1>
              <p className="text-body-lg font-body-lg text-on-surface-variant mb-10 max-w-lg">
                Accelerate your business workflows with a secure, compliant, and effortless e-signature platform designed for the modern enterprise.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => openDialog('signup')}
                  className="px-8 py-4 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >

                  Log In to Get Started
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Right Graphic card */}
            <div className="relative animate-slide-up">
              <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full"></div>
              <div className="glass-card rounded-xl p-6 shadow-2xl relative bg-white/70 border border-outline-variant/50">
                
                <div className="flex items-center justify-between mb-8 border-b border-outline-variant/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-primary">
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-headline-md text-label-md font-bold text-on-surface">Service_Agreement.pdf</h3>
                      <p className="text-label-sm font-label-sm text-on-surface-variant font-mono">Modified 2m ago</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-label-sm font-label-sm font-bold">
                    Active
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="h-4 bg-surface-container-high rounded-full w-full"></div>
                  <div className="h-4 bg-surface-container-high rounded-full w-5/6"></div>
                  <div className="h-4 bg-surface-container-high rounded-full w-4/6"></div>
                  <div className="pt-8 flex flex-col items-center">
                    <div 
                      onClick={() => setShowAuthDialog(true)}
                      className="w-full h-32 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 flex flex-col items-center justify-center group cursor-pointer hover:border-primary transition-colors"
                    >
                      <PenSquare size={28} className="text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-label-md font-label-md font-bold text-primary">Click to sign here</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <div className="w-3 h-3 rounded-full bg-surface-container-high"></div>
                    <div className="w-3 h-3 rounded-full bg-surface-container-high"></div>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-label-md font-label-md text-on-surface-variant flex items-center gap-1">
                      <Lock size={14} />
                      AES-256
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-12 bg-surface-container-low border-y border-outline-variant/60">
          <div className="max-w-[1200px] mx-auto px-6 md:px-16">
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-80 hover:opacity-100 transition-all duration-300">
              <div className="flex items-center gap-2 text-on-surface-variant font-bold">
                <ShieldCheck size={28} className="text-primary" />
                <span className="text-sm uppercase tracking-wider">ISO 27001</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-bold">
                <Lock size={28} className="text-primary" />
                <span className="text-sm uppercase tracking-wider">SOC2 TYPE II</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-bold">
                <Shield size={28} className="text-primary" />
                <span className="text-sm uppercase tracking-wider">GDPR READY</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-bold">
                <PenSquare size={28} className="text-primary" />
                <span className="text-sm uppercase tracking-wider">AES ENCRYPTION</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works (Bento Grid) */}
        <section className="py-24 px-6 md:px-16 bg-background">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">
                Effortless Compliance in Minutes
              </h2>
              <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl mx-auto">
                Stop wasting time on physical paperwork. SignHere streamlines the entire document lifecycle from creation to archival.
              </p>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* Large Bento Card */}
              <div className="col-span-12 md:col-span-8 bg-surface-container-low p-8 md:p-10 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between text-left">
                <div>
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Cloud size={28} />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
                    One-Click Upload & Prep
                  </h3>
                  <p className="text-body-md font-body-md text-on-surface-variant mb-8 max-w-md">
                    Drag and drop your contracts, NDAs, or HR forms. Our system automatically configures baseline integrity checks and prepares the document for secure routing in seconds.
                  </p>
                </div>
                <div className="overflow-hidden rounded-lg border border-outline-variant/60 bg-white p-2">
                  <div className="h-32 rounded bg-surface-container-low flex items-center justify-center text-xs text-on-surface-variant/40 italic">
                    Drag & drop files preview dashboard
                  </div>
                </div>
              </div>

              {/* Small Bento 1 */}
              <div className="col-span-12 md:col-span-4 bg-surface-container-high/40 p-8 md:p-10 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow text-left">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <UserPlus size={28} />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
                  Smart Routing
                </h3>
                <p className="text-body-md font-body-md text-on-surface-variant">
                  Set complex signing orders and automated reminders for multi-party agreements.
                </p>
              </div>

              {/* Small Bento 2 */}
              <div className="col-span-12 md:col-span-4 bg-surface-container-high/40 p-8 md:p-10 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow text-left">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <History className="w-7 h-7" />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
                  Audit Trails
                </h3>
                <p className="text-body-md font-body-md text-on-surface-variant">
                  Every action is recorded with a cryptographically sealed audit log for legal protection.
                </p>
              </div>

              {/* Medium Bento Card */}
              <div className="col-span-12 md:col-span-8 bg-surface-container-low p-8 md:p-10 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row items-center gap-10 text-left">
                <div className="flex-1">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
                    Mobile-First Experience
                  </h3>
                  <p className="text-body-md font-body-md text-on-surface-variant">
                    Sign anywhere, on any device. Our responsive UI ensures recipients can execute documents safely from their smartphones.
                  </p>
                </div>
                <div className="hidden lg:flex flex-1 items-center justify-center p-4 bg-white rounded-lg border border-outline-variant/60 h-40">
                  <span className="text-[10px] font-mono text-on-surface-variant/40">Smartphone UI preview</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 md:px-16 bg-primary relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-[80px] -ml-48 -mb-48"></div>
          <div className="max-w-[1200px] mx-auto relative z-10">
            <h2 className="font-headline-lg text-headline-lg text-on-primary mb-8 font-display">
              Ready to secure your workflows?
            </h2>
            <p className="text-body-lg font-body-lg text-on-primary/80 mb-12 max-w-2xl mx-auto">
              Join the 50,000+ professionals who trust SignHere for their most critical agreements. No credit card required to start.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <button 
                onClick={() => openDialog('signup')}
                className="px-10 py-5 bg-background text-primary font-headline-md text-headline-md rounded-xl hover:bg-white transition-all shadow-xl font-bold"
              >
                Create Free Account
              </button>

              <button 
                onClick={() => alert('Contacting sales department...')}
                className="px-10 py-5 border border-white/30 text-white font-headline-md text-headline-md rounded-xl hover:bg-white/10 transition-all font-bold"
              >
                Contact Sales
              </button>
            </div>
            
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/70 text-label-md font-label-md">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-white" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-white" />
                Unlimited trial documents
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-white" />
                Cancel anytime
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-outline-variant pt-20 pb-10 px-6 md:px-16 text-left">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-20">
            <div className="col-span-2 lg:col-span-1">
              <span className="text-headline-md font-headline-md font-bold text-primary mb-6 block">SignHere</span>
              <p className="text-xs text-on-surface-variant mb-6">
                The modern platform for high-stakes document signing and identity verification.
              </p>
              <div className="flex gap-4">
                <a className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" href="#">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </a>
              </div>
            </div>
            
            {['Product', 'Solutions', 'Company', 'Support'].map((col, index) => (
              <div key={index}>
                <h4 className="font-label-md text-label-md text-on-surface mb-6 uppercase tracking-widest">{col}</h4>
                <ul className="space-y-4">
                  <li><a className="text-xs text-on-surface-variant hover:text-primary transition-colors" href="#">Features</a></li>
                  <li><a className="text-xs text-on-surface-variant hover:text-primary transition-colors" href="#">Security</a></li>
                  <li><a className="text-xs text-on-surface-variant hover:text-primary transition-colors" href="#">Pricing</a></li>
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-outline-variant pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-on-surface-variant">© 2026 SignHere Technologies Inc. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs text-on-surface-variant">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                System Operational
              </span>
              <select className="bg-transparent border-none text-xs text-on-surface-variant focus:ring-0 cursor-pointer">
                <option>English (US)</option>
              </select>
            </div>
          </div>
        </div>
      </footer>      {/* Auth Dialog — Sign Up / Log In */}
      {showAuthDialog && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md bg-white border border-outline-variant p-6 sm:p-8">

            <div className="text-center mb-5">
              <h2 className="font-display text-xl font-bold text-on-surface mb-1">
                {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {authMode === 'signup' ? 'Start your 14-day free trial today.' : 'Sign in to access your documents.'}
              </p>
            </div>

            {/* Google OAuth */}
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors text-sm font-bold text-on-surface"
              >
                <svg width="16" height="16" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-outline-variant/60" />
              <span className="text-[10px] text-on-surface-variant/70 uppercase tracking-wider font-semibold">
                {authMode === 'signup' ? 'Or sign up with email' : 'Or log in with email'}
              </span>
              <div className="flex-1 h-px bg-outline-variant/60" />
            </div>

            {/* SIGN UP FORM */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 text-left">Full Name</label>
                  <input
                    id="signup-fullname"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={e => { setFullName(e.target.value); setFormError(null); }}
                    className="input-field"
                    disabled={formLoading}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 text-left">Email Address</label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    value={emailAddress}
                    onChange={e => { setEmailAddress(e.target.value); setFormError(null); }}
                    className="input-field"
                    disabled={formLoading}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 text-left">Password</label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setFormError(null); }}
                      className="input-field pr-10"
                      disabled={formLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Inline error */}
                {formError && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-left">{formError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAuthDialog(false)}
                    className="btn-secondary py-2.5 flex-1 justify-center"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary py-2.5 flex-1 justify-center"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Creating...</span>
                    ) : 'Create Account'}
                  </button>
                </div>

                <p className="text-center text-xs text-on-surface-variant pt-1">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setAuthMode('login'); setFormError(null); }} className="text-primary font-bold hover:underline">
                    Log in instead
                  </button>
                </p>
              </form>
            )}

            {/* LOG IN FORM */}
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 text-left">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="name@company.com"
                    value={emailAddress}
                    onChange={e => { setEmailAddress(e.target.value); setFormError(null); }}
                    className="input-field"
                    disabled={formLoading}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 text-left">Password</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setFormError(null); }}
                      className="input-field pr-10"
                      disabled={formLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Inline error */}
                {formError && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-left">{formError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAuthDialog(false)}
                    className="btn-secondary py-2.5 flex-1 justify-center"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary py-2.5 flex-1 justify-center"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Signing In...</span>
                    ) : 'Sign In'}
                  </button>
                </div>

                <p className="text-center text-xs text-on-surface-variant pt-1">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setAuthMode('signup'); setFormError(null); }} className="text-primary font-bold hover:underline">
                    Sign up instead
                  </button>
                </p>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
