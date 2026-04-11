"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export default function AuthPromptModal({ isOpen, onClose, message }: AuthPromptModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet — slides up on mobile, centered on desktop */}
          <motion.div
            className="fixed z-[81] left-0 right-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pointer-events-auto w-full md:max-w-sm bg-[#0d1520] border border-white/10 rounded-t-2xl md:rounded-2xl p-6 shadow-2xl"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              {/* Drag handle — mobile only */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5 md:hidden" />

              <div className="text-3xl mb-3 text-center" aria-hidden="true">🔓</div>
              <h3 className="text-text-primary font-bold text-lg text-center mb-2">
                Sign up to vote
              </h3>
              <p className="text-text-secondary text-sm text-center leading-relaxed mb-6">
                {message}
              </p>

              <div className="flex flex-col gap-3">
                <Link
                  href="/sign-up"
                  className="w-full py-3 px-4 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm text-center min-h-[48px] flex items-center justify-center hover:bg-[#29b6f6] transition-colors"
                >
                  Create account — it&apos;s free
                </Link>
                <Link
                  href="/sign-in"
                  className="w-full py-3 px-4 rounded-lg bg-white/5 border border-white/10 text-text-primary font-medium text-sm text-center min-h-[44px] flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-text-secondary text-xs hover:text-text-primary transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
