import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../backend/server';
import { API_PREFIX } from '../shared/constants';

// Use with the specific older version
export const client = edenTreaty<App>(API_PREFIX);