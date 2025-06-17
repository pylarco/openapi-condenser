import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../backend/server';
import { API_BASE_URL } from '../shared/constants';

// Use with the specific older version
export const client = edenTreaty<App>(API_BASE_URL);