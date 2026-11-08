import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * §14.x — Offline Indicator UI
 *
 * Shows a non-intrusive banner when the user goes offline,
 * and a brief "back online" confirmation when connectivity returns.
 * Auto-hides the online banner after 3 seconds.
 */

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline }) => {
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      // Just reconnected
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {/* Offline banner — persistent until reconnection */}
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-red-900/90 to-orange-900/90 backdrop-blur-lg border-b border-red-500/20 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="relative">
            <WifiOff className="w-4 h-4 text-red-300" aria-hidden="true" />
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <WifiOff className="w-4 h-4 text-red-300" />
            </motion.div>
          </div>
          <span className="text-sm text-red-100 font-medium">
            离线模式 · 部分功能不可用
          </span>
          <span className="text-xs text-red-200/50 hidden sm:inline">
            Offline — Some features unavailable
          </span>
          <div className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
            <span className="text-[10px] text-red-300 font-mono uppercase tracking-wider">
              cached
            </span>
          </div>
        </motion.div>
      )}

      {/* Reconnected banner — auto-dismiss after 3s */}
      {showReconnected && isOnline && (
        <motion.div
          key="reconnected"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-900/90 to-green-900/90 backdrop-blur-lg border-b border-emerald-500/20 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <Wifi className="w-4 h-4 text-emerald-300" aria-hidden="true" />
          <span className="text-sm text-emerald-100 font-medium">
            已恢复连接 · Back online
          </span>
          <motion.div
            className="h-0.5 bg-emerald-400/40 rounded-full absolute bottom-0 left-0"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 3, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
