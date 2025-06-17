#!/usr/bin/env node

/**
 * Deployment script for OpenAPI Condenser
 * This script automates the build and deployment process to Cloudflare Workers
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Display banner
console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}   OpenAPI Condenser Deployment Tool   ${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

// Run a command and return its output
function runCommand(command, message) {
  console.log(`${colors.bright}${colors.yellow}${message}...${colors.reset}`);
  try {
    const result = execSync(command, { stdio: 'inherit' });
    return { success: true, result };
  } catch (error) {
    console.error(`${colors.bright}${colors.red}Command failed: ${error.message}${colors.reset}`);
    return { success: false, error };
  }
}

// Check if wrangler.toml exists
if (!existsSync('./wrangler.toml')) {
  console.error(`${colors.bright}${colors.red}Error: wrangler.toml not found.${colors.reset}`);
  console.error(`${colors.bright}${colors.red}Please make sure you're in the project root directory.${colors.reset}`);
  process.exit(1);
}

// Build the application
const buildResult = runCommand('npm run build', 'Building application');
if (!buildResult.success) {
  console.error(`${colors.bright}${colors.red}Build failed. Fix the errors and try again.${colors.reset}`);
  process.exit(1);
}

// Deploy to Cloudflare Workers
const deployResult = runCommand('npx wrangler deploy', 'Deploying to Cloudflare Workers');
if (!deployResult.success) {
  console.error(`${colors.bright}${colors.red}Deployment failed. Check the errors above.${colors.reset}`);
  process.exit(1);
}

console.log(`\n${colors.bright}${colors.green}Deployment completed successfully!${colors.reset}`);
console.log(`${colors.bright}${colors.green}Your application should now be available at the URL shown above.${colors.reset}\n`); 