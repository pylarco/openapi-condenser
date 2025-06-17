Of course! I'd be happy to help refactor your codebase by centralizing constants. This is a great practice for improving maintainability and ensuring consistency. Here are the files that have been changed to achieve this:

I've created a new `src/shared/constants.ts` for constants shared between the frontend and backend, and a `src/backend/constants.ts` for backend-specific values. Then I updated all files that used these constants to import them from their new central locations.

### New Files

I've added two new files to centralize your constants.

```typescript // src/backend/constants.ts
export const contentTypeMappings: ReadonlyArray<[string, string]> = [
    ['json', 'json'],
    ['form-data', 'form-data'],
    ['x-www-form-urlencoded', 'form-urlencoded'],
    ['xml', 'xml'],
    ['text/plain', 'text'],
];
```

```typescript // src/shared/constants.ts
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
```

### Updated Files

Here are the updated files that now import from the new constant files:

```typescript // src/backend/cli.ts
#!/usr/bin/env bun
import { parse } from 'cmd-ts';
import { command, option, string, optional, flag } from 'cmd-ts';
import { loadConfig, mergeWithCommandLineArgs, extractOpenAPI } from './extractor';
import type { ExtractorConfig, OutputFormat } from './types';
import { OUTPUT_FORMATS } from '../shared/constants';

// Define CLI command
const cmd = command({
  name: 'openapi-condenser',
  description: 'Extract and transform OpenAPI specifications',
  args: {
    config: option({
      type: optional(string),
      long: 'config',
      short: 'c',
      description: 'Path to configuration file',
    }),
    source: option({
      type: optional(string),
      long: 'source',
      short: 's',
      description: 'Source file path or URL',
    }),
    sourceType: option({
      type: optional(string),
      long: 'source-type',
      description: 'Source type (local or remote)',
    }),
    format: option({
      type: optional(string),
      long: 'format',
      short: 'f',
      description: `Output format (${OUTPUT_FORMATS.join(', ')})`,
    }),
    outputPath: option({
      type: optional(string),
      long: 'output',
      short: 'o',
      description: 'Output file path',
    }),
    includePaths: option({
      type: optional(string),
      long: 'include-paths',
      description: 'Include paths by glob patterns (comma-separated)',
    }),
    excludePaths: option({
      type: optional(string),
      long: 'exclude-paths',
      description: 'Exclude paths by glob patterns (comma-separated)',
    }),
    includeTags: option({
      type: optional(string),
      long: 'include-tags',
      description: 'Include endpoints by tag glob patterns (comma-separated)',
    }),
    excludeTags: option({
      type: optional(string),
      long: 'exclude-tags',
      description: 'Exclude endpoints by tag glob patterns (comma-separated)',
    }),
    methods: option({
      type: optional(string),
      long: 'methods',
      description: 'Filter by HTTP methods (comma-separated)',
    }),
    includeDeprecated: flag({
      long: 'include-deprecated',
      description: 'Include deprecated endpoints',
    }),
    excludeSchemas: flag({
      long: 'exclude-schemas',
      description: 'Exclude component schemas from the output',
    }),
    excludeRequestBodies: flag({
      long: 'exclude-request-bodies',
      description: 'Exclude request bodies from the output',
    }),
    excludeResponses: flag({
      long: 'exclude-responses',
      description: 'Exclude responses from the output',
    }),
    verbose: flag({
      long: 'verbose',
      short: 'v',
      description: 'Show verbose output',
    }),
  },
  handler: async (args) => {
    try {
      // Load configuration
      const configPath = args.config || './openapi-condenser.config.ts';
      let config: ExtractorConfig;
      
      try {
        config = await loadConfig(configPath);
      } catch (error) {
        if (args.source) {
          const format = args.format || 'json';
          if (!OUTPUT_FORMATS.includes(format as OutputFormat)) {
            console.error(`Error: Invalid format '${format}'. Must be one of ${OUTPUT_FORMATS.join(', ')}.`);
            process.exit(1);
          }
          // Create minimal config if no config file but source is provided
          config = {
            source: {
              type: (args.sourceType === 'remote' ? 'remote' : 'local') as 'local' | 'remote',
              path: args.source
            },
            output: {
              format: format as OutputFormat,
            },
          };
        } else {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      }
      
      // Merge command line args with config
      const mergedConfig = mergeWithCommandLineArgs(config, args);
      
      if (args.verbose) {
        console.log('Using configuration:', JSON.stringify(mergedConfig, null, 2));
      }
      
      // Run extraction
      const result = await extractOpenAPI(mergedConfig);
      
      if (!result.success) {
        if (result.errors) {
          console.error('Errors:', result.errors.join('\n'));
        }
        process.exit(1);
      }
      
      if (!mergedConfig.output.destination) {
        // Output to stdout if no destination specified
        console.log(result.data);
      } else if (args.verbose) {
        console.log(`Output written to: ${mergedConfig.output.destination}`);
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Warnings:', result.warnings.join('\n'));
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  },
});

// Run the command
await parse(cmd, process.argv.slice(2));
```

