import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from '@/common/hooks/useSession';
import { usePlan } from '@/common/hooks/usePlan';
import { FiCpu, FiArrowRight, FiLayers } from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';
import { getAgentTitle } from '@/common/constants';
import { EmptyState } from './components/EmptyState';
import './Workspace.css';

/**
 * WorkspaceContent Component - Enhanced workspace with beautiful empty state
 *
 * Design principles:
 * - Focus on plan display for Pro users
 * - Beautiful empty state when no content is available
 * - Clean visual hierarchy and elegant animations
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

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] },
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
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
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
          className="bg-white dark:bg-gray-800/90 rounded-2xl border border-[#E5E6EC]/70 dark:border-gray-700/40 overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <div className="p-5">
            <div className="flex items-start">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0 ${
                  isComplete
                    ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 text-green-600 dark:text-green-400 border border-green-100/80 dark:border-green-800/40'
                    : 'bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 text-accent-500 dark:text-accent-400 border border-accent-100/50 dark:border-accent-800/30'
                }`}
              >
                {isComplete ? (
                  <FiCpu size={24} />
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <FiCpu size={24} />
                  </motion.div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-lg mb-1 truncate pr-2">
                    Task Plan
                  </h4>
                  <div className="flex items-center text-xs">
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${
                        isComplete
                          ? 'bg-green-500 dark:bg-green-400'
                          : 'bg-accent-500 dark:bg-accent-400'
                      }`}
                    />
                    <span className="text-gray-500 dark:text-gray-400">
                      {isComplete ? 'Completed' : 'In progress'}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {isComplete
                    ? 'All planned steps have been completed successfully.'
                    : 'The agent is executing a plan to accomplish your task.'}
                </div>

                {/* Progress bar */}
                <div className="mt-1 mb-2">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isComplete
                          ? 'bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-400'
                          : 'bg-gradient-to-r from-accent-400 to-accent-500 dark:from-accent-500 dark:to-accent-400'
                      }`}
                      style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-50/70 to-gray-50 dark:from-gray-800/50 dark:to-gray-800/80 px-5 py-3 border-t border-[#E5E6EC]/50 dark:border-gray-700/30 flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              View plan details
            </div>
            <div className="flex items-center text-sm">
              <FiArrowRight className="text-accent-500 dark:text-accent-400" size={16} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Enhanced empty state when no session
  if (!activeSessionId) {
    return (
      <EmptyState
        type="no-session"
        title="No Active Session"
        description="Create or select a session to start working. Tool results and detailed information will be displayed here automatically."
      />
    );
  }

  // Enhanced empty state when session exists but no content
  const hasContent = currentPlan && currentPlan.hasGeneratedPlan && currentPlan.steps.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header with refined styling */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/60 dark:border-gray-700/30 bg-white dark:bg-gray-800/90">
        <div className="flex items-center">
          <div className="w-10 h-10 mr-4 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
            <FiLayers size={18} />
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-gray-100 text-lg">Workspace</h2>
            <div className="text-xs text-gray-500 dark:text-gray-400">
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
          <EmptyState
            type="ready-for-action"
            title="Ready for Action"
            description={`Your workspace is active. Start a conversation with ${getAgentTitle()} and watch as tool results, plans, and detailed information appear here in real-time.`}
          />
        )}
      </div>
    </div>
  );
};
