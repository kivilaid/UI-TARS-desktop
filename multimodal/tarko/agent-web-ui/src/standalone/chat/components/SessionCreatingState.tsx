import React from 'react';
import { motion } from 'framer-motion';
import { FiLoader } from 'react-icons/fi';

interface SessionCreatingStateProps {
  isCreating: boolean;
}

/**
 * SessionCreatingState Component - Unified loading state with clear loading indication
 */
export const SessionCreatingState: React.FC<SessionCreatingStateProps> = ({ isCreating }) => {
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

  if (!isCreating) {
    return null;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex items-center justify-center h-full"
    >
      <div className="text-center max-w-sm mx-auto px-6">
        {/* Loading icon with clear loading indication */}
        <motion.div variants={iconContainerVariants} className="relative mb-10">
          {/* Subtle background glow */}
          <motion.div
            className="absolute inset-0 bg-gray-900/5 dark:bg-gray-100/5 rounded-full blur-2xl"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Main loading container */}
          <motion.div
            className="relative w-24 h-24 bg-white dark:bg-gray-900 rounded-3xl flex items-center justify-center mx-auto shadow-2xl border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Loading spinner */}
            <div className="relative z-10">
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="text-gray-700 dark:text-gray-300"
              >
                <FiLoader size={32} />
              </motion.div>
            </div>

            {/* Loading accent */}
            <motion.div
              className="absolute -top-2 -right-2 w-4 h-4 bg-gray-900 dark:bg-gray-100 rounded-full"
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Enhanced title with loading emphasis */}
        <motion.h2
          variants={itemVariants}
          className="text-3xl font-light mb-6 text-gray-900 dark:text-gray-100 tracking-tight"
        >
          Preparing your session
        </motion.h2>

        {/* Clear loading description */}
        <motion.p
          variants={itemVariants}
          className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed text-lg"
        >
          Setting up your Agent workspace with care
        </motion.p>

        {/* Loading progress indicator */}
        <motion.div variants={itemVariants} className="flex items-center justify-center">
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-gray-700 dark:bg-gray-300 rounded-full"
                animate={{
                  scale: [0.8, 1.4, 0.8],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