```typescript // src/backend/extractor.ts
import type { ExtractorConfig, OpenAPIExtractorResult, SpecStats } from './types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { OpenAPIV3, OpenAPI } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';

export const calculateSpecStats = (spec: OpenAPIV3.Document): SpecStats => {
  if (!spec || typeof spec !== 'object') {
    return { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
  }

  const compactSpecString = JSON.stringify(spec);
  const prettySpecString = JSON.stringify(spec, null, 2);

  const charCount = prettySpecString.length;
  const lineCount = prettySpecString.split('\n').length;
  // Rough approximation of token count, as it varies by model.
  // 1 token is roughly 4 characters for English text. Use compact for better estimation.
  const tokenCount = Math.ceil(compactSpecString.length / 4);

  const validMethods = new Set(HTTP_METHODS);
  const paths = Object.keys(spec.paths || {});
  const operations = paths.reduce((count, path) => {
    const pathItem = spec.paths[path];
    if (pathItem && typeof pathItem === 'object') {
      return count + Object.keys(pathItem).filter(method => validMethods.has(method)).length;
    }
    return count;
  }, 0);
  const schemas = Object.keys(spec.components?.schemas || {}).length;

  return {
    paths: paths.length,
    operations: operations,
    schemas: schemas,
    charCount,
    lineCount,
    tokenCount,
  };
};

export const calculateOutputStats = (output: string): Pick<SpecStats, 'charCount' | 'lineCount' | 'tokenCount'> => {
    const charCount = output.length;
    const lineCount = output.split('\n').length;
    const tokenCount = Math.ceil(charCount / 4);

    return { charCount, lineCount, tokenCount };
}

const isV3Document = (
  doc: OpenAPI.Document,
): doc is OpenAPIV3.Document => {
  return 'openapi' in doc && doc.openapi.startsWith('3');
};

/**
 * Extract OpenAPI information based on configuration
 */
export const extractOpenAPI = async (
  config: ExtractorConfig
): Promise<OpenAPIExtractorResult> => {
  try {
    // Fetch OpenAPI spec
    const result = await fetchSpec(config.source);
    
    if (!result.success || !result.data) {
      return result;
    }
    
    if (typeof result.data === 'string') {
      return {
        success: false,
        errors: ['Invalid spec format after fetching. Expected a document object.'],
      };
    }
    
    if (!isV3Document(result.data)) {
      return {
        success: false,
        errors: ['Only OpenAPI v3 documents are supported.'],
      };
    }
    
    const beforeStats = calculateSpecStats(result.data);

    // Apply transformations
    const transformed = transformOpenAPI(
      result.data,
      config.filter,
      config.transform
    );
    
    const afterSpecStats = calculateSpecStats(transformed);
    
    // Format output
    const formatter = getFormatter(config.output.format);
    const formattedOutput = formatter.format(transformed);
    
    const afterOutputStats = calculateOutputStats(formattedOutput);

    const afterStats: SpecStats = {
      ...afterSpecStats,
      ...afterOutputStats,
    };
    // Write output to file if destination is provided
    if (config.output.destination) {
      const outputPath = config.output.destination;
      await fs.mkdir(dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, formattedOutput, 'utf-8');
    }
    
    return {
      success: true,
      data: formattedOutput,
      stats: {
        before: beforeStats,
        after: afterStats,
      }
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Error extracting OpenAPI: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

/**
 * Load configuration from file
 */
export const loadConfig = async (
  configPath: string = './openapi-condenser.config.ts'
): Promise<ExtractorConfig> => {
  try {
    // Convert file path to URL for import()
    const fileUrl = `file://${join(process.cwd(), configPath)}`;
    
    // Import configuration
    const module = await import(fileUrl);
    return module.default as ExtractorConfig;
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Merge command line arguments with configuration
 */
