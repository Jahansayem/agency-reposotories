/**
 * Micro-Interactions Library
 * Sprint 3 Issue #42: Animation Polish
 *
 * Advanced micro-interactions for enhanced UX.
 * Includes haptic feedback, sound effects, and subtle visual cues.
 */

import { Variants } from 'framer-motion';
import { DURATION, EASE, SPRING } from './animations';

/**
 * Success Celebration Variants
 * Used when completing tasks or achieving milestones
 */
export const successPulseVariants: Variants = {
  idle: {
    scale: 1,
  },
  celebrate: {
    scale: [1, 1.2, 1.1, 1],
    transition: {
      duration: 0.6,
      times: [0, 0.3, 0.6, 1],
      ease: EASE.spring,
    },
  },
};

/**
 * Confetti Burst Animation
 * Individual confetti piece animation
 */
export const confettiVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 0,
    x: 0,
    rotate: 0,
  },
  burst: (i: number) => ({
    opacity: [1, 1, 0],
    y: [0, -100 - i * 20, -80 - i * 15],
    x: [(i % 2 === 0 ? 1 : -1) * (30 + i * 10), (i % 2 === 0 ? 1 : -1) * (60 + i * 15)],
    rotate: [0, (i % 2 === 0 ? 1 : -1) * 360 * 2],
    transition: {
      duration: 1.5 + i * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

/**
 * Shake Animation
 * Used for validation errors or denied actions
 */
export const shakeVariants: Variants = {
  idle: {
    x: 0,
  },
  shake: {
    x: [-10, 10, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.5,
      times: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 1],
    },
  },
};

/**
 * Wiggle Animation
 * Subtle attention grabber
 */
export const wiggleVariants: Variants = {
  idle: {
    rotate: 0,
  },
  wiggle: {
    rotate: [-5, 5, -5, 5, -3, 3, 0],
    transition: {
      duration: 0.6,
      times: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 1],
    },
  },
};

/**
 * Bounce Animation
 * For playful interactions
 */
export const bounceVariants: Variants = {
  idle: {
    y: 0,
  },
  bounce: {
    y: [0, -20, 0, -10, 0, -5, 0],
    transition: {
      duration: 0.8,
      times: [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1],
      ease: EASE.easeOut,
    },
  },
};

/**
 * Glow Animation
 * Highlight important elements
 */
export const glowVariants: Variants = {
  idle: {
    boxShadow: '0 0 0px rgba(59, 130, 246, 0)',
  },
  glow: {
    boxShadow: [
      '0 0 0px rgba(59, 130, 246, 0)',
      '0 0 20px rgba(59, 130, 246, 0.6)',
      '0 0 30px rgba(59, 130, 246, 0.4)',
      '0 0 20px rgba(59, 130, 246, 0.6)',
      '0 0 0px rgba(59, 130, 246, 0)',
    ],
    transition: {
      duration: 2,
      times: [0, 0.25, 0.5, 0.75, 1],
      repeat: Infinity,
    },
  },
};

/**
 * Ripple Effect Variants
 * Material Design ripple
 */
export const rippleVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0.5,
  },
  visible: {
    scale: 2.5,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: EASE.easeOut,
    },
  },
};

/**
 * Floating Animation
 * Subtle up-and-down motion
 */
export const floatVariants: Variants = {
  float: {
    y: [-5, 5],
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    },
  },
};

/**
 * Heartbeat Animation
 * Pulsing effect for notifications
 */
export const heartbeatVariants: Variants = {
  idle: {
    scale: 1,
  },
  beat: {
    scale: [1, 1.1, 1, 1.1, 1],
    transition: {
      duration: 1,
      times: [0, 0.14, 0.28, 0.42, 1],
      repeat: Infinity,
      repeatDelay: 1,
    },
  },
};

/**
 * Slide In From Edge
 * For notifications and toasts
 */
export const slideInFromRightVariants: Variants = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export const slideInFromLeftVariants: Variants = {
  hidden: {
    x: '-100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Flip Animation
 * For cards or toggles
 */
export const flipVariants: Variants = {
  front: {
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: EASE.spring,
    },
  },
  back: {
    rotateY: 180,
    transition: {
      duration: 0.6,
      ease: EASE.spring,
    },
  },
};

/**
 * Zoom In Animation
 * For focusing on elements
 */
export const zoomInVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Reveal Animation
 * Wipe effect for content
 */
export const revealVariants: Variants = {
  hidden: {
    clipPath: 'inset(0 100% 0 0)',
  },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    transition: {
      duration: 0.5,
      ease: EASE.easeOut,
    },
  },
};

/**
 * Typography Animations
 */
export const fadeInUpWords: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASE.easeOut,
    },
  },
};

/**
 * Utility Functions for Micro-interactions
 */

/**
 * Trigger haptic feedback (mobile only)
 */
export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[style]);
  }
}

/**
 * Play success sound
 */
export function playSuccessSound() {
  if (typeof Audio !== 'undefined') {
    const audio = new Audio('/sounds/success.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore - user might not have interacted yet
    });
  }
}

/**
 * Play error sound
 */
export function playErrorSound() {
  if (typeof Audio !== 'undefined') {
    const audio = new Audio('/sounds/error.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore
    });
  }
}

/**
 * Play notification sound
 */
export function playNotificationSound() {
  if (typeof Audio !== 'undefined') {
    const audio = new Audio('/sounds/notification-chime.wav');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore
    });
  }
}

/**
 * Create ripple effect at click position
 */
export function createRippleEffect(
  event: React.MouseEvent,
  color: string = 'rgba(255, 255, 255, 0.6)'
) {
  const button = event.currentTarget as HTMLElement;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.style.position = 'absolute';
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = color;
  circle.style.pointerEvents = 'none';
  circle.style.animation = 'ripple 0.6s ease-out';

  button.appendChild(circle);

  setTimeout(() => {
    circle.remove();
  }, 600);
}

/**
 * Scroll element into view with smooth animation
 */
export function smoothScrollToElement(
  element: HTMLElement,
  options?: ScrollIntoViewOptions
) {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    ...options,
  });
}

/**
 * Combination Micro-interactions
 */

/**
 * Full success feedback (haptic + sound + visual)
 */
export function triggerSuccessFeedback() {
  triggerHaptic('medium');
  playSuccessSound();
}

/**
 * Full error feedback (haptic + sound)
 */
export function triggerErrorFeedback() {
  triggerHaptic('heavy');
  playErrorSound();
}

/**
 * Notification feedback
 */
export function triggerNotificationFeedback() {
  triggerHaptic('light');
  playNotificationSound();
}
