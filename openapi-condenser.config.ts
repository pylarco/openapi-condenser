import type { ExtractorConfig } from './src/types';

const config: ExtractorConfig = {
  source: {
    type: 'local',
    path: './openapi.json', // Path to local file or remote URL
  },
  output: {
    format: 'markdown', // 'json', 'yaml', 'xml', or 'markdown'
    destination: './output', // Output directory or file
  },
  filter: {
    paths: undefined, // Filter by paths - string[] or RegExp
    tags: undefined, // Filter by tags - string[] or RegExp
    methods: undefined, // Filter by HTTP methods
    includeDeprecated: false, // Whether to include deprecated endpoints
  },
  transform: {
    maxDepth: Infinity, // Maximum depth for schema extraction
    removeExamples: false, // Whether to remove examples
    removeDescriptions: false, // Whether to remove descriptions
    includeServers: true, // Include server information
    includeInfo: true, // Include API info (title, version, etc.)
  },
  validation: {
    strict: true, // Enforce strict validation
    ignoreErrors: [], // Error types to ignore
  },
};

export default config; 