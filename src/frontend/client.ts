import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../backend/server';

// Use with the specific older version
export const client = edenTreaty<App>('http://localhost:3000');