export const mergeWithCommandLineArgs = (
  config: ExtractorConfig,
  args: Record<string, any>
): ExtractorConfig => {
  // Deep copy to avoid mutating the original config object
  const result: ExtractorConfig = JSON.parse(JSON.stringify(config));
  
  // Override source settings
  if (args.source) {
    result.source.path = args.source;
  }
  
  if (args.sourceType) {
    result.source.type = args.sourceType as 'local' | 'remote';
  }
  
  // Override output settings
  if (args.format) {
    result.output.format = args.format;
  }
  
  if (args.outputPath) {
    result.output.destination = args.outputPath;
  }
  
  // Initialize filter if it doesn't exist
  if (!result.filter) {
    result.filter = {};
  }
  
  // Override filter settings
  if (args.includePaths) {
    result.filter.paths = { ...result.filter.paths, include: args.includePaths.split(',') };
  }
  if (args.excludePaths) {
    result.filter.paths = { ...result.filter.paths, exclude: args.excludePaths.split(',') };
  }
  
  if (args.includeTags) {
    result.filter.tags = { ...result.filter.tags, include: args.includeTags.split(',') };
  }
  if (args.excludeTags) {
    result.filter.tags = { ...result.filter.tags, exclude: args.excludeTags.split(',') };
  }
  
  if (args.methods) {
    result.filter.methods = args.methods.split(',');
  }
  
  if (args.includeDeprecated) {
    result.filter.includeDeprecated = args.includeDeprecated;
  }

  // Initialize transform if it doesn't exist
  if (!result.transform) {
    result.transform = {};
  }

  if (args.excludeSchemas) {
    result.transform.includeSchemas = false;
  }
  if (args.excludeRequestBodies) {
    result.transform.includeRequestBodies = false;
  }
  if (args.excludeResponses) {
    result.transform.includeResponses = false;
  }
  
  return result;
};
```

```typescript // src/backend/formatters/concise-text.ts
import { OpenAPIV3 } from 'openapi-types';
import { contentTypeMappings } from '../constants';
import { HTTP_METHODS } from '../../shared/constants';

const resolveRef = <T extends object>(
  refObj: OpenAPIV3.ReferenceObject | T,
  doc: OpenAPIV3.Document,
): T => {
  if (!refObj || typeof refObj !== 'object' || !('$ref' in refObj))
    return refObj as T;

  const refPath = refObj.$ref.replace('#/components/', '').split('/');
  let current: any = doc.components;
  for (const part of refPath) {
    current = current?.[part];
  }
  return (current || refObj) as T;
};

const formatSchemaType = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  doc: OpenAPIV3.Document,
): string => {
  if (!schema) return 'any';
  if ('$ref' in schema) {
    return schema.$ref.split('/').pop() || 'any';
  }
  if (schema.type === 'array' && schema.items) {
    const itemType = formatSchemaType(schema.items, doc);
    return `array<${itemType}>`;
  }
  return schema.type || 'any';
};

const shortenContentType = (contentType: string): string => {
    for (const [key, shortName] of contentTypeMappings) {
        if (contentType.includes(key)) {
            return shortName;
        }
    }
    return contentType;
};


