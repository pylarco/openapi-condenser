import type { FilterOptions, TransformOptions, HttpMethod, OutputFormat } from './types';

// --- App Config ---
export const API_PORT = 3000;
export const API_HOST = 'localhost';
export const API_PREFIX = '/api';
export const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

// --- OpenAPI Semantics ---
export const HTTP_METHODS: HttpMethod[] = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];
export const OUTPUT_FORMATS: OutputFormat[] = ['json', 'yaml', 'xml', 'markdown'];
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = 'markdown';

// --- Default Extractor Config ---
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