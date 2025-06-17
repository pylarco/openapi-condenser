import { app } from './backend/server';
import staticPlugin from '@elysiajs/static';
import { Context } from 'elysia';

// Create a worker-compatible app with static file serving
const workerApp = app
  // Serve static assets from the "dist" directory for frontend
  .use(staticPlugin({
    assets: 'dist',
    prefix: '/'
  }))
  // Custom 404 handler for non-API routes
  .get('*', ({ set }: { set: Context['set'] }) => {
    // Try to serve index.html for SPA routing
    return Bun.file('dist/index.html');
  });

export default {
  fetch: workerApp.fetch,
};

// For local development with Bun
if (import.meta.main) {
  const port = process.env.PORT || 3000;
  console.log(`Server running at http://localhost:${port}`);
  Bun.serve({
    port: Number(port),
    fetch: workerApp.fetch
  });
} 