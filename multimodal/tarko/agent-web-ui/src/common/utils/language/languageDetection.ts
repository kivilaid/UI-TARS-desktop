/**
 * Unified language detection utilities for code editors and syntax highlighting
 */

/**
 * Comprehensive file extension to language mapping
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',
  
  // Python
  py: 'python',
  pyw: 'python',
  pyi: 'python',
  
  // Web technologies
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  
  // Data formats
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  
  // Documentation
  md: 'markdown',
  markdown: 'markdown',
  rst: 'restructuredtext',
  
  // Shell scripts
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  
  // Other languages
  java: 'java',
  kt: 'kotlin',
  scala: 'scala',
  go: 'go',
  rs: 'rust',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  'c++': 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  sql: 'sql',
  
  // Config files
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  env: 'shell',
  
  // Docker
  dockerfile: 'dockerfile',
  
  // Others
  txt: 'plaintext',
  log: 'plaintext',
};

/**
 * Interpreter to language mapping for script execution
 */
const INTERPRETER_TO_LANGUAGE: Record<string, string> = {
  python: 'python',
  python3: 'python',
  py: 'python',
  
  node: 'javascript',
  nodejs: 'javascript',
  
  bash: 'shell',
  sh: 'shell',
  zsh: 'shell',
  fish: 'shell',
  
  ruby: 'ruby',
  rb: 'ruby',
  
  php: 'php',
  java: 'java',
  go: 'go',
  rust: 'rust',
  
  cpp: 'cpp',
  'c++': 'cpp',
  gcc: 'c',
  clang: 'c',
  
  csharp: 'csharp',
  dotnet: 'csharp',
  
  swift: 'swift',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
};

/**
 * Language to file extension mapping for generating filenames
 */
const LANGUAGE_TO_EXTENSION: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  go: 'go',
  rust: 'rs',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  php: 'php',
  ruby: 'rb',
  swift: 'swift',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  shell: 'sh',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  markdown: 'md',
  sql: 'sql',
  dockerfile: 'dockerfile',
  ini: 'ini',
  plaintext: 'txt',
};

/**
 * Get language identifier from filename
 * @param fileName - The filename or path
 * @returns Language identifier for Monaco Editor
 */
export function getLanguageFromFileName(fileName: string): string {
  if (!fileName) return 'plaintext';
  
  // Extract the file extension
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Handle special cases
  if (fileName.toLowerCase().includes('dockerfile')) {
    return 'dockerfile';
  }
  
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

/**
 * Get language identifier from interpreter name
 * @param interpreter - The interpreter or runtime name
 * @returns Language identifier for Monaco Editor
 */
export function getLanguageFromInterpreter(interpreter: string): string {
  if (!interpreter) return 'plaintext';
  
  const normalizedInterpreter = interpreter.toLowerCase().trim();
  return INTERPRETER_TO_LANGUAGE[normalizedInterpreter] || 'plaintext';
}

/**
 * Get file extension from language identifier
 * @param language - The language identifier
 * @returns File extension (without dot)
 */
export function getExtensionFromLanguage(language: string): string {
  if (!language) return 'txt';
  
  return LANGUAGE_TO_EXTENSION[language] || 'txt';
}

/**
 * Check if a language supports syntax highlighting
 * @param language - The language identifier
 * @returns True if the language is supported by Monaco Editor
 */
export function isLanguageSupported(language: string): boolean {
  const supportedLanguages = new Set([
    'javascript', 'typescript', 'python', 'java', 'go', 'rust',
    'cpp', 'c', 'csharp', 'php', 'ruby', 'swift', 'dart', 'lua',
    'r', 'shell', 'html', 'css', 'scss', 'sass', 'less', 'json',
    'xml', 'yaml', 'markdown', 'sql', 'dockerfile', 'ini'
  ]);
  
  return supportedLanguages.has(language);
}

/**
 * Get a human-readable display name for a language
 * @param language - The language identifier
 * @returns Human-readable language name
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    go: 'Go',
    rust: 'Rust',
    cpp: 'C++',
    c: 'C',
    csharp: 'C#',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    dart: 'Dart',
    lua: 'Lua',
    r: 'R',
    shell: 'Shell',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    json: 'JSON',
    xml: 'XML',
    yaml: 'YAML',
    markdown: 'Markdown',
    sql: 'SQL',
    dockerfile: 'Dockerfile',
    ini: 'INI',
    plaintext: 'Plain Text',
  };
  
  return displayNames[language] || language.charAt(0).toUpperCase() + language.slice(1);
}
