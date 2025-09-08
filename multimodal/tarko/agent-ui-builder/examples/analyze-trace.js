const fs = require('fs');
const readline = require('readline');

async function analyzeJsonlFile() {
  const fileStream = fs.createReadStream('../agent_trace.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  
  for await (const line of rl) {
    lineNumber++;
    
    if (line.trim() === '') continue;
    
    try {
      const obj = JSON.parse(line);
      
      // Analyze object structure
      console.log(`\n=== Line ${lineNumber} ===`);
      console.log('Object keys:', Object.keys(obj));
      
      // Analyze each field length and truncate if needed
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const length = value.length;
          const preview = length > 100 ? value.substring(0, 100) + '...' : value;
          console.log(`${key} (string, ${length} chars):`, preview);
        } else if (typeof value === 'object' && value !== null) {
          const jsonStr = JSON.stringify(value);
          const length = jsonStr.length;
          const preview = length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr;
          console.log(`${key} (object, ${length} chars):`, preview);
        } else {
          console.log(`${key}:`, value);
        }
      }
      
      // Stop after analyzing a few lines to avoid overwhelming output
      if (lineNumber >= 5) {
        console.log('\n=== Stopping after 5 lines to avoid overwhelming output ===');
        break;
      }
      
    } catch (error) {
      console.error(`Error parsing line ${lineNumber}:`, error.message);
    }
  }
}

analyzeJsonlFile().catch(console.error);