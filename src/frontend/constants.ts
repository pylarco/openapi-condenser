import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import type { FilterOptions, TransformOptions, OutputFormat } from '../shared/types';

// --- Default Config ---
export const defaultConfig: { filter: FilterOptions, transform: TransformOptions } = {
  filter: {
    paths: { include: [], exclude: [] },
    tags: { include: [], exclude: [] },
    methods: [],
    includeDeprecated: false,
  },
  transform: {
    removeExamples: false,
    removeDescriptions: false,
    removeSummaries: false,
    includeServers: true,
    includeInfo: true,
    includeSchemas: true,
    includeRequestBodies: true,
    includeResponses: true,
  },
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