const formatProperties = (
  properties: { [name: string]: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject },
  required: string[] | undefined,
  doc: OpenAPIV3.Document,
  indent = 0,
): string => {
  let propsMarkdown = '';
  const indentStr = '  '.repeat(indent);

  for (const [propName, propSchema] of Object.entries(properties)) {
    const resolvedPropSchema = resolveRef(propSchema, doc);
    const isRequired = required?.includes(propName);
    const requiredStr = isRequired ? ' (required)' : '';
    
    const typeStr = formatSchemaType(propSchema, doc);
    const descriptionStr = resolvedPropSchema.description ? ` - ${resolvedPropSchema.description.split('\n')[0]}` : '';

    propsMarkdown += `${indentStr}- ${propName}:${typeStr}${requiredStr}${descriptionStr}\n`;

    let nestedPropsSchema: OpenAPIV3.SchemaObject | undefined;
    const resolvedItems = resolvedPropSchema.type === 'array' && resolvedPropSchema.items ? resolveRef(resolvedPropSchema.items, doc) : undefined;

    if (resolvedPropSchema.type === 'object') {
        nestedPropsSchema = resolvedPropSchema;
    } else if (resolvedItems?.type === 'object') {
        nestedPropsSchema = resolvedItems;
    }

    if (nestedPropsSchema?.properties) {
        propsMarkdown += formatProperties(nestedPropsSchema.properties, nestedPropsSchema.required, doc, indent + 1);
    }
  }
  return propsMarkdown;
};

const formatEndpoint = (method: string, path: string, operation: OpenAPIV3.OperationObject, data: OpenAPIV3.Document): string => {
    let output = '';
    output += `${method.toUpperCase()} ${path}\n`;

    const description = (operation.summary || operation.description || '').replace(/\n/g, ' ');
    if (description) {
      output += `D: ${description}\n`;
    }

    // Parameters
    if (operation.parameters?.length) {
      output += `P:\n`;
      for (const paramRef of operation.parameters) {
        const param = resolveRef(paramRef, data);
        const schema = param.schema as OpenAPIV3.SchemaObject;
        const type = schema ? formatSchemaType(schema, data) : 'any';
        const required = param.required ? 'required' : 'optional';
        const paramDesc = param.description ? ` - ${param.description.replace(/\n/g, ' ')}` : '';
        output += `  - ${param.name}: ${type} (${param.in}, ${required})${paramDesc}\n`;
      }
    }
    
    // Request Body
    if (operation.requestBody) {
      const requestBody = resolveRef(operation.requestBody, data);
      if (requestBody.content) {
        const contentEntries = Object.entries(requestBody.content);
        if (contentEntries.length > 0) {
            const firstEntry = contentEntries[0];
            if (firstEntry) {
                const schemaName = formatSchemaType(firstEntry[1].schema, data);
                if (contentEntries.length === 1) {
                    output += `B: ${shortenContentType(firstEntry[0])} -> ${schemaName}\n`;
                } else {
                    output += `B:\n`;
                    for (const [contentType, mediaType] of contentEntries) {
                        output += `  - ${shortenContentType(contentType)} -> ${formatSchemaType(mediaType.schema, data)}\n`;
                    }
                }
            }
        }
      }
    }

    // Responses
    if (operation.responses) {
      output += `R:\n`;
      const groupedResponses: { [key: string]: string[] } = {};
      
      for (const [code, responseRef] of Object.entries(operation.responses)) {
        const response = resolveRef(responseRef, data);
        const responseIdParts: string[] = [];
        if (response.content) {
            for (const [contentType, mediaType] of Object.entries(response.content)) {
                responseIdParts.push(`${shortenContentType(contentType)} -> ${formatSchemaType(mediaType.schema, data)}`);
            }
        }
        
        let responseId = responseIdParts.join(', ');
        if (!responseId) {
            responseId = response.description?.replace(/\n/g, ' ') || 'No description';
        }

        groupedResponses[responseId] = [...(groupedResponses[responseId] || []), code];
      }

      for (const [responseId, codes] of Object.entries(groupedResponses)) {
           output += `  ${codes.join(', ')}: ${responseId}\n`;
      }
    }
    return output;
}

