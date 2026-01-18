'use client';

import { ReactNode, Children, isValidElement, cloneElement, ReactElement } from 'react';
import { motion, AnimatePresence, LayoutGroup, Variants } from 'framer-motion';
import {
  listItemVariants,
  listContainerVariants,
  slideOutVariants,
  fadeOutVariants,
  layoutTransition,
  prefersReducedMotion,
  getStaggerDelay,
  DURATION,
} from '@/lib/animations';

interface AnimatedListProps {
  /** List items to animate */
  children: ReactNode;
  /** Animation style for list items */
  animation?: 'fade' | 'slide' | 'slideOut' | 'none';
  /** Whether to animate layout changes (reordering) */
  layoutAnimation?: boolean;
  /** Stagger delay between items (in seconds) */
  staggerDelay?: number;
  /** Custom container className */
  className?: string;
  /** Whether to animate initial render */
  animateInitial?: boolean;
  /** Unique key for the layout group */
  layoutGroupId?: string;
}

/**
 * AnimatedList - Wrapper for lists with consistent enter/exit animations
 *
 * Features:
 * - Smooth item enter/exit animations
 * - Layout animations for reordering
 * - Staggered animations for multiple items
 * - Respects reduced motion preferences
 *
 * Usage:
 * ```tsx
 * <AnimatedList animation="slide" layoutAnimation>
 *   {items.map(item => (
 *     <div key={item.id}>{item.name}</div>
 *   ))}
 * </AnimatedList>
 * ```
 */
export function AnimatedList({
  children,
  animation = 'slide',
  layoutAnimation = true,
  staggerDelay = 0.05,
  className = '',
  animateInitial = true,
  layoutGroupId,
}: AnimatedListProps) {
  const reducedMotion = prefersReducedMotion();

  // Get the appropriate variants based on animation type
  const getVariants = (): Variants | undefined => {
    if (reducedMotion) return undefined;

    switch (animation) {
      case 'slide':
        return listItemVariants;
      case 'slideOut':
        return slideOutVariants;
      case 'fade':
        return fadeOutVariants;
      case 'none':
      default:
        return undefined;
    }
  };

  const variants = getVariants();

  // Map children to animated items
  const animatedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;

    // Get the key from the child element
    const key = child.key || `animated-item-${index}`;

    return (
      <motion.div
        key={key}
        layout={layoutAnimation && !reducedMotion}
        layoutId={layoutAnimation && !reducedMotion ? String(key) : undefined}
        variants={variants}
        initial={animateInitial && !reducedMotion ? 'hidden' : false}
        animate={!reducedMotion ? 'visible' : undefined}
        exit={!reducedMotion ? 'exit' : undefined}
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                ...layoutTransition,
                delay: getStaggerDelay(index, staggerDelay),
              }
        }
      >
        {child}
      </motion.div>
    );
  });

  const content = (
    <AnimatePresence mode="popLayout" initial={animateInitial}>
      {animatedChildren}
    </AnimatePresence>
  );

  // Wrap in LayoutGroup if layout animations are enabled
  if (layoutAnimation && !reducedMotion) {
    return (
      <LayoutGroup id={layoutGroupId}>
        <div className={className}>{content}</div>
      </LayoutGroup>
    );
  }

  return <div className={className}>{content}</div>;
}

interface AnimatedListItemProps {
  /** Content to render */
  children: ReactNode;
  /** Unique key for the item (required for animations) */
  itemKey: string | number;
  /** Whether to show layout animation */
  layout?: boolean;
  /** Custom className */
  className?: string;
  /** Animation variant to use */
  variant?: 'default' | 'slideOut' | 'fade';
  /** Click handler */
  onClick?: () => void;
}

/**
 * AnimatedListItem - Individual list item with enter/exit animations
 *
 * Use this when you need more control over individual items,
 * or when items are not direct children of AnimatedList.
 */
export function AnimatedListItem({
  children,
  itemKey,
  layout = true,
  className = '',
  variant = 'default',
  onClick,
}: AnimatedListItemProps) {
  const reducedMotion = prefersReducedMotion();

  const getVariants = (): Variants | undefined => {
    if (reducedMotion) return undefined;

    switch (variant) {
      case 'slideOut':
        return slideOutVariants;
      case 'fade':
        return fadeOutVariants;
      case 'default':
      default:
        return listItemVariants;
    }
  };

  return (
    <motion.div
      layout={layout && !reducedMotion}
      layoutId={layout && !reducedMotion ? String(itemKey) : undefined}
      variants={getVariants()}
      initial={!reducedMotion ? 'hidden' : false}
      animate={!reducedMotion ? 'visible' : undefined}
      exit={!reducedMotion ? 'exit' : undefined}
      transition={reducedMotion ? { duration: 0 } : layoutTransition}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedListContainer - Container with staggered children animations
 *
 * Use when you want all children to animate in with a stagger effect
 */
interface AnimatedListContainerProps {
  children: ReactNode;
  className?: string;
  /** Whether to animate on initial render */
  animateOnMount?: boolean;
}

export function AnimatedListContainer({
  children,
  className = '',
  animateOnMount = true,
}: AnimatedListContainerProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      variants={reducedMotion ? undefined : listContainerVariants}
      initial={animateOnMount && !reducedMotion ? 'hidden' : false}
      animate={!reducedMotion ? 'visible' : undefined}
      exit={!reducedMotion ? 'exit' : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedList;
