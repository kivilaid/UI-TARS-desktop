import React from 'react';
import { highlightCommand, highlightSimpleCommand } from './commandHighlight';

interface TerminalWindowProps {
  title?: string;
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  maxHeight?: string;
  className?: string;
  useAdvancedHighlighting?: boolean;
}

/**
 * Reusable terminal window component with macOS-style design
 */
export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  title = 'user@agent-tars',
  command,
  stdout,
  stderr,
  exitCode,
  maxHeight = '80vh',
  className = '',
  useAdvancedHighlighting = true,
}) => {
  const isError = exitCode !== 0 && exitCode !== undefined;
  const hasOutput = stdout || stderr;

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)] ${className}`}>
      {/* Terminal title bar with macOS-style controls */}
      <div className="bg-[#111111] px-3 py-1.5 border-b border-gray-900 flex items-center">
        <div className="flex space-x-1.5 mr-3">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
        </div>
        <div className="text-gray-400 text-xs font-medium mx-auto flex items-center gap-2">
          <span>{title}</span>
          {exitCode !== undefined && (
            <span
              className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                isError
                  ? 'bg-red-900/30 text-red-400 border border-red-800/50'
                  : 'bg-green-900/30 text-green-400 border border-green-800/50'
              }`}
            >
              exit {exitCode}
            </span>
          )}
        </div>
      </div>

      {/* Terminal content area */}
      <div className="bg-black px-3 py-2 font-mono text-sm terminal-content overflow-auto" style={{ maxHeight }}>
        <div className="overflow-x-auto min-w-full">
          {/* Command section */}
          {command && (
            <div className="flex items-start">
              <span className="select-none text-green-400 mr-2 font-bold terminal-prompt-symbol">
                $
              </span>
              <div className="flex-1 text-gray-200">
                {useAdvancedHighlighting ? highlightCommand(command) : highlightSimpleCommand(command)}
              </div>
            </div>
          )}

          {/* Output section */}
          {hasOutput && (
            <div className="mt-3">
              {stdout && (
                <pre className="whitespace-pre-wrap text-gray-200 ml-3 leading-relaxed">
                  {stdout}
                </pre>
              )}

              {stderr && (
                <pre className="whitespace-pre-wrap text-red-400 ml-3 leading-relaxed">
                  {stderr}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Terminal window specifically for script execution
 */
export const ScriptTerminalWindow: React.FC<{
  interpreter: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  maxHeight?: string;
  className?: string;
}> = ({ interpreter, stdout, stderr, exitCode, maxHeight = '80vh', className = '' }) => {
  const isError = exitCode !== 0 && exitCode !== undefined;
  const hasOutput = stdout || stderr;

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)] ${className}`}>
      {/* Terminal title bar */}
      <div className="bg-[#111111] px-3 py-1.5 border-b border-gray-900 flex items-center">
        <div className="flex space-x-1.5 mr-3">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
        </div>
        <div className="text-gray-400 text-xs font-medium mx-auto flex items-center gap-2">
          <span>Script Execution - {interpreter}</span>
          {exitCode !== undefined && (
            <span
              className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                isError
                  ? 'bg-red-900/30 text-red-400 border border-red-800/50'
                  : 'bg-green-900/30 text-green-400 border border-green-800/50'
              }`}
            >
              exit {exitCode}
            </span>
          )}
        </div>
      </div>

      {/* Terminal content area */}
      <div className="bg-black p-3 font-mono text-sm terminal-content overflow-auto" style={{ maxHeight }}>
        <div className="space-y-1">
          {/* Command section */}
          <div className="flex items-start">
            <span className="select-none text-green-400 mr-2 font-bold">$</span>
            <div className="flex-1 text-gray-200">
              {highlightSimpleCommand(`${interpreter} << 'EOF'`)}
            </div>
          </div>

          {/* Output section */}
          {hasOutput && (
            <div className="ml-4 mt-2 space-y-2">
              {stdout && (
                <pre className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {stdout}
                </pre>
              )}

              {stderr && (
                <pre className="text-red-400 whitespace-pre-wrap leading-relaxed">{stderr}</pre>
              )}
            </div>
          )}

          {/* End marker */}
          <div className="flex items-start mt-2">
            <span className="select-none text-green-400 mr-2 font-bold">$</span>
            <span className="text-gray-500 text-xs">EOF</span>
          </div>
        </div>
      </div>
    </div>
  );
};
