import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import type { OutputFormat } from '../shared/types';

// --- App Info ---
export const APP_TITLE = 'OpenAPI Condenser';
export const APP_SUBTITLE = 'Pack your OpenAPI into AI-friendly formats';
export const NAV_LINKS = {
    SDK: '/sdk',
    API: '/swagger',
    GITHUB: 'https://github.com/repomix/openapi-condenser',
    SPONSOR: 'https://github.com/sponsors/repomix',
};

// --- Input Panel ---
export const INPUT_DEBOUNCE_DELAY = 300; // ms
export const URL_FETCH_DEBOUNCE_DELAY = 500; // ms
export const DEFAULT_SPEC_FILENAME = 'spec.json';
export const DEFAULT_URL_FILENAME = 'spec.from.url';


// --- Output Panel ---
export const languageMap: { [K in OutputFormat]: () => any } = {
  json: () => json(),
  yaml: () => yaml(),
  xml: () => markdown({}), // fallback for xml
  markdown: () => markdown({}),
};