const formatSchema = (name: string, schemaRef: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, data: OpenAPIV3.Document): string => {
    let output = '';
    const schema = resolveRef(schemaRef, data);
      
    output += `SCHEMA: ${name}\n`;
    if (schema.description) {
        output += `D: ${schema.description.replace(/\n/g, ' ')}\n`;
    }

    if (schema.type === 'object' && schema.properties) {
        output += 'PROPS:\n';
        output += formatProperties(schema.properties, schema.required, data, 1);
    } else if (schema.type === 'array' && schema.items) {
        output += `ARRAY OF: ${formatSchemaType(schema.items, data)}\n`;
        const resolvedItems = resolveRef(schema.items, data);
        if (resolvedItems.type === 'object' && resolvedItems.properties) {
             output += formatProperties(resolvedItems.properties, resolvedItems.required, data, 1);
        }
    } else if (schema.type) {
        output += `TYPE: ${schema.type}\n`;
    }
    return output;
}

/**
 * Format data as a concise text format for LLMs.
 */
export const formatAsConciseText = (data: OpenAPIV3.Document): string => {
  const endpoints: string[] = [];
  const schemas: string[] = [];
  
  // Endpoints
  if (data.paths) {
    for (const [path, pathItem] of Object.entries(data.paths)) {
      if (!pathItem) continue;
      
      const validMethods = Object.keys(pathItem).filter(method => 
        HTTP_METHODS.includes(method as any)
      ) as (keyof typeof pathItem)[];

      for (const method of validMethods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject;
        if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
        
        endpoints.push(formatEndpoint(method, path, operation, data));
      }
    }
  }

  // Schemas
  if (data.components?.schemas) {
    for (const [name, schemaRef] of Object.entries(data.components.schemas)) {
        schemas.push(formatSchema(name, schemaRef, data));
    }
  }

  let output = endpoints.join('\n');
  
  if (schemas.length > 0) {
      if (output.length > 0) {
        output += '\n---\n\n';
      }
      output += schemas.join('\n');
  }
  
  return output.trim();
};
```

```typescript // src/backend/transformer.ts
import {
  type FilterOptions,
  type TransformOptions,
  type SchemaTransformer,
  type FilterPatterns,
  type HttpMethod,
} from './types';
import micromatch from 'micromatch';
import { OpenAPIV3 } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';

/**
 * Checks if an endpoint's tags match the provided patterns.
 */
function matchesTags(endpointTags: string[] = [], tagPatterns: FilterPatterns): boolean {
  const { include, exclude } = tagPatterns;

  if (!include?.length && !exclude?.length) {
    return true; // No tag filter, always matches
  }
  
  // If endpoint has no tags, it cannot match an include filter.
  if (!endpointTags.length) {
    return !include?.length;
  }
  
  const matchesInclude = include?.length ? micromatch.some(endpointTags, include) : true;
  const matchesExclude = exclude?.length ? micromatch.some(endpointTags, exclude) : false;

  return matchesInclude && !matchesExclude;
}

/**
 * Filter paths based on configuration
 */
