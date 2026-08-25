"use client";

import {
  motion,
  type HTMLMotionProps,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@/lib/utils";

const revealTransition = {
  duration: 0.65,
  ease: [0.16, 1, 0.3, 1] as const,
};

const tiltSpring = { stiffness: 180, damping: 24, mass: 0.35 };

function useTilt(strength: number) {
  const rotateXValue = useMotionValue(0);
  const rotateYValue = useMotionValue(0);
  const rotateX = useSpring(rotateXValue, tiltSpring);
  const rotateY = useSpring(rotateYValue, tiltSpring);
  const reducedMotion = useReducedMotion();

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rotateXValue.set(y * -strength);
    rotateYValue.set(x * strength);
  };
  const resetTilt = () => {
    rotateXValue.set(0);
    rotateYValue.set(0);
  };

  return { rotateX, rotateY, reducedMotion, onPointerMove, resetTilt };
}

export function MotionSection({ className, children, ...props }: HTMLMotionProps<"section">) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      ref={ref}
      data-scroll-reveal="section"
      data-scroll-visible={inView ? "true" : "false"}
      className={className}
      initial={false}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={revealTransition}
      {...props}
    >
      {children}
    </motion.section>
  );
}

export function HeroVisualMotion({ className, children, ...props }: HTMLMotionProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const { rotateX, rotateY, reducedMotion, onPointerMove, resetTilt } = useTilt(4);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 28]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.975]);
  const opacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.98, 0.88]);
  const smoothY = useSpring(y, { stiffness: 120, damping: 26, mass: 0.35 });
  const smoothScale = useSpring(scale, { stiffness: 140, damping: 28, mass: 0.3 });

  return (
    <motion.div
      ref={ref}
      className={cn("depth-surface depth-surface--hero", className)}
      style={{ y: smoothY, scale: smoothScale, opacity, rotateX, rotateY, transformPerspective: 1200 }}
      initial={false}
      whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ ...revealTransition, delay: 0.08 }}
      {...props}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      {children}
    </motion.div>
  );
}

export function MotionAction({ className, children, ...props }: HTMLMotionProps<"div">) {
  const xValue = useMotionValue(0);
  const yValue = useMotionValue(0);
  const x = useSpring(xValue, tiltSpring);
  const y = useSpring(yValue, tiltSpring);
  const reducedMotion = useReducedMotion();

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    xValue.set(((event.clientX - rect.left) / rect.width - 0.5) * 5);
    yValue.set(((event.clientY - rect.top) / rect.height - 0.5) * 4);
  };
  const reset = () => {
    xValue.set(0);
    yValue.set(0);
  };

  return (
    <motion.div
      className={className}
      tabIndex={-1}
      style={{ x, y }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      {...props}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
    </motion.div>
  );
}

export function TiltedCard({
  className,
  children,
  strength = 3,
  ...props
}: HTMLMotionProps<"article"> & { strength?: number }) {
  const { rotateX, rotateY, onPointerMove, resetTilt } = useTilt(strength);
  return (
    <motion.article
      className={cn("depth-card", className)}
      data-depth-surface="card"
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: "preserve-3d" }}
      {...props}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      {children}
    </motion.article>
  );
}

export function DepthSurface({
  className,
  children,
  strength = 2.5,
  ...props
}: HTMLMotionProps<"div"> & { strength?: number }) {
  const { rotateX, rotateY, onPointerMove, resetTilt } = useTilt(strength);
  return (
    <motion.div
      className={cn("depth-surface", className)}
      data-depth-surface="tool"
      style={{ rotateX, rotateY, transformPerspective: 1100, transformStyle: "preserve-3d" }}
      {...props}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      {children}
    </motion.div>
  );
}
