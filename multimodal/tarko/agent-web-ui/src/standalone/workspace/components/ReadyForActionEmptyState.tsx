import React from 'react';
import { motion } from 'framer-motion';
import { FiActivity, FiLayout, FiZap, FiFileText } from 'react-icons/fi';
import { containerVariants, itemVariants } from './shared/animations';

interface ReadyForActionEmptyStateProps {
  title: string;
  description: string;
}

/**
 * Empty state component displayed when session is active but no content is available
 */
export const ReadyForActionEmptyState: React.FC<ReadyForActionEmptyStateProps> = ({
  title,
  description,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="flex items-center justify-center h-full text-center"
    >
      <div className="max-w-lg mx-auto px-6">
        <motion.div variants={itemVariants} className="relative mb-10">
          {/* Animated background circles */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
              rotate: [0, 5, 0, -5, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 w-28 h-28 rounded-full bg-gradient-to-br from-accent-200/30 to-accent-300/20 dark:from-accent-800/20 dark:to-accent-700/10 mx-auto blur-xl"
          />
          <motion.div
            animate={{
              scale: [1.1, 1, 1.1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, -5, 0, 5, 0],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-br from-purple-200/20 to-purple-300/10 dark:from-purple-800/10 dark:to-purple-700/5 mx-auto mt-2 ml-2 blur-xl"
          />

          {/* Main icon with glowing effect */}
          <div className="relative mx-auto w-28 h-28 rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FiActivity size={44} className="text-accent-500 dark:text-accent-400" />
            </motion.div>

            {/* Subtle pulsing ring */}
            <motion.div
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.3, 0.1, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-3xl border-2 border-accent-400/20 dark:border-accent-400/10"
            />
          </div>
        </motion.div>

        <motion.h3
          variants={itemVariants}
          className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-300 bg-clip-text text-transparent"
        >
          {title}
        </motion.h3>

        <motion.p
          variants={itemVariants}
          className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-md mx-auto"
        >
          {description}
        </motion.p>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.1)' }}
            className="flex flex-col items-center p-5 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700/40 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3 text-blue-500 dark:text-blue-400 border border-blue-100/80 dark:border-blue-800/30">
              <FiLayout size={22} />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Tool Results
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Comprehensive outputs</div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.1)' }}
            className="flex flex-col items-center p-5 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700/40 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3 text-green-500 dark:text-green-400 border border-green-100/80 dark:border-green-800/30">
              <FiZap size={22} />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Live Updates
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Real-time results</div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.1)' }}
            className="flex flex-col items-center p-5 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700/40 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3 text-amber-500 dark:text-amber-400 border border-amber-100/80 dark:border-amber-800/30">
              <FiFileText size={22} />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Deliverables
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Reports & Code</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};
