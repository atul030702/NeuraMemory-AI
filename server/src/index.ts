/**
 * Basic entry point for the server.
 */

import { env } from './config/env.js';

async function main() {
  console.log('--- NeuraMemory-AI Server Starting ---');
  console.log('Node Version:', process.version);
  console.log('Environment:', env.NODE_ENV);
  console.log('Status: Core services ready for initialization');
  console.log('--------------------------------------');
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
