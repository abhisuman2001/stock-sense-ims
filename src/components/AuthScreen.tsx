import React, { useState } from 'react';
import { api, setStoredUser } from '../lib/api';
import { User } from '../types';
import { StockSenseLogo } from './StockSenseLogo';
import { Shield, KeyRound, Mail, UserCheck, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
  initialMode?: 'login' | 'signup';
  onBackToLanding?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  initialMode = 'login',
  onBackToLanding,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'verify_otp'>(initialMode);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('manager');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('stocksense_token', res.access_token);
      setStoredUser(res.user);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.signup(email, password, fullName, role);
      localStorage.setItem('stocksense_token', res.access_token);
      setStoredUser(res.user);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(email);
      setInfo(res.debug_otp ? `OTP generated: ${res.debug_otp} (valid for 15 mins)` : res.message);
      setMode('verify_otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtpReset(email, otpCode, newPassword);
      setInfo(res.message);
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(demoEmail, 'Password123!');
      localStorage.setItem('stocksense_token', res.access_token);
      setStoredUser(res.user);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1816] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#262420] border border-[#34312B] p-8 shadow-none">
        {onBackToLanding && (
          <div className="mb-4 pb-3 border-b border-[#34312B]">
            <button
              type="button"
              onClick={onBackToLanding}
              className="text-xs font-mono text-[#8B8478] hover:text-[#F2C230] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
          </div>
        )}

        {/* Brand header */}
        <div className="flex items-center justify-center mb-6 text-center">
          <StockSenseLogo variant="full" size="lg" showSubtitle={true} />
        </div>

        {/* Status messages */}
        {error && (
          <div className="mb-4 p-3 bg-[rgba(217,83,79,0.15)] border border-[#D9534F] text-[#D9534F] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 bg-[rgba(95,168,93,0.15)] border border-[#5FA85D] text-[#5FA85D] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{info}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@stocksense.io"
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setInfo(null);
                    setMode('forgot');
                  }}
                  className="text-xs text-[#8B8478] hover:text-[#F2C230] transition-colors"
                >
                  Forgot OTP reset?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-sm py-2.5 px-4 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Demo Access Bar */}
            <div className="pt-4 border-t border-[#34312B]">
              <div className="text-[11px] font-mono uppercase text-[#8B8478] mb-2 tracking-wider">
                Instant Demo Access (Seeded):
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickDemoLogin('demo@stocksense.io')}
                  className="border border-[#34312B] bg-[#1A1816] hover:border-[#8B8478] text-[#F5F3EF] text-xs py-2 px-2 text-left"
                >
                  <div className="font-semibold text-[11px] text-[#F2C230]">Inventory Manager</div>
                  <div className="text-[10px] text-[#8B8478] truncate">demo@stocksense.io</div>
                </button>
                <button
                  type="button"
                  onClick={() => quickDemoLogin('staff@stocksense.io')}
                  className="border border-[#34312B] bg-[#1A1816] hover:border-[#8B8478] text-[#F5F3EF] text-xs py-2 px-2 text-left"
                >
                  <div className="font-semibold text-[11px] text-[#4A90D9]">Floor Operator</div>
                  <div className="text-[10px] text-[#8B8478] truncate">staff@stocksense.io</div>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-[#8B8478]">Need an account? </span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setMode('signup');
                }}
                className="text-xs text-[#F2C230] hover:underline font-medium"
              >
                Sign up
              </button>
            </div>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Marcus Miller"
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marcus@warehouse.io"
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                Assigned Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'manager' | 'staff')}
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
              >
                <option value="manager">Inventory Manager (Approvals & Setup)</option>
                <option value="staff">Floor Staff / Operator (Pick & Putaway)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-sm py-2.5 px-4 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-[#8B8478]">Already have credentials? </span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setMode('login');
                }}
                className="text-xs text-[#F2C230] hover:underline font-medium"
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD REQUEST OTP */}
        {mode === 'forgot' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-[#8B8478] leading-relaxed">
              Enter your registered operator email. The system will issue a secure 6-digit OTP code for authorization.
            </p>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@stocksense.io"
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-sm py-2.5 px-4 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Generate 6-Digit OTP</span>}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-[#8B8478] hover:text-[#F5F3EF]"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* VERIFY OTP & RESET PASSWORD */}
        {mode === 'verify_otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                6-Digit Security OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-center text-lg tracking-[0.3em] font-mono text-[#F2C230] focus:outline-none focus:border-[#F2C230]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-sm py-2.5 px-4 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-[#8B8478] hover:text-[#F5F3EF]"
              >
                Cancel and return
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
