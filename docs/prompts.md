I need to create a Bun program that helps process large OpenAPI specification files (either local or remote openapi.yaml/json) which can be too large for LLMs to handle effectively. The program should:

1. Extract and transform specific API endpoint metadata including:
   - Path definitions
   - Request/response schemas
   - Parameters
   - Examples
   - Security requirements
   - Tags and descriptions

2. Provide highly configurable extraction capabilities through:
   - A TypeScript config file (openapi-extractor.config.ts) with options for:
     * Filtering by paths/tags/methods/metadata
     * Custom schema transformations
     * Output formatting
     * Depth of extraction
     * Source location (local file path or remote URL)
   - Command line arguments that override config file settings
   - Environment variable support

3. Support multiple output formats:
   - XML
   - Markdown documentation

4. Include validation and error handling for:
   - Malformed OpenAPI specs (both local and remote)
   - Invalid configurations
   - Missing required fields
   - Network errors when fetching remote specs