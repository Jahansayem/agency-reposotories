'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import { AlertCircle, ChevronDown, ChevronLeft, ChevronUp, Lock, CheckSquare, Search, Shield, Sparkles, Users, Zap, Ticket, Loader2, Check, Building2, Mail } from 'lucide-react';
import { AuthUser } from '@/types/todo';
import {
  isValidPin,
  getUserInitials,
  setStoredSession,
} from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { OAuthLoginButtons } from './OAuthLoginButtons';
import RegisterModal from './RegisterModal';
import { ContextualErrorMessages } from '@/lib/errorMessages';
import { fetchWithCsrf } from '@/lib/csrf';

interface LoginScreenProps {
  onLogin: (user: AuthUser) => void;
}

type Screen = 'users' | 'pin';

// Animated grid background
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(114,181,232,0.08)"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="gridFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="50%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="gridMask">
            <rect width="100%" height="100%" fill="url(#gridFade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" mask="url(#gridMask)" />
      </svg>
    </div>
  );
}

// Static geometric shapes (no animation)
function FloatingShapes() {
  return null; // Removed cheesy floating animations
}

// Clean logo without excessive animations
function Logo3D() {
  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Main logo */}
      <div
        className="relative w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #A8D4F5 0%, #72B5E8 25%, #0033A0 60%, #00205B 100%)',
          boxShadow: '0 20px 40px -10px rgba(0,51,160,0.4)',
        }}
      >
        {/* Inner highlight */}
        <div
          className="absolute inset-[2px] rounded-[22px] pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
          }}
        />
        {/* Icon */}
        <CheckSquare className="w-12 h-12 text-white relative z-10 drop-shadow-lg" strokeWidth={2.5} />
      </div>
    </motion.div>
  );
}

