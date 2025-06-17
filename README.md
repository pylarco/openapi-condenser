# OpenAPI Extractor

A powerful Bun tool to process large OpenAPI specification files and extract useful information in various formats.

## Features

- Extract specific API endpoint metadata (paths, schemas, parameters, examples, security, etc.)
- Configure extraction via TypeScript config file
- Filter by paths, tags, methods, and more
- Transform schemas with custom options
- Multiple output formats (JSON, YAML, XML, Markdown)
- Support for local and remote OpenAPI files
- Command line arguments that override config settings

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/openapi-extractor.git
cd openapi-extractor

# Install dependencies
bun install

# Link for global usage (optional)
bun link
```

## Usage

### Command Line

```bash
# Basic usage with config file
bun run start

# Specify config file
bun run start --config ./my-config.ts

# Override config with command line arguments
bun run start --source ./my-openapi.json --format markdown --output ./docs/api.md

# Remote source
bun run start --source https://example.com/api/openapi.json --source-type remote
```

### Configuration File

Create an `openapi-extractor.config.ts` file:

```typescript
import type { ExtractorConfig } from './src/types';

const config: ExtractorConfig = {
  source: {
    type: 'local', // 'local' or 'remote'
    path: './openapi.json',
  },
  output: {
    format: 'markdown', // 'json', 'yaml', 'xml', 'markdown'
    destination: './output/api.md',
  },
  filter: {
    paths: ['/api/v1/users', '/api/v1/products'], // Filter specific paths
    tags: ['user', 'product'], // Filter by tags
    methods: ['get', 'post'], // Filter by HTTP methods
    includeDeprecated: false, // Skip deprecated endpoints
  },
  transform: {
    maxDepth: 3, // Maximum depth for schema extraction
    removeExamples: true, // Remove examples from output
    removeDescriptions: false, // Keep descriptions
    includeServers: true, // Include server information
    includeInfo: true, // Include API info
  },
  validation: {
    strict: true, // Enforce strict validation
    ignoreErrors: [], // Error types to ignore
  },
};

export default config;
```

## License

MIT