export const filterPaths = (
  paths: OpenAPIV3.PathsObject,
  filterOptions: FilterOptions,
): OpenAPIV3.PathsObject => {
  if (!filterOptions) return paths;
  
  const pathKeys = Object.keys(paths);
  let filteredPathKeys = pathKeys;

  if (filterOptions.paths?.include?.length) {
    filteredPathKeys = micromatch(filteredPathKeys, filterOptions.paths.include, { dot: true });
  }
  if (filterOptions.paths?.exclude?.length) {
    filteredPathKeys = micromatch.not(filteredPathKeys, filterOptions.paths.exclude, { dot: true });
  }

  return filteredPathKeys.reduce((acc, path) => {
    const pathItem = paths[path];
    if (pathItem) {
      const filteredMethods = filterMethods(pathItem, filterOptions);

      if (Object.keys(filteredMethods).length > 0) {
        // Re-add non-method properties from the original pathItem
        const newPathItem: OpenAPIV3.PathItemObject = { ...filteredMethods };
        if (pathItem.summary) newPathItem.summary = pathItem.summary;
        if (pathItem.description) newPathItem.description = pathItem.description;
        if (pathItem.parameters) newPathItem.parameters = pathItem.parameters;
        if (pathItem.servers) newPathItem.servers = pathItem.servers;
        if (pathItem.$ref) newPathItem.$ref = pathItem.$ref;
        
        acc[path] = newPathItem;
      }
    }

    return acc;
  }, {} as OpenAPIV3.PathsObject);
};

function isHttpMethod(method: string): method is HttpMethod {
  return HTTP_METHODS.includes(method as HttpMethod);
}

/**
 * Filter HTTP methods based on configuration
 */
export const filterMethods = (
  pathItem: OpenAPIV3.PathItemObject,
  filterOptions: FilterOptions,
): OpenAPIV3.PathItemObject => {
  const newPathItem: OpenAPIV3.PathItemObject = {};
  
  for (const key in pathItem) {
    if (isHttpMethod(key)) {
      const method: HttpMethod = key;
      const operation = pathItem[method];

      if (!operation) continue;

      if (
        filterOptions.methods &&
        filterOptions.methods.length > 0 &&
        !filterOptions.methods.includes(method)
      ) {
        continue;
      }

      if (!filterOptions.includeDeprecated && operation.deprecated) {
        continue;
      }

      if (
        filterOptions.tags &&
        !matchesTags(operation.tags, filterOptions.tags)
      ) {
        continue;
      }

      newPathItem[method] = operation;
    }
  }
  return newPathItem;
};

/**
 * Recursively find all $ref values in a given object.
 */
export const findRefsRecursive = (
  obj: any, // Keeping `any` here as it's a deep recursive search
  refs: Set<string>,
): void => {
  if (!obj || typeof obj !== 'object') {
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      findRefsRecursive(item, refs);
    }
    return;
  }
  for (const key in obj) {
    if (key === '$ref' && typeof obj[key] === 'string') {
      refs.add(obj[key]);
    } else {
      findRefsRecursive(obj[key], refs);
    }
  }
};

/**
 * Parses a component reference string.
 */
export const getComponentNameFromRef = (ref: string): { type: string; name: string } | null => {
  const prefix = '#/components/';
  if (!ref.startsWith(prefix)) {
    // This is not a component reference we can process for removal.
    // It might be a reference to another part of the document, which is fine.
    return null;
  }
  
  const path = ref.substring(prefix.length);
  const parts = path.split('/');
  
  // We expect a structure like 'schemas/MySchema' or 'parameters/MyParameter'
  if (parts.length < 2) {
    console.warn(`[OpenAPI Condenser] Invalid component reference found: ${ref}`);
    return null;
  }
  
  const type = parts[0];
  // The name might contain slashes if it's nested, so we join the rest.
  const name = parts.slice(1).join('/');

  if (!type || !name) {
    return null;
  }

  return { type, name };
};

/**
 * Removes all components (schemas, parameters, etc.) that are not referenced
 * in the remaining parts of the specification.
 */
