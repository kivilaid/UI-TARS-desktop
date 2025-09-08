const fs = require('fs');
const readline = require('readline');

// Function to truncate long strings
function truncateString(str, maxLength = 100) {
  if (typeof str !== 'string') {
    str = JSON.stringify(str);
  }
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...[truncated]';
}

// Function to analyze object field lengths and truncate if needed
function analyzeAndTruncateObject(obj, maxFieldLength = 100) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const result = {};
  const fieldLengths = {};
  
  for (const [key, value] of Object.entries(obj)) {
    let processedValue = value;
    let originalLength = 0;
    
    if (typeof value === 'string') {
      originalLength = value.length;
      processedValue = truncateString(value, maxFieldLength);
    } else if (Array.isArray(value)) {
      originalLength = JSON.stringify(value).length;
      if (originalLength > maxFieldLength) {
        processedValue = `[Array with ${value.length} items, ${originalLength} chars total]...`;
      }
    } else if (typeof value === 'object' && value !== null) {
      originalLength = JSON.stringify(value).length;
      if (originalLength > maxFieldLength) {
        processedValue = `{Object with ${Object.keys(value).length} keys, ${originalLength} chars total}...`;
      }
    }
    
    result[key] = processedValue;
    fieldLengths[key] = originalLength;
  }
  
  return { processedObject: result, fieldLengths };
}

// Get line number from command line argument
const lineNumber = parseInt(process.argv[2]) || 1;
const filePath = 'multimodal/tarko/agent-ui-builder/agent_trace.jsonl';

const fileStream = fs.createReadStream(filePath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let currentLine = 0;

rl.on('line', (line) => {
  currentLine++;
  
  if (currentLine === lineNumber) {
    console.log(`\n=== Analyzing Line ${lineNumber} ===`);
    
    try {
      const jsonObj = JSON.parse(line);
      const { processedObject, fieldLengths } = analyzeAndTruncateObject(jsonObj, 100);
      
      console.log('\nField Lengths Analysis:');
      for (const [field, length] of Object.entries(fieldLengths)) {
        console.log(`  ${field}: ${length} characters`);
      }
      
      console.log('\nProcessed Object (truncated):');
      console.log(JSON.stringify(processedObject, null, 2));
      
      // Basic structure analysis
      console.log('\nStructure Analysis:');
      console.log(`  Root keys: [${Object.keys(jsonObj).join(', ')}]`);
      console.log(`  Total root keys: ${Object.keys(jsonObj).length}`);
      
      if (jsonObj.type) {
        console.log(`  Event type: ${jsonObj.type}`);
      }
      if (jsonObj.id) {
        console.log(`  Event ID: ${jsonObj.id}`);
      }
      if (jsonObj.timestamp) {
        console.log(`  Timestamp: ${jsonObj.timestamp} (${new Date(jsonObj.timestamp).toISOString()})`);
      }
      
    } catch (error) {
      console.error('Error parsing JSON:', error.message);
      console.log('Raw line (truncated):', truncateString(line, 200));
    }
    
    rl.close();
  }
});

rl.on('close', () => {
  if (currentLine < lineNumber) {
    console.log(`File only has ${currentLine} lines, but line ${lineNumber} was requested.`);
  }
});

rl.on('error', (error) => {
  console.error('Error reading file:', error);
});
