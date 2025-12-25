'use client';

import { useState, useEffect, useRef } from 'react';
import { UserPlus, AlertCircle, ChevronLeft, Lock, CheckSquare, Search, Shield, Sparkles } from 'lucide-react';
import { AuthUser } from '@/types/todo';
import {
  hashPin,
  verifyPin,
  isValidPin,
  getRandomUserColor,
  getUserInitials,
  isLockedOut,
  incrementLockout,
  clearLockout,
  setStoredSession,
  getLockoutState,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface LoginScreenProps {
  onLogin: (user: AuthUser) => void;
}

type Screen = 'users' | 'pin' | 'register';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [screen, setScreen] = useState<Screen>('users');
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, color, role, created_at, last_login')
        .order('name');
      if (data) {
        setUsers(data.map(u => ({ ...u, role: u.role || 'member' })));
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const firstLetter = user.name[0].toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(user);
    return acc;
  }, {} as Record<string, AuthUser[]>);

  useEffect(() => {
    if (!selectedUser) return;
    const checkLockout = () => {
      const { locked, remainingSeconds } = isLockedOut(selectedUser.id);
      setLockoutSeconds(locked ? remainingSeconds : 0);
      const state = getLockoutState(selectedUser.id);
      setAttemptsRemaining(Math.max(0, 3 - state.attempts));
    };
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  const handleUserSelect = (user: AuthUser) => {
    setSelectedUser(user);
    setScreen('pin');
    setPin(['', '', '', '']);
    setError('');
    const state = getLockoutState(user.id);
    setAttemptsRemaining(Math.max(0, 3 - state.attempts));
    setTimeout(() => pinRefs.current[0]?.focus(), 100);
  };

  const handlePinChange = (
    index: number,
    value: string,
    refs: React.RefObject<(HTMLInputElement | null)[]>,
    pinState: string[],
    setPinState: (p: string[]) => void
  ) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinState];
    newPin[index] = value.slice(-1);
    setPinState(newPin);
    if (value && index < 3) {
      refs.current?.[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (
    e: React.KeyboardEvent,
    index: number,
    refs: React.RefObject<(HTMLInputElement | null)[]>,
    pinState: string[],
  ) => {
    if (e.key === 'Backspace' && !pinState[index] && index > 0) {
      refs.current?.[index - 1]?.focus();
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedUser || lockoutSeconds > 0) return;

    const pinString = pin.join('');
    if (!isValidPin(pinString)) {
      setError('Enter a 4-digit PIN');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { data } = await supabase
        .from('users')
        .select('pin_hash')
        .eq('id', selectedUser.id)
        .single();

      if (!data) {
        setError('User not found');
        setIsSubmitting(false);
        return;
      }

      const isValid = await verifyPin(pinString, data.pin_hash);

      if (isValid) {
        clearLockout(selectedUser.id);
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', selectedUser.id);
        setStoredSession(selectedUser);
        onLogin(selectedUser);
      } else {
        const lockout = incrementLockout(selectedUser.id);
        const remaining = Math.max(0, 3 - lockout.attempts);
        setAttemptsRemaining(remaining);
        if (lockout.lockedUntil) {
          setError('Too many attempts. Please wait.');
        } else {
          setError(`Incorrect PIN`);
        }
        setPin(['', '', '', '']);
        pinRefs.current[0]?.focus();
      }
    } catch {
      setError('Something went wrong.');
    }

    setIsSubmitting(false);
  };

  const handleRegister = async () => {
    const name = newUserName.trim();
    if (!name) {
      setError('Enter your name');
      return;
    }

    const pinString = newUserPin.join('');
    if (!isValidPin(pinString)) {
      setError('Enter a 4-digit PIN');
      return;
    }

    const confirmString = confirmPin.join('');
    if (pinString !== confirmString) {
      setError('PINs don\'t match');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const pinHash = await hashPin(pinString);
      const color = getRandomUserColor();

      const { data, error: insertError } = await supabase
        .from('users')
        .insert({ name, pin_hash: pinHash, color, role: 'member' })
        .select('id, name, color, role, created_at, last_login')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Name already taken');
        } else {
          setError('Failed to create account');
        }
        setIsSubmitting(false);
        return;
      }

      if (data) {
        const userData = { ...data, role: data.role || 'member' };
        setStoredSession(userData);
        onLogin(userData);
      }
    } catch {
      setError('Something went wrong.');
    }

    setIsSubmitting(false);
  };

  useEffect(() => {
    if (screen === 'pin' && pin.every((d) => d !== '') && !isSubmitting) {
      handlePinSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, screen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1628] relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/3 w-[600px] h-[600px] bg-[#C9A227]/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-[#1E3A5F]/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#E5B936] flex items-center justify-center shadow-lg shadow-[#C9A227]/30">
              <CheckSquare className="w-7 h-7 text-[#0A1628]" />
            </div>
            <div className="absolute -inset-2 bg-[#C9A227]/20 rounded-3xl blur-xl animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#C9A227] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#C9A227] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#C9A227] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1628] p-4 overflow-hidden relative">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:z-50">
        Skip to content
      </a>

      {/* Sophisticated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#C9A227]/15 via-[#1E3A5F]/20 to-transparent rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-[#1E3A5F]/30 via-[#2563EB]/10 to-transparent rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-[#C9A227]/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-px h-32 bg-gradient-to-b from-transparent via-[#C9A227]/30 to-transparent" />
        <div className="absolute bottom-32 right-24 w-px h-24 bg-gradient-to-b from-transparent via-[#C9A227]/20 to-transparent" />
        <div className="absolute top-1/3 right-16 w-24 h-px bg-gradient-to-r from-transparent via-[#C9A227]/20 to-transparent" />
      </div>

      <div id="main-content" className="w-full max-w-[420px] relative z-10">
        {screen === 'users' && (
          <div className="relative">
            {/* Card glow effect */}
            <div className="absolute -inset-px bg-gradient-to-b from-[#C9A227]/20 via-white/5 to-transparent rounded-[28px] blur-sm" />

            <div className="relative bg-white/[0.03] backdrop-blur-2xl rounded-[28px] border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/40">
              {/* Premium Header */}
              <div className="relative p-8 text-center overflow-hidden">
                {/* Header gradient layers */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C9A227]/10 via-transparent to-transparent" />

                {/* Animated accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A227]/50 to-transparent" />

                <div className="relative z-10">
                  {/* Logo with glow */}
                  <div className="relative inline-block mb-5">
                    <div className="absolute inset-0 bg-[#C9A227] rounded-2xl blur-xl opacity-30 scale-125" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-[#C9A227] to-[#E5B936] rounded-2xl flex items-center justify-center shadow-lg shadow-[#C9A227]/30 ring-1 ring-white/10">
                      <CheckSquare className="w-8 h-8 text-[#0A1628]" aria-hidden="true" />
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-white tracking-tight">Bealer Agency</h1>
                  <p className="text-sm text-white/50 mt-1.5 font-medium tracking-wide uppercase">Task Management</p>
                </div>
              </div>

              {/* Search bar for larger user lists */}
              {users.length > 5 && (
                <div className="px-5 pt-5">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 transition-colors group-focus-within:text-[#C9A227]" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Search team members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40 focus:border-[#C9A227]/50 focus:bg-white/[0.08] transition-all duration-200 min-h-[48px]"
                      aria-label="Search users"
                    />
                  </div>
                </div>
              )}

              {/* Users list */}
              {filteredUsers.length > 0 ? (
                <div className="px-5 py-5 max-h-[50vh] sm:max-h-[340px] overflow-y-auto">
                  <div className="flex items-center gap-3 mb-4 px-1">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Select Account</p>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>

                  {users.length > 10 ? (
                    Object.entries(groupedUsers).sort().map(([letter, letterUsers]) => (
                      <div key={letter} className="mb-4">
                        <p className="text-xs font-bold text-[#C9A227]/60 px-2 py-1 mb-1">{letter}</p>
                        <div className="space-y-1.5">
                          {letterUsers.map((user) => (
                            <UserButton key={user.id} user={user} onSelect={handleUserSelect} />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map((user) => (
                        <UserButton key={user.id} user={user} onSelect={handleUserSelect} />
                      ))}
                    </div>
                  )}
                </div>
              ) : users.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="relative inline-block mb-5">
                    <div className="absolute inset-0 bg-[#C9A227]/20 rounded-2xl blur-lg" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-[#C9A227]" />
                    </div>
                  </div>
                  <p className="text-white font-semibold text-lg">Welcome!</p>
                  <p className="text-sm text-white/40 mt-1.5">Create your first account to get started</p>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                    <Search className="w-6 h-6 text-white/30" />
                  </div>
                  <p className="text-white/50">No results for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}

              {/* Add user button - only shown when no users exist */}
              {users.length === 0 && (
                <div className="p-5 bg-gradient-to-b from-transparent to-white/[0.02]">
                  <button
                    onClick={() => {
                      setScreen('register');
                      setNewUserName('');
                      setNewUserPin(['', '', '', '']);
                      setConfirmPin(['', '', '', '']);
                      setError('');
                    }}
                    className="group relative w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-[#C9A227] to-[#E5B936] hover:from-[#E5B936] hover:to-[#C9A227] text-[#0A1628] rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-[#C9A227]/25 hover:shadow-xl hover:shadow-[#C9A227]/30 min-h-[56px] text-base overflow-hidden"
                    aria-label="Add new user account"
                  >
                    <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    <UserPlus className="w-5 h-5 relative z-10 transition-transform group-hover:scale-110" aria-hidden="true" />
                    <span className="relative z-10">Get Started</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {screen === 'pin' && selectedUser && (
          <div className="relative">
            <div className="absolute -inset-px bg-gradient-to-b from-[#C9A227]/20 via-white/5 to-transparent rounded-[28px] blur-sm" />

            <div className="relative bg-white/[0.03] backdrop-blur-2xl rounded-[28px] border border-white/[0.08] p-6 sm:p-8 shadow-2xl shadow-black/40">
              <button
                onClick={() => {
                  setScreen('users');
                  setSearchQuery('');
                }}
                className="group flex items-center gap-1.5 text-sm text-white/40 hover:text-white mb-6 transition-all duration-200 min-h-[44px] -ml-2 px-2 rounded-lg hover:bg-white/[0.05]"
                aria-label="Go back to user selection"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                Back
              </button>

              <div className="text-center mb-8">
                {/* User avatar with glow */}
                <div className="relative inline-block mb-5">
                  <div
                    className="absolute inset-0 rounded-2xl blur-xl opacity-40 scale-110"
                    style={{ backgroundColor: selectedUser.color }}
                  />
                  <div
                    className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl ring-2 ring-white/20"
                    style={{ backgroundColor: selectedUser.color }}
                    aria-hidden="true"
                  >
                    {getUserInitials(selectedUser.name)}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white tracking-tight">{selectedUser.name}</h2>
                <p className="text-sm text-white/40 mt-2 flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#C9A227]" />
                  Enter your 4-digit PIN
                </p>

                {lockoutSeconds === 0 && attemptsRemaining < 3 && (
                  <div className="mt-4 inline-flex items-center gap-2 text-xs text-amber-400/80 font-medium bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3 sm:gap-4 mb-6" role="group" aria-label="PIN entry">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { pinRefs.current[index] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, pinRefs, pin, setPin)}
                    onKeyDown={(e) => handlePinKeyDown(e, index, pinRefs, pin)}
                    disabled={lockoutSeconds > 0 || isSubmitting}
                    aria-label={`PIN digit ${index + 1}`}
                    className={`w-14 h-16 sm:w-16 sm:h-[72px] text-center text-2xl sm:text-3xl font-bold rounded-2xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                      lockoutSeconds > 0
                        ? 'border-red-500/50 bg-red-500/10 focus:ring-red-500/20 text-red-400'
                        : digit
                          ? 'border-[#C9A227] bg-[#C9A227]/10 focus:ring-[#C9A227]/20 shadow-sm text-white'
                          : 'border-white/10 focus:border-[#C9A227] focus:ring-[#C9A227]/10 bg-white/[0.03] text-white'
                    }`}
                  />
                ))}
              </div>

              {(error || lockoutSeconds > 0) && (
                <div className="flex items-center justify-center gap-3 text-red-400 text-sm bg-red-500/10 py-4 px-5 rounded-xl border border-red-500/20" role="alert">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="font-medium">{lockoutSeconds > 0 ? `Account locked. Please wait ${lockoutSeconds}s` : error}</span>
                </div>
              )}

              {isSubmitting && (
                <div className="flex flex-col items-center gap-3" aria-live="polite">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-3 border-[#C9A227]/20 rounded-full" />
                    <div className="absolute inset-0 border-3 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="text-sm text-white/50">Verifying...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {screen === 'register' && (
          <div className="relative">
            <div className="absolute -inset-px bg-gradient-to-b from-[#C9A227]/20 via-white/5 to-transparent rounded-[28px] blur-sm" />

            <div className="relative bg-white/[0.03] backdrop-blur-2xl rounded-[28px] border border-white/[0.08] p-6 sm:p-8 shadow-2xl shadow-black/40">
              <button
                onClick={() => setScreen('users')}
                className="group flex items-center gap-1.5 text-sm text-white/40 hover:text-white mb-6 transition-all duration-200 min-h-[44px] -ml-2 px-2 rounded-lg hover:bg-white/[0.05]"
                aria-label="Go back to user selection"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
                Back
              </button>

              <div className="text-center mb-8">
                <div className="relative inline-block mb-5">
                  <div className="absolute inset-0 bg-[#2563EB] rounded-2xl blur-xl opacity-30 scale-110" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/10">
                    <UserPlus className="w-8 h-8 text-white" aria-hidden="true" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
                <p className="text-sm text-white/40 mt-1.5">Join the team in seconds</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-6">
                <div>
                  <label htmlFor="user-name" className="block text-sm font-semibold text-white/70 mb-2.5">
                    Your Name
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                    autoComplete="name"
                    className="w-full px-4 py-4 rounded-xl bg-white/[0.05] border border-white/[0.1] focus:border-[#C9A227]/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/20 transition-all duration-200 text-white placeholder-white/30 text-base min-h-[56px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2.5">
                    Choose a PIN
                  </label>
                  <div className="flex justify-center gap-3" role="group" aria-label="Choose PIN">
                    {newUserPin.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { newPinRefs.current[index] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(index, e.target.value, newPinRefs, newUserPin, setNewUserPin)}
                        onKeyDown={(e) => handlePinKeyDown(e, index, newPinRefs, newUserPin)}
                        aria-label={`New PIN digit ${index + 1}`}
                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#C9A227]/10 ${
                          digit ? 'border-[#C9A227] bg-[#C9A227]/10 shadow-sm text-white' : 'border-white/10 bg-white/[0.03] focus:border-[#C9A227] focus:bg-white/[0.05] text-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2.5">
                    Confirm PIN
                  </label>
                  <div className="flex justify-center gap-3" role="group" aria-label="Confirm PIN">
                    {confirmPin.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { confirmPinRefs.current[index] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(index, e.target.value, confirmPinRefs, confirmPin, setConfirmPin)}
                        onKeyDown={(e) => handlePinKeyDown(e, index, confirmPinRefs, confirmPin)}
                        aria-label={`Confirm PIN digit ${index + 1}`}
                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                          digit ? 'border-emerald-500 bg-emerald-500/10 focus:ring-emerald-500/20 shadow-sm text-white' : 'border-white/10 bg-white/[0.03] focus:border-emerald-500 focus:bg-white/[0.05] focus:ring-emerald-500/10 text-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center justify-center gap-3 text-red-400 text-sm bg-red-500/10 py-4 px-5 rounded-xl border border-red-500/20" role="alert">
                    <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full py-4 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#2563EB]/25 hover:shadow-xl hover:shadow-[#2563EB]/30 min-h-[56px] text-base overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ChevronLeft className="w-4 h-4 rotate-180 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer branding */}
        <div className="mt-8 text-center">
          <p className="text-white/20 text-xs font-medium tracking-widest uppercase">
            Bealer Agency
          </p>
        </div>
      </div>
    </div>
  );
}

// Refined user button component
function UserButton({ user, onSelect }: { user: AuthUser; onSelect: (user: AuthUser) => void }) {
  return (
    <button
      onClick={() => onSelect(user)}
      className="group w-full flex items-center gap-4 p-3.5 rounded-xl hover:bg-white/[0.05] active:bg-white/[0.08] transition-all duration-200 text-left min-h-[64px] border border-transparent hover:border-white/[0.08]"
      aria-label={`Sign in as ${user.name}`}
    >
      {/* Avatar with glow on hover */}
      <div className="relative flex-shrink-0">
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300"
          style={{ backgroundColor: user.color }}
        />
        <div
          className="relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold shadow-md text-sm ring-1 ring-white/10 group-hover:ring-white/20 transition-all duration-200"
          style={{ backgroundColor: user.color }}
          aria-hidden="true"
        >
          {getUserInitials(user.name)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-semibold text-white block truncate text-base group-hover:text-white transition-colors">{user.name}</span>
        {user.last_login && (
          <p className="text-xs text-white/30 mt-0.5 group-hover:text-white/40 transition-colors">
            Last login {new Date(user.last_login).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Lock icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/[0.05] group-hover:bg-[#C9A227] flex items-center justify-center transition-all duration-200 border border-white/[0.06] group-hover:border-transparent">
        <Lock className="w-4 h-4 text-white/40 group-hover:text-[#0A1628] transition-colors" aria-hidden="true" />
      </div>
    </button>
  );
}