export const removeUnusedComponents = (
  spec: OpenAPIV3.Document,
): OpenAPIV3.Document => {
  if (!spec.components) return spec;

  // 1. Find all initial references from the spec roots that are kept.
  const allRefs = new Set<string>();
  const specRoots = [
    spec.paths,
    spec.tags,
    spec.security,
    spec.info,
    spec.servers,
    (spec as any).webhooks, // webhooks are in v3.1
    spec.externalDocs,
  ];

  for (const root of specRoots) {
    if (root) {
      findRefsRecursive(root, allRefs);
    }
  }

  // 2. Transitively discover all dependencies within the components.
  // We keep iterating until no new references are found in an iteration.
  let previousSize;
  do {
    previousSize = allRefs.size;
    allRefs.forEach(ref => {
      const componentInfo = getComponentNameFromRef(ref);
      if (componentInfo) {
        const { type, name } = componentInfo;
        const component = (spec.components as any)?.[type]?.[name];
        if (component) {
          findRefsRecursive(component, allRefs);
        }
      }
    });
  } while (allRefs.size > previousSize);

  // 3. Build a new components object with only the referenced items.
  const newComponents: OpenAPIV3.ComponentsObject = {};
  if (spec.components) {
    for (const componentType in spec.components) {
      const componentGroup = (spec.components as any)[componentType];
      const newComponentGroup: Record<string, any> = {};
      for (const componentName in componentGroup) {
        const ref = `#/components/${componentType}/${componentName}`;
        if (allRefs.has(ref)) {
          newComponentGroup[componentName] = componentGroup[componentName];
        }
      }
      if (Object.keys(newComponentGroup).length > 0) {
        (newComponents as any)[componentType] = newComponentGroup;
      }
    }
  }

  // 4. Replace the old components object or remove it if empty.
  if (Object.keys(newComponents).length > 0) {
    (spec.components as any) = newComponents;
  } else {
    delete spec.components;
  }

  return spec;
};

/**
 * Transform OpenAPI schema based on configuration
 */
export const transformSchema = (
  node: any,
  transformOptions: TransformOptions,
  currentDepth = 0,
): any => {
  if (!node || typeof node !== 'object') {
    return node;
  }
  
  if ('$ref' in node) {
    return node;
  }
  
  // Handle maximum depth
  if (
    transformOptions.maxDepth !== undefined &&
    currentDepth >= transformOptions.maxDepth
  ) {
    return {
      description: `Truncated: Max depth of ${transformOptions.maxDepth} reached`,
    };
  }
  
  if (Array.isArray(node)) {
    return node
      .map(item => transformSchema(item, transformOptions, currentDepth + 1))
      .filter(Boolean);
  }

  const result: { [key: string]: any } = { ...node };
  
  // Remove examples if configured
  if (transformOptions.removeExamples && 'example' in result) {
    delete result.example;
  }
  if (transformOptions.removeExamples && 'examples' in result) {
    delete result.examples;
  }
  
  // Remove descriptions if configured
  if (transformOptions.removeDescriptions && 'description' in result) {
    delete result.description;
  }

  // Remove summaries if configured
  if (transformOptions.removeSummaries && 'summary' in result) {
    delete result.summary;
  }
  
  // Recursively transform nested properties
  for (const key in result) {
    const prop = result[key];
    if (typeof prop === 'object' && prop !== null) {
      result[key] = transformSchema(
        prop,
        transformOptions,
        currentDepth + 1,
      );
    }
  }
  
  return result;
};

/**
 * Applies both filtering and transformations to an entire OpenAPI document.
 */
export const transformOpenAPI = (
  openapi: OpenAPIV3.Document,
  filterOpts?: FilterOptions,
  transformOpts?: TransformOptions,
): OpenAPIV3.Document => {
  let transformed: OpenAPIV3.Document = JSON.parse(JSON.stringify(openapi));

  // 1. Apply path/method/tag filtering
  if (filterOpts && transformed.paths) {
    transformed.paths = filterPaths(transformed.paths, filterOpts);
  }

  // 2. Apply structural removals based on transformOpts
  if (transformOpts) {
    if (transformOpts.includeServers === false) {
      delete transformed.servers;
    }
    if (transformOpts.includeInfo === false) {
      delete transformed.info;
    }

    if (transformed.paths) {
      for (const path in transformed.paths) {
        const pathItem = transformed.paths[path];
        if (pathItem) {
          for (const method of HTTP_METHODS) {
            const operation = pathItem[method] as
              | OpenAPIV3.OperationObject
              | undefined;
            if (operation) {
              if (transformOpts.includeRequestBodies === false) {
                delete operation.requestBody;
              }
              if (transformOpts.includeResponses === false) {
                delete operation.responses;
              }
            }
          }
        }
      }
    }
  }

  // 3. Apply granular transformations (remove descriptions/examples etc)
  if (transformOpts) {
    transformed = transformSchema(
      transformed,
      transformOpts,
    ) as OpenAPIV3.Document;
  }

  // 4. Clean up unused components based on what's left.
  transformed = removeUnusedComponents(transformed);

  // 5. If schemas are explicitly excluded, remove them now.
  if (transformOpts?.includeSchemas === false && transformed.components) {
    delete transformed.components.schemas;
    if (Object.keys(transformed.components).length === 0) {
      delete transformed.components;
    }
  }

  return transformed;
};

