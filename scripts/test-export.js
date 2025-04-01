const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Running export command...');
  execSync('node dist/cli.js export', { stdio: 'inherit' });
  
  const outputPath = path.resolve('./output.prisma');
  if (fs.existsSync(outputPath)) {
    console.log('output.prisma was successfully generated!');
    
    const content = fs.readFileSync(outputPath, 'utf-8');
    console.log('\nOutput content:');
    console.log(content);
    
    const modelRegex = /model\s+\w+\s*{[\s\S]*?\/\/\s*id:\s*[a-f0-9]+[\s\S]*?}/g;
    const matches = content.match(modelRegex);
    
    if (matches && matches.length > 0) {
      console.log('\nDatabase IDs are correctly formatted as comments!');
    } else {
      console.error('\nERROR: Database IDs are not correctly formatted as comments.');
      process.exit(1);
    }
  } else {
    console.error('ERROR: output.prisma was not generated.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
