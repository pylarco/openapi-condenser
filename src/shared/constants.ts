import type { FilterOptions, TransformOptions, HttpMethod, OutputFormat } from './types';

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

export const HTTP_METHODS: HttpMethod[] = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];

export const OUTPUT_FORMATS: OutputFormat[] = ['json', 'yaml', 'xml', 'markdown'];