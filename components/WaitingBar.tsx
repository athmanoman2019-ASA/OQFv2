import React from 'react';
import { motion } from 'motion/react';

export const WaitingBar: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-1.5 z-[9999] overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm">
      <motion.div
        className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 via-amber-500 via-rose-500 to-indigo-500"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut"
        }}
        style={{ 
          width: '60%',
          backgroundSize: '200% 100%'
        }}
      />
      {/* Secondary shimmer */}
      <motion.div
        className="absolute inset-0 h-full bg-white/20"
        animate={{
          opacity: [0, 0.4, 0]
        }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: "linear"
        }}
      />
    </div>
  );
};
