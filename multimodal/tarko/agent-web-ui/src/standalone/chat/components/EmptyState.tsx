import React from 'react';
import { motion } from 'framer-motion';
import { FiX, FiPlay, FiMessageSquare } from 'react-icons/fi';
import { getAgentTitle } from '@/config/web-ui-config';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { ReplayState } from '@/common/state/atoms/replay';

interface EmptyStateProps {
  replayState: ReplayState;
  isReplayMode: boolean;
}

/**
 * CountdownCircle component for auto-play countdown
 */
const CountdownCircle: React.FC<{ seconds: number; total: number }> = ({ seconds, total }) => {
  const progress = ((total - seconds) / total) * 100;
  const circumference = 2 * Math.PI * 18; // radius = 18
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 40 40">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-gray-900 dark:text-gray-100 transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key={seconds}
          initial={{ scale: 1.2, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          {seconds}
        </motion.span>
      </div>
    </div>
  );
};

/**
 * EmptyState Component - Unified elegant design with monochromatic color scheme
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ replayState, isReplayMode }) => {
  const { cancelAutoPlay } = useReplayMode();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 32, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const iconContainerVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.9,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex items-center justify-center h-full min-h-[400px]"
    >
      <div className="text-center p-8 max-w-lg">
        {/* Auto-play countdown state */}
        {isReplayMode && replayState.autoPlayCountdown !== null ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Refined background card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              {/* Countdown circle */}
              <motion.div
                className="flex justify-center mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="relative">
                  <CountdownCircle seconds={replayState.autoPlayCountdown} total={3} />
                  {/* Subtle pulse effect */}
                  <motion.div
                    className="absolute inset-0 bg-gray-900/10 dark:bg-gray-100/10 rounded-full -z-10"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0, 0.2, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
              </motion.div>

              {/* Title and description */}
              <motion.h3
                className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
                variants={itemVariants}
              >
                Auto-play starting
              </motion.h3>
              <motion.p
                className="text-gray-600 dark:text-gray-400 text-sm mb-8 leading-relaxed max-w-sm mx-auto"
                variants={itemVariants}
              >
                Replay will begin in{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {replayState.autoPlayCountdown} second
                  {replayState.autoPlayCountdown !== 1 ? 's' : ''}
                </span>
                . You can cancel or wait for automatic playback.
              </motion.p>

              {/* Cancel button */}
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={cancelAutoPlay}
                className="inline-flex items-center px-8 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-gray-100 transition-all duration-300 border border-gray-300/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl"
              >
                <FiX size={16} className="mr-2" />
                Cancel Auto-play
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* Unified standard empty state */
          <motion.div variants={containerVariants} className="max-w-md mx-auto">
            {/* Refined icon design */}
            <motion.div variants={iconContainerVariants} className="relative mb-10">
              {/* Subtle background glow */}
              <motion.div
                className="absolute inset-0 bg-gray-900/5 dark:bg-gray-100/5 rounded-full blur-2xl"
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Main icon container */}
              <motion.div
                className="relative w-24 h-24 bg-white dark:bg-gray-900 rounded-3xl flex items-center justify-center mx-auto shadow-2xl border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm"
                whileHover={{ scale: 1.05, y: -4 }}
                transition={{ duration: 0.3 }}
              >
                {/* Icon */}
                <div className="relative z-10">
                  {isReplayMode && replayState.currentEventIndex === -1 ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-gray-700 dark:text-gray-300"
                    >
                      <FiPlay size={32} className="ml-1" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{
                        rotate: [0, 3, -3, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-gray-700 dark:text-gray-300"
                    >
                      <FiMessageSquare size={32} />
                    </motion.div>
                  )}
                </div>
                
                {/* Single elegant accent */}
                <motion.div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-gray-900 dark:bg-gray-100 rounded-full"
                  animate={{
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            </motion.div>

            {/* Enhanced typography */}
            <motion.h3
              variants={itemVariants}
              className="text-3xl font-light mb-6 text-gray-900 dark:text-gray-100 tracking-tight"
            >
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Ready to replay'
                : 'Start a conversation'}
            </motion.h3>

            {/* Refined description */}
            <motion.p
              variants={itemVariants}
              className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-sm mx-auto text-lg"
            >
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Press play to start the replay or use the timeline to navigate through the session.'
                : `Ask ${getAgentTitle()} a question or submit a task to begin your conversation.`}
            </motion.p>
            
            {/* Minimal accent indicator */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center"
            >
              <div className="flex space-x-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full"
                    animate={{
                      scale: [0.8, 1.3, 0.8],
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