// Animated stat counter
function AnimatedCounter({ value, duration = 1.5, reduceMotion = false }: { value: number; duration?: number; reduceMotion?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setCount(value);
      return;
    }
    let start = 0;
    const end = value;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration, reduceMotion]);

  return <span className="tabular-nums">{count}</span>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [screen, setScreen] = useState<Screen>('users');
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<{ totalTasks: number; completedThisWeek: number; activeUsers: number } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);

  const features = [
    {
      Icon: Sparkles,
      title: 'AI-Powered Triage',
      description: 'Smart parsing turns messy notes into structured tasks instantly.',
      gradient: 'from-[#0033A0]/20 to-[#72B5E8]/20',
    },
    {
      Icon: Zap,
      title: 'Real-Time Sync',
      description: 'Changes appear instantly across all devices and team members.',
      gradient: 'from-amber-500/20 to-orange-500/20',
    },
    {
      Icon: Shield,
      title: 'Secure & Simple',
      description: 'PIN-based login designed for shared devices without friction.',
      gradient: 'from-emerald-500/20 to-teal-500/20',
    },
  ];

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, color, role, created_at, last_login')
        .order('name');
      if (data) {
        setUsers(data.map(u => ({ ...u, role: u.role || 'staff' })));
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const checkAndFetchStats = async () => {
      const lastShownDate = localStorage.getItem('statsLastShown');
      const today = new Date().toDateString();

      if (lastShownDate !== today) {
        setShowStats(true);

        const { count: totalTasks } = await supabase
          .from('todos')
          .select('*', { count: 'exact', head: true });

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const { count: completedThisWeek } = await supabase
          .from('todos')
          .select('*', { count: 'exact', head: true })
          .eq('completed', true)
          .gte('updated_at', startOfWeek.toISOString());

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: activeUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_login', sevenDaysAgo.toISOString());

        setTeamStats({
          totalTasks: totalTasks || 0,
          completedThisWeek: completedThisWeek || 0,
          activeUsers: activeUsers || 0,
        });

        localStorage.setItem('statsLastShown', today);
      } else {
        setShowStats(false);
      }
    };
    checkAndFetchStats();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Countdown timer for server-side lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleUserSelect = (user: AuthUser) => {
    setSelectedUser(user);
    setScreen('pin');
    setPin(['', '', '', '']);
    setError('');
    setAttemptsRemaining(5);
    setLockoutSeconds(0);
    setTimeout(() => pinRefs.current[0]?.focus(), 550);
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
      // Fetch CSRF token first
      const csrfResponse = await fetch('/api/csrf');
      if (!csrfResponse.ok) {
        const errorMsg = ContextualErrorMessages.login(new Error('CSRF fetch failed'));
        throw new Error(errorMsg.message);
      }
      const { token: csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ userId: selectedUser.id, pin: pinString }),
      });
      const result = await response.json();
      const isValid = response.ok && result.success;

      if (isValid) {
        // Store session in localStorage for client-side state (components use this to know who is logged in)
        // The HttpOnly cookie set by the server handles actual authentication
        setStoredSession(selectedUser);
        onLogin(selectedUser);
      } else {
        if (result.locked || response.status === 429) {
          setLockoutSeconds(result.remainingSeconds || 300);
          setError('Too many attempts. Please wait.');
        } else if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
          setError('Incorrect PIN');
        } else {
          setError(result.error || 'Incorrect PIN');
        }
        setPin(['', '', '', '']);
        pinRefs.current[0]?.focus();
      }
    } catch (err) {
      const errorMsg = ContextualErrorMessages.login(err);
      setError(`${errorMsg.message}. ${errorMsg.action}`);
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
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00205B] via-[#0033A0] to-[#1E3A5F] relative overflow-hidden">
          <AnimatedGrid />
          <FloatingShapes />

          <motion.div
            className="relative z-10 flex flex-col items-center gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Logo3D />
            <div className="w-8 h-8 border-2 border-[var(--brand-sky)]/30 border-t-[var(--brand-sky)] rounded-full animate-spin" />
            <p className="text-white/50 text-sm font-medium tracking-wider uppercase">
              Loading workspace...
            </p>
          </motion.div>
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden relative bg-gradient-to-br from-[#00205B] via-[#0033A0] to-[#1E3A5F]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white focus:px-4 focus:py-2 focus:rounded-[var(--radius-lg)] focus:z-50">
          Skip to content
        </a>

        {/* Background layers */}
        <AnimatedGrid />
        <FloatingShapes />

        {/* Static ambient light effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(114,181,232,0.1) 0%, transparent 60%)' }}
          />
          <div
            className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,51,160,0.15) 0%, transparent 60%)' }}
          />
        </div>

        <div className="relative z-10 w-full max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left side - Branding */}
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="max-w-lg">
              {/* Logo and badge */}
              <motion.div
                className="flex items-center gap-4 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Logo3D />
                <div>
                  <motion.div
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-sky-light)] mb-2"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Team Workspace
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Bealer Agency</h2>
                </div>
              </motion.div>

              {/* Main headline */}
              <motion.h1
                className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-white mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Your tasks,{' '}
                <span className="relative">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A8D4F5] via-[#72B5E8] to-[#0033A0]">
                    organized
                  </span>
                  <motion.span
                    className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-[#A8D4F5] via-[#72B5E8] to-transparent"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
              </motion.h1>

              <motion.p
                className="text-lg text-white/60 leading-relaxed mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                The AI-powered task management platform built for insurance teams.
                Stay aligned, move faster, close more.
              </motion.p>

              {/* Feature cards */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    className="group relative flex items-start gap-4 p-4 rounded-[var(--radius-2xl)] border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    whileHover={{ scale: 1.02, borderColor: 'rgba(114,181,232,0.3)' }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--brand-sky)]/20 to-[var(--brand-blue)]/20 flex items-center justify-center text-[var(--brand-sky)] border border-white/10">
                      <feature.Icon className="w-5 h-5" />
                    </div>
                    <div className="relative">
                      <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-sm text-white/50">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Stats */}
              {showStats && teamStats && (
                <motion.div
                  className="mt-10 grid grid-cols-3 gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <div className="text-center p-4 rounded-[var(--radius-2xl)] border border-white/10 bg-white/[0.03]">
                    <p className="text-3xl font-bold text-white">
                      <AnimatedCounter value={teamStats.totalTasks} reduceMotion={prefersReducedMotion} />
                    </p>
                    <p className="text-xs text-white/40 uppercase tracking-wider mt-1">Total Tasks</p>
                  </div>
                  <div className="text-center p-4 rounded-[var(--radius-2xl)] border border-white/10 bg-white/[0.03]">
                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-sky-light)] to-[var(--brand-sky)]">
                      <AnimatedCounter value={teamStats.completedThisWeek} reduceMotion={prefersReducedMotion} />
                    </p>
                    <p className="text-xs text-white/40 uppercase tracking-wider mt-1">This Week</p>
                  </div>
                  <div className="text-center p-4 rounded-[var(--radius-2xl)] border border-white/10 bg-white/[0.03]">
                    <p className="text-3xl font-bold text-emerald-400">
                      <AnimatedCounter value={teamStats.activeUsers} reduceMotion={prefersReducedMotion} />
                    </p>
                    <p className="text-xs text-white/40 uppercase tracking-wider mt-1">Active</p>
                  </div>
                </motion.div>
              )}
              </div>
            </motion.div>

            {/* Right side - Login card */}
            <div id="main-content" className="w-full max-w-md lg:justify-self-end relative">
              <AnimatePresence mode="wait">
                {screen === 'users' && (
                  <motion.div
                    key="users"
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                  {/* Mobile header */}
                  <motion.div
                    className="mb-6 text-center lg:hidden"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="inline-flex mb-4">
                      <Logo3D />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Bealer Agency</h1>
                    <p className="text-sm text-white/50 mt-1">Task Management Platform</p>
                  </motion.div>

                  {/* Card glow */}
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-[var(--brand-sky)]/40 via-white/10 to-white/5 rounded-[28px] blur-sm pointer-events-none" />

                  {/* Main card */}
                  <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl rounded-[28px] border border-white/10 overflow-hidden shadow-2xl">
                    {/* Card header */}
                    <div className="relative px-6 pt-8 pb-6 text-center">
                      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
                      <motion.div
                        className="relative"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h2 className="text-xl font-bold text-white">Welcome back</h2>
                        <p className="text-sm text-white/40 mt-1">Select your account to continue</p>
                      </motion.div>
                    </div>

                    {/* Search */}
                    {users.length > 5 && (
                      <motion.div
                        className="px-6 pb-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[var(--brand-sky)] transition-colors" />
                          <input
                            type="text"
                            placeholder="Search team..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-[var(--radius-xl)] bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-sky)]/30 focus:border-[var(--brand-sky)]/40 transition-all"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Users list */}
                    {filteredUsers.length > 0 && (
                      <motion.div
                        className="px-4 pb-4 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="space-y-2">
                          {filteredUsers.map((user, index) => (
                            <UserCard
                              key={user.id}
                              user={user}
                              onSelect={handleUserSelect}
                              delay={0.4 + index * 0.05}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Empty state */}
                    {filteredUsers.length === 0 && users.length > 0 && (
                      <motion.div
                        className="px-8 py-12 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Search className="w-10 h-10 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No results for &ldquo;{searchQuery}&rdquo;</p>
                      </motion.div>
                    )}

                    {/* First user state */}
                    {users.length === 0 && (
                      <motion.div
                        className="px-8 py-12 text-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <motion.div
                          className="w-20 h-20 mx-auto mb-6 rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--brand-sky)]/20 to-[var(--brand-blue)]/20 flex items-center justify-center border border-white/10"
                          animate={{ y: [-4, 4, -4] }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Users className="w-10 h-10 text-[var(--brand-sky)]" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white mb-2">Create your team</h3>
                        <p className="text-sm text-white/40 mb-6">Be the first to join the workspace</p>
                      </motion.div>
                    )}

                    {/* Create Account + OAuth buttons */}
                    <div className="p-6 pt-2 space-y-3">
                      {/* Create Account button */}
                      <button
                        onClick={() => setShowRegisterModal(true)}
                        className="w-full py-3 px-4 rounded-[var(--radius-xl)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Create Account
                      </button>

                      {/* Divider */}
                      {users.length > 0 && (
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-2 text-white/40">Or</span>
                          </div>
                        </div>
                      )}

                      <OAuthLoginButtons />

                      {/* Invite Code Section */}
                      <InviteCodeSection />
                    </div>
                  </div>
                </motion.div>
              )}

              {screen === 'pin' && selectedUser && (
                <motion.div
                  key="pin"
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-[var(--brand-sky)]/40 via-white/10 to-white/5 rounded-[28px] blur-sm pointer-events-none" />

                  <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl rounded-[28px] border border-white/10 p-8 shadow-2xl">
                    <motion.button
                      onClick={() => { setScreen('users'); setSearchQuery(''); }}
                      className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors -ml-2 px-3 py-2 rounded-[var(--radius-lg)] hover:bg-white/5"
                      whileHover={{ x: -2 }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </motion.button>

                    <div className="text-center mb-8">
                      <div className="relative inline-block mb-6">
                        <div
                          className="w-20 h-20 rounded-[var(--radius-2xl)] flex items-center justify-center text-white text-2xl font-bold shadow-xl ring-2 ring-white/20"
                          style={{ backgroundColor: selectedUser.color }}
                        >
                          {getUserInitials(selectedUser.name)}
                        </div>
                      </div>

                      <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                      <p className="text-sm text-white/40 mt-2 flex items-center justify-center gap-2">
                        <Lock className="w-3.5 h-3.5" />
                        Enter your 4-digit PIN
                      </p>

                      {lockoutSeconds === 0 && attemptsRemaining < 5 && (
                        <motion.div
                          className="mt-4 inline-flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} left
                        </motion.div>
                      )}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handlePinSubmit();
                      }}
                      aria-label="PIN entry form"
                    >
                      <div className="flex justify-center gap-3 mb-6" role="group" aria-label="Enter your 4-digit PIN">
                        {pin.map((digit, index) => (
                          <div key={index} className="relative">
                            <input
                              ref={(el) => { pinRefs.current[index] = el; }}
                              type="password"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handlePinChange(index, e.target.value, pinRefs, pin, setPin)}
                              onKeyDown={(e) => handlePinKeyDown(e, index, pinRefs, pin)}
                              disabled={lockoutSeconds > 0 || isSubmitting}
                              data-testid={index === 0 ? 'pin-input' : undefined}
                              aria-label={`PIN digit ${index + 1} of 4`}
                              aria-invalid={error ? 'true' : 'false'}
                              aria-describedby={error ? 'pin-error' : undefined}
                              autoComplete="one-time-code"
                              className={`w-14 h-16 text-center text-2xl font-bold rounded-[var(--radius-xl)] border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-sky)]/50 ${
                                lockoutSeconds > 0
                                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                                  : digit
                                    ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)]/10 text-white'
                                    : 'border-white/10 bg-white/5 text-white focus:border-[var(--brand-sky)] focus:bg-white/10'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="submit"
                        data-testid="login-button"
                        className="sr-only"
                        tabIndex={-1}
                      >
                        Submit PIN
                      </button>
                    </form>

                    <AnimatePresence mode="wait">
                      {(error || lockoutSeconds > 0) && (
                        <motion.div
                          id="pin-error"
                          role="alert"
                          aria-live="assertive"
                          aria-atomic="true"
                          className="flex items-center justify-center gap-2 text-red-400 text-sm bg-red-500/10 py-3 px-4 rounded-[var(--radius-xl)] border border-red-500/20 mb-4"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <AlertCircle className="w-4 h-4" />
                          {lockoutSeconds > 0 ? `Locked. Wait ${lockoutSeconds}s` : error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Forgot PIN Link */}
                    <div className="text-center mb-4">
                      <button
                        onClick={() => setShowForgotPinModal(true)}
                        className="text-sm text-white/60 hover:text-white transition-colors underline"
                      >
                        Forgot PIN?
                      </button>
                    </div>

                    {isSubmitting && (
                      <motion.div
                        className="flex flex-col items-center gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="w-8 h-8 border-2 border-[var(--brand-sky)]/30 border-t-[var(--brand-sky)] rounded-full animate-spin" />
                        <span className="text-sm text-white/50">Verifying...</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Footer */}
            <motion.p
              className="mt-8 text-center text-white/20 text-xs font-medium tracking-widest uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Bealer Agency &copy; {new Date().getFullYear()}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={(user) => {
          setStoredSession(user);
          setShowRegisterModal(false);
          onLogin(user);
        }}
      />

      {/* Forgot PIN Modal */}
      <ForgotPinModal
        isOpen={showForgotPinModal}
        onClose={() => setShowForgotPinModal(false)}
        userName={selectedUser?.name}
      />
    </div>
    </MotionConfig>
  );
}

// Forgot PIN Modal Component
function ForgotPinModal({ isOpen, onClose, userName }: { isOpen: boolean; onClose: () => void; userName?: string }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setError('');
      setSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl rounded-[28px] border border-white/10 p-8 shadow-2xl max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--brand-sky)]/20 to-[var(--brand-blue)]/20 flex items-center justify-center border border-white/10">
            <Mail className="w-8 h-8 text-[var(--brand-sky)]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Forgot Your PIN?</h2>
          {userName && (
            <p className="text-sm text-white/60">
              We'll send a reset link to the email associated with <strong>{userName}</strong>
            </p>
          )}
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm bg-green-500/10 py-3 px-4 rounded-[var(--radius-xl)] border border-green-500/20">
              <Check className="w-5 h-5" />
              <span>Check your email for a reset link!</span>
            </div>
            <p className="text-sm text-white/60 text-center">
              If an account exists with that email, we've sent instructions to reset your PIN.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium rounded-[var(--radius-lg)] transition-colors"
            >
              Close
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-[var(--radius-lg)] border-2 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--brand-sky)] transition-colors"
              />
              <p className="mt-2 text-xs text-white/40">
                We'll send a secure link to reset your PIN.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 py-3 px-4 rounded-[var(--radius-xl)] border border-red-500/20"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 text-white/60 hover:text-white font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="flex-1 py-3 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-medium rounded-[var(--radius-lg)] transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// Invite code section for joining agencies
function InviteCodeSection() {
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [validatedInvite, setValidatedInvite] = useState<{
    agency_name: string;
    role: string;
    email: string;
    expires_at: string;
  } | null>(null);
  const [accepted, setAccepted] = useState(false);

  // New user registration fields
  const [isNewUser, setIsNewUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');

  const handleValidate = async () => {
    if (!token.trim()) {
      setInviteError('Please enter an invitation token');
      return;
    }

    setIsValidating(true);
    setInviteError(null);
    setValidatedInvite(null);

    try {
      const response = await fetchWithCsrf('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid or expired invitation');
      }

      setValidatedInvite({
        agency_name: data.agency_name,
        role: data.role,
        email: data.email,
        expires_at: data.expires_at,
      });
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to validate invitation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    setInviteError(null);

    try {
      // Check if user is logged in
      const session = localStorage.getItem('todoSession');
      let payload: Record<string, unknown> = { token: token.trim() };

      if (isNewUser) {
        if (!newName.trim()) {
          setInviteError('Please enter your name');
          setIsAccepting(false);
          return;
        }
        if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
          setInviteError('Please enter a 4-digit PIN');
          setIsAccepting(false);
          return;
        }
        payload = {
          ...payload,
          is_new_user: true,
          name: newName.trim(),
          pin: newPin,
        };
      } else if (session) {
        const parsed = JSON.parse(session);
        payload = {
          ...payload,
          is_new_user: false,
          name: parsed.userName,
        };
      } else {
        // No session and not new user -- prompt to create account
        setIsNewUser(true);
        setIsAccepting(false);
        return;
      }

      const response = await fetchWithCsrf('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setAccepted(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReset = () => {
    setToken('');
    setValidatedInvite(null);
    setInviteError(null);
    setAccepted(false);
    setIsNewUser(false);
    setNewName('');
    setNewPin('');
  };

  if (accepted) {
    return (
      <div className="p-4 rounded-[var(--radius-xl)] bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <Check className="w-4 h-4" />
          <span className="font-medium">You have joined {validatedInvite?.agency_name}!</span>
        </div>
        <p className="text-xs text-white/40 mt-1">Please log in to access the agency workspace.</p>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        <Ticket className="w-3.5 h-3.5" />
        Have an invite code?
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-[var(--radius-xl)] bg-white/[0.04] border border-white/10 space-y-3">
              {/* Error */}
              {inviteError && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{inviteError}</span>
                </div>
              )}

              {/* Token input + validate */}
              {!validatedInvite && (
                <>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => { setToken(e.target.value); setInviteError(null); }}
                    placeholder="Paste invitation token..."
                    className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-sky)]/30 focus:border-[var(--brand-sky)]/40"
                  />
                  <button
                    onClick={handleValidate}
                    disabled={isValidating || !token.trim()}
                    className="w-full py-2.5 px-4 rounded-[var(--radius-lg)] bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Validate Invitation'
                    )}
                  </button>
                </>
              )}

              {/* Validated invite info */}
              {validatedInvite && !isNewUser && (
                <>
                  <div className="p-3 rounded-lg bg-[var(--brand-sky)]/10 border border-[var(--brand-sky)]/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Building2 className="w-4 h-4 text-[var(--brand-sky)]" />
                      <span className="text-sm font-medium text-white">{validatedInvite.agency_name}</span>
                    </div>
                    <p className="text-xs text-white/50">
                      Role: <span className="capitalize text-white/70">{validatedInvite.role}</span>
                    </p>
                  </div>

                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full py-2.5 px-4 rounded-[var(--radius-lg)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Accept & Join
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full text-xs text-white/40 hover:text-white/60 transition-colors py-1"
                  >
                    Use a different code
                  </button>
                </>
              )}

              {/* New user registration fields */}
              {validatedInvite && isNewUser && (
                <>
                  <div className="p-3 rounded-lg bg-[var(--brand-sky)]/10 border border-[var(--brand-sky)]/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-[var(--brand-sky)]" />
                      <span className="text-sm font-medium text-white">{validatedInvite.agency_name}</span>
                    </div>
                    <p className="text-xs text-white/50">Create an account to join</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => { setNewName(e.target.value); setInviteError(null); }}
                      placeholder="e.g., John Smith"
                      className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-sky)]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">4-Digit PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '')); setInviteError(null); }}
                      placeholder="****"
                      className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-sky)]/30 tracking-widest text-center font-mono"
                    />
                  </div>

                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full py-2.5 px-4 rounded-[var(--radius-lg)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Create Account & Join
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsNewUser(false)}
                    className="w-full text-xs text-white/40 hover:text-white/60 transition-colors py-1"
                  >
                    I already have an account
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// User card component
function UserCard({ user, onSelect, delay = 0 }: { user: AuthUser; onSelect: (user: AuthUser) => void; delay?: number }) {
  return (
    <motion.button
      data-testid={`user-card-${user.name}`}
      onClick={() => onSelect(user)}
      className="group w-full flex items-center gap-4 p-3 rounded-[var(--radius-xl)] hover:bg-white/[0.08] active:bg-white/10 transition-all text-left border border-transparent hover:border-white/10"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ x: 4 }}
    >
      <div className="relative flex-shrink-0">
        <motion.div
          className="absolute inset-0 rounded-[var(--radius-xl)] blur-md opacity-0 group-hover:opacity-50 transition-all duration-300"
          style={{ backgroundColor: user.color }}
        />
        <div
          className="relative w-12 h-12 rounded-[var(--radius-xl)] flex items-center justify-center text-white font-semibold text-sm shadow-lg ring-1 ring-white/10 group-hover:ring-white/20 transition-all"
          style={{ backgroundColor: user.color }}
        >
          {getUserInitials(user.name)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate text-sm">{user.name}</p>
        {user.last_login && (
          <p className="text-xs text-white/30 mt-0.5">
            {new Date(user.last_login).toLocaleDateString()}
          </p>
        )}
      </div>

      <motion.div
        className="flex-shrink-0 w-8 h-8 rounded-[var(--radius-lg)] bg-white/5 group-hover:bg-gradient-to-br group-hover:from-[var(--brand-sky-light)] group-hover:to-[var(--brand-sky)] flex items-center justify-center transition-all border border-white/5 group-hover:border-transparent"
        whileHover={{ scale: 1.1 }}
      >
        <Lock className="w-3.5 h-3.5 text-white/40 group-hover:text-[#00205B] transition-colors" />
      </motion.div>
    </motion.button>
  );
}
