import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from '@/common/hooks/useSession';
import { usePlan } from '@/common/hooks/usePlan';
import {
  FiLayout,
  FiCpu,
  FiArrowRight,
  FiLayers,
  FiActivity,
  FiFileText,
  FiZap,
  FiTool,
} from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';
import { getAgentTitle } from '@/config/web-ui-config';
import './Workspace.css';

/**
 * WorkspaceContent Component - Unified workspace with elegant empty state
 */
export const WorkspaceContent: React.FC = () => {
  const { activeSessionId, setActivePanelContent } = useSession();
  const { currentPlan } = usePlan(activeSessionId);
  const [workspacePath, setWorkspacePath] = useState<string>('');

  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      try {
        const workspaceInfo = await apiService.getWorkspaceInfo();
        setWorkspacePath(normalizeFilePath(workspaceInfo.path));
      } catch (error) {
        console.error('Failed to fetch workspace info:', error);
        setWorkspacePath('');
      }
    };

    fetchWorkspaceInfo();
  }, []);

  // Unified animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 32, scale: 0.95 },
    animate: {
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
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.9,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  // Plan view button for Pro users
  const renderPlanButton = () => {
    if (!currentPlan || !currentPlan.hasGeneratedPlan || currentPlan.steps.length === 0)
      return null;

    const completedSteps = currentPlan.steps.filter((step) => step.done).length;
    const totalSteps = currentPlan.steps.length;
    const isComplete = currentPlan.isComplete;

    return (
      <motion.div variants={itemVariants} className="mb-6">
        <motion.div
          whileHover={{
            y: -4,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            setActivePanelContent({
              type: 'plan',
              source: null,
              title: 'Task Plan',
              timestamp: Date.now(),
            })
          }
          className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl backdrop-blur-sm"
        >
          <div className="p-6">
            <div className="flex items-start">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mr-5 flex-shrink-0 ${
                  isComplete
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700/40'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/30'
                }`}
              >
                {isComplete ? (
                  <FiCpu size={26} />
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <FiCpu size={26} />
                  </motion.div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-xl mb-2 truncate pr-2">
                    Task Plan
                  </h4>
                  <div className="flex items-center text-sm">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mr-2 ${
                        isComplete
                          ? 'bg-gray-600 dark:bg-gray-400'
                          : 'bg-gray-600 dark:bg-gray-400'
                      }`}
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      {isComplete ? 'Completed' : 'In progress'}
                    </span>
                  </div>
                </div>

                <div className="text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                  {isComplete
                    ? 'All planned steps have been completed successfully.'
                    : 'The agent is executing a plan to accomplish your task.'}
                </div>

                {/* Progress bar */}
                <div className="mt-2 mb-3">
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-800 dark:bg-gray-300"
                      style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/30 flex justify-between items-center">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              View plan details
            </div>
            <div className="flex items-center">
              <FiArrowRight className="text-gray-700 dark:text-gray-300" size={18} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Enhanced empty state when no session
  if (!activeSessionId) {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex items-center justify-center h-full text-center py-12"
      >
        <div className="max-w-md mx-auto px-6">
          <motion.div variants={itemVariants} className="relative mx-auto mb-10">
            {/* Subtle background glow */}
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-gray-900/5 dark:bg-gray-100/5 blur-2xl"></div>

            {/* Main icon */}
            <div className="relative w-24 h-24 mx-auto rounded-3xl bg-white dark:bg-gray-900 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/40 shadow-2xl">
              <FiLayout size={32} className="text-gray-700 dark:text-gray-300" />
            </div>
          </motion.div>

          <motion.h3
            variants={itemVariants}
            className="text-3xl font-light mb-6 text-gray-900 dark:text-gray-100 tracking-tight"
          >
            No Active Session
          </motion.h3>

          <motion.p
            variants={itemVariants}
            className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg"
          >
            Create or select a session to start working. Tool results and detailed information will
            be displayed here automatically.
          </motion.p>
        </div>
      </motion.div>
    );
  }

  // Enhanced empty state when session exists but no content
  const hasContent = currentPlan && currentPlan.hasGeneratedPlan && currentPlan.steps.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header with refined styling */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/60 dark:border-gray-700/30 bg-white dark:bg-gray-900">
        <div className="flex items-center">
          <div className="w-12 h-12 mr-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
            <FiLayers size={20} />
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-gray-100 text-xl">Workspace</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {workspacePath || 'Loading workspace...'}
            </div>
          </div>
        </div>
      </div>

      {/* Content area with elegant empty state */}
      <div className="flex-1 overflow-y-auto p-6">
        {hasContent ? (
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {/* Plan view for Pro users */}
            {renderPlanButton()}
          </motion.div>
        ) : (
          /* Unified Ready for Action state */
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="flex items-center justify-center h-full text-center"
          >
            <div className="max-w-md mx-auto px-6">
              {/* Unified icon design */}
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
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-gray-700 dark:text-gray-300"
                    >
                      <FiActivity size={32} />
                    </motion.div>
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

              {/* Enhanced title */}
              <motion.h3
                variants={itemVariants}
                className="text-3xl font-light mb-6 text-gray-900 dark:text-gray-100 tracking-tight"
              >
                Ready for Action
              </motion.h3>

              {/* Refined description */}
              <motion.p
                variants={itemVariants}
                className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-sm mx-auto text-lg"
              >
                Your workspace is active. Start a conversation with {getAgentTitle()} and watch as tool
                results, plans, and detailed information appear here in real-time.
              </motion.p>
              
              {/* Minimal accent indicator */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center mb-10"
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

              {/* Refined feature cards */}
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto"
              >
                <motion.div
                  variants={itemVariants}
                  whileHover={{ 
                    y: -6, 
                    scale: 1.02,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                  className="flex flex-col items-center p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl backdrop-blur-sm relative overflow-hidden"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <FiTool size={20} />
                    </motion.div>
                  </div>
                  <div className="text-center relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Tool Results
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Comprehensive outputs
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  whileHover={{ 
                    y: -6, 
                    scale: 1.02,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                  className="flex flex-col items-center p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl backdrop-blur-sm relative overflow-hidden"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <FiZap size={20} />
                    </motion.div>
                  </div>
                  <div className="text-center relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Live Updates
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Real-time results
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  whileHover={{ 
                    y: -6, 
                    scale: 1.02,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                  className="flex flex-col items-center p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl backdrop-blur-sm relative overflow-hidden"
                >
                  <div className="relative w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
                    <motion.div
                      animate={{ 
                        y: [-2, 2, -2],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <FiFileText size={20} />
                    </motion.div>
                  </div>
                  <div className="text-center relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Deliverables
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Reports & Code
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