/**
 * Higher-order function for composing transformers
 */
export const composeTransformers =
  (...transformers: SchemaTransformer[]): SchemaTransformer =>
  (schema: OpenAPIV3.SchemaObject) =>
    transformers.reduce(
      (currentSchema, transformer) => transformer(currentSchema),
      schema,
    );
```

```typescript // src/frontend/constants.ts
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import type { OutputFormat } from '../shared/types';

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
```

```typescript // src/frontend/state/atoms.ts
import { atom } from 'jotai';
import { client } from '../client';
import type { OutputFormat, SpecStats } from '../../shared/types';
import { DEFAULT_SPEC_FILENAME } from '../constants';
import { defaultConfig } from '../../shared/constants';

// --- Base State Atoms ---
export const specContentAtom = atom<string>('');
export const fileNameAtom = atom<string>(DEFAULT_SPEC_FILENAME);
export const configAtom = atom(defaultConfig);
export const outputFormatAtom = atom<OutputFormat>('markdown');

// --- Derived/Async State Atoms ---
export const outputAtom = atom<string>('');
export const isLoadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);

type Stats = {
  before: SpecStats;
  after: SpecStats;
} | null;

export const statsAtom = atom<Stats>(null);

// --- Utility Functions ---
const normalizeStats = (stats: any): SpecStats => {
    if (!stats) return { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
    return {
        paths: Number(stats.paths) || 0,
        operations: Number(stats.operations) || 0,
        schemas: Number(stats.schemas) || 0,
        charCount: Number(stats.charCount) || 0,
        lineCount: Number(stats.lineCount) || 0,
        tokenCount: Number(stats.tokenCount) || 0,
    };
};

// --- Action Atom (for API calls and complex state updates) ---
export const condenseSpecAtom = atom(
    null, // This is a write-only atom
    async (get, set) => {
        const specContent = get(specContentAtom);
        if (!specContent) {
            set(errorAtom, 'Please provide an OpenAPI specification.');
            return;
        }

        set(isLoadingAtom, true);
        set(errorAtom, null);
        set(outputAtom, '');
        set(statsAtom, null);

        const config = get(configAtom);
        const payload = {
            source: {
                content: specContent,
                path: get(fileNameAtom),
                type: 'memory' as const
            },
            output: {
                format: get(outputFormatAtom),
            },
            filter: config.filter,
            transform: config.transform,
        };

        try {
            const { data, error } = await client.api.condense.post(payload);
            
            if (error) {
                let errorMessage = 'An unknown error occurred.';
                const errorValue = error.value as any;
                if (typeof errorValue === 'object' && errorValue !== null) {
                    if ('errors' in errorValue && Array.isArray(errorValue.errors)) {
                        errorMessage = errorValue.errors.join('\n');
                    } else if ('message' in errorValue && typeof errorValue.message === 'string') {
                        errorMessage = errorValue.message;
                    }
                }
                set(errorAtom, errorMessage);
            } else if (data) {
                set(outputAtom, data.data);
                if (data.stats) {
                    set(statsAtom, {
                        before: normalizeStats(data.stats.before),
                        after: normalizeStats(data.stats.after),
                    });
                }
            }
        } catch (err) {
            set(errorAtom, `Failed to process request: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            set(isLoadingAtom, false);
        }
    }
);
```