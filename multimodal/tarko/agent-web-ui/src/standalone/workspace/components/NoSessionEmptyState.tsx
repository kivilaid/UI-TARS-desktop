import React from 'react';
import { motion } from 'framer-motion';
import { FiLayout } from 'react-icons/fi';
import { containerVariants, itemVariants } from './shared/animations';

interface NoSessionEmptyStateProps {
  title: string;
  description: string;
}

/**
 * Empty state component displayed when no session is active
 */
export const NoSessionEmptyState: React.FC<NoSessionEmptyStateProps> = ({ title, description }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="flex items-center justify-center h-full text-center py-12"
    >
      <div className="max-w-md mx-auto px-6">
        <motion.div variants={itemVariants} className="relative mx-auto mb-8">
          {/* Gradient background glow effect */}
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-200/50 to-gray-100/30 dark:from-gray-700/30 dark:to-gray-800/20 blur-xl"></div>

          {/* Main icon */}
          <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
            <FiLayout size={40} className="text-gray-500 dark:text-gray-400" />
          </div>
        </motion.div>

        <motion.h3
          variants={itemVariants}
          className="text-2xl font-medium mb-3 text-gray-800 dark:text-gray-200"
        >
          {title}
        </motion.h3>

        <motion.p
          variants={itemVariants}
          className="text-gray-600 dark:text-gray-400 leading-relaxed"
        >
          {description}
        </motion.p>
      </div>
    </motion.div>
  );
};
