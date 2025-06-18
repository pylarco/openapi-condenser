Of course, I can help you with that. Dealing with environment-specific build issues can be tricky. Removing the command-line interface (CLI) and its associated file-system dependencies is a good way to make your application fully compatible with the Cloudflare Workers environment.

Here are the code changes to remove the CLI functionality and resolve the build errors:

```typescript // src/backend/cli.ts
//TODO: delete this file
```

```typescript // src/backend/constants.ts
export const contentTypeMappings: ReadonlyArray<[string, string]> = [
    ['json', 'json'],
    ['form-data', 'form-data'],
    ['x-www-form-urlencoded', 'form-urlencoded'],
    ['xml', 'xml'],
    ['text/plain', 'text'],
];

export const TOKEN_CHAR_RATIO = 4;
export const USER_AGENT = 'OpenAPI-Condenser/1.0';
```

```typescript // src/backend/extractor.ts
import type { ExtractorConfig, OpenAPIExtractorResult, SpecStats, HttpMethod } from '../shared/types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { OpenAPIV3, OpenAPI } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';
import { TOKEN_CHAR_RATIO } from './constants';

const calculateStringStats = (content: string): Pick<SpecStats, 'charCount' | 'lineCount' | 'tokenCount'> => {
  const charCount = content.length;
  const lineCount = content.split('\n').length;
  const tokenCount = Math.ceil(charCount / TOKEN_CHAR_RATIO);
  return { charCount, lineCount, tokenCount };
}

export const calculateSpecStats = (spec: OpenAPIV3.Document): SpecStats => {
  if (!spec || typeof spec !== 'object') {
    return { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
  }

  const stringStats = calculateStringStats(JSON.stringify(spec, null, 2));

  const validMethods = new Set(HTTP_METHODS);
  const pathItems = spec.paths || {};
  const paths = Object.keys(pathItems);
  const operations = paths.reduce((count, path) => {
    const pathItem = pathItems[path];
    if (pathItem && typeof pathItem === 'object') {
      return count + Object.keys(pathItem).filter(method => validMethods.has(method as HttpMethod)).length;
    }
    return count;
  }, 0);
  const schemas = Object.keys(spec.components?.schemas || {}).length;

  return {
    paths: paths.length,
    operations: operations,
    schemas: schemas,
    ...stringStats,
  };
};

export const calculateOutputStats = (output: string): Pick<SpecStats, 'charCount' | 'lineCount' | 'tokenCount'> => {
    return calculateStringStats(output);
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
```

```typescript // src/backend/transformer.ts
import {
  type FilterOptions,
  type TransformOptions,
  type SchemaTransformer,
  type FilterPatterns,
  type HttpMethod,
} from '../shared/types';
import { OpenAPIV3 } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';

/**
 * Checks if an endpoint's tags match the provided patterns (exact match).
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
  
  const matchesInclude = include?.length ? endpointTags.some(tag => include.includes(tag)) : true;
  const matchesExclude = exclude?.length ? endpointTags.some(tag => exclude.includes(tag)) : false;

  return matchesInclude && !matchesExclude;
}

/**
 * Filter paths based on configuration (exact match).
 */
export const filterPaths = (
  paths: OpenAPIV3.PathsObject,
  filterOptions: FilterOptions,
): OpenAPIV3.PathsObject => {
  if (!filterOptions) return paths;
  
  const pathKeys = Object.keys(paths);
  let filteredPathKeys = pathKeys;

  if (filterOptions.paths?.include?.length) {
    filteredPathKeys = filteredPathKeys.filter(key => filterOptions.paths!.include!.includes(key));
  }
  if (filterOptions.paths?.exclude?.length) {
    filteredPathKeys = filteredPathKeys.filter(key => !filterOptions.paths!.exclude!.includes(key));
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
 * in the remaining parts of the specification. This version uses a more efficient
 * queue-based traversal to find all transitive dependencies.
 */
export const removeUnusedComponents = (
  spec: OpenAPIV3.Document,
): OpenAPIV3.Document => {
  if (!spec.components) return spec;

  // 1. Find all initial references from the spec roots.
  const initialRefs = new Set<string>();
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
      findRefsRecursive(root, initialRefs);
    }
  }

  // 2. Use a queue-based approach (BFS) to transitively find all used components.
  const allUsedRefs = new Set<string>(initialRefs);
  const queue = Array.from(initialRefs);

  while (queue.length > 0) {
    const ref = queue.shift(); // Using shift is okay for typical spec sizes
    if (!ref) continue;

    const componentInfo = getComponentNameFromRef(ref);
    if (componentInfo) {
      const { type, name } = componentInfo;
      const component = (spec.components as any)?.[type]?.[name];
      if (component) {
        const subRefs = new Set<string>();
        findRefsRecursive(component, subRefs);
        
        for (const subRef of subRefs) {
          if (!allUsedRefs.has(subRef)) {
            allUsedRefs.add(subRef);
            queue.push(subRef);
          }
        }
      }
    }
  }

  // 3. Build a new components object with only the referenced items.
  const newComponents: OpenAPIV3.ComponentsObject = {};
  if (spec.components) {
    for (const componentType in spec.components) {
      const componentGroup = (spec.components as any)[componentType];
      const newComponentGroup: Record<string, any> = {};
      for (const componentName in componentGroup) {
        const ref = `#/components/${componentType}/${componentName}`;
        if (allUsedRefs.has(ref)) {
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
 * Transform OpenAPI schema based on configuration. This version is optimized
 * to modify objects in-place, reducing memory allocations.
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
    // We must use .map() to handle cases where an item is replaced (e.g., by max depth truncation).
    return node.map(item => transformSchema(item, transformOptions, currentDepth + 1));
  }

  // It's an object. Modify it in-place.
  
  // Remove examples if configured
  if (transformOptions.removeExamples && 'example' in node) {
    delete node.example;
  }
  if (transformOptions.removeExamples && 'examples' in node) {
    delete node.examples;
  }
  
  // Remove descriptions if configured
  if (transformOptions.removeDescriptions && 'description' in node) {
    delete node.description;
  }

  // Remove summaries if configured
  if (transformOptions.removeSummaries && 'summary' in node) {
    delete node.summary;
  }
  
  // Recursively transform nested properties
  for (const key in node) {
    const prop = node[key];
    if (typeof prop === 'object' && prop !== null) {
      // Re-assign because the recursive call might return a new object (e.g. from maxDepth).
      node[key] = transformSchema(
        prop,
        transformOptions,
        currentDepth + 1,
      );
    }
  }
  
  return node;
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
      delete (transformed as any).info;
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
                delete (operation as any).responses;
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

  // 6. Add endpoint paths summary if requested.
  if (transformOpts?.includeEndpointPathsSummary && transformed.paths) {
    const paths = Object.keys(transformed.paths);
    if (paths.length > 0) {
      (transformed as any)['x-endpoint-paths-summary'] = paths;
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

```typescript // src/backend/types.ts
//TODO: delete this file
```

```typescript // src/backend/utils/fetcher.ts
import YAML from 'yaml';
import type { OpenAPIExtractorResult, Source } from '../../shared/types';
import { OpenAPI } from 'openapi-types';

function getExtension(path: string): string {
    const filename = path.split('?')[0].split('/').pop();
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    // < 1 to ignore leading dots (e.g. '.env') and files with no extension
    if (lastDot < 1) return ''; 
    return filename.substring(lastDot);
}

/**
 * Fetch OpenAPI spec from remote URL or in-memory content
 */
export const fetchSpec = async (
  source: Source
): Promise<OpenAPIExtractorResult> => {
  try {
    let content: string;
    let contentType: string | null = null;
    
    if (source.type === 'memory') {
      content = source.content;
    } else if (source.type === 'remote') {
      const response = await fetch(source.path);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote spec: ${response.status} ${response.statusText}`);
      }
      content = await response.text();
      contentType = response.headers.get('Content-Type');
    } else {
        throw new Error(`Unsupported source type. Only 'memory' and 'remote' are supported in this environment.`);
    }
    
    const data = parseContent(content, source.path, contentType);
    return {
      success: true,
      data,
    };
  } catch (error) {
    throw new Error(`Error processing spec: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Parse content based on file extension or content type, with fallback.
 */
export const parseContent = (
  content: string,
  source: string,
  contentType?: string | null,
): OpenAPI.Document => {
  try {
    // 1. Try parsing based on content type for remote files
    if (contentType) {
      if (contentType.includes('json')) {
        return JSON.parse(content) as OpenAPI.Document;
      }
      if (contentType.includes('yaml') || contentType.includes('x-yaml') || contentType.includes('yml')) {
        return YAML.parse(content) as OpenAPI.Document;
      }
    }

    // 2. Try parsing based on file extension
    const ext = getExtension(source).toLowerCase();
    if (ext === '.json') {
      return JSON.parse(content) as OpenAPI.Document;
    }
    if (ext === '.yaml' || ext === '.yml') {
      return YAML.parse(content) as OpenAPI.Document;
    }
    
    // 3. Fallback: try parsing as JSON, then YAML
    try {
      return JSON.parse(content) as OpenAPI.Document;
    } catch (jsonError) {
      return YAML.parse(content) as OpenAPI.Document;
    }
  } catch (error) {
    throw new Error(
      `Failed to parse content from '${source}'. Not valid JSON or YAML.`,
    );
  }
};
```

```json // package.json
{
  "name": "openapi-condenser",
  "main": "src/server.ts",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "start": "bun run src/backend/server.ts",
    "build": "vite build",
    "deploy": "wrangler deploy",
    "pages:dev": "wrangler dev",
    "test": "bun test"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "20.19.1",
    "@types/react": "18.3.23",
    "@types/react-dom": "18.3.7",
    "@vitejs/plugin-react": "4.5.2",
    "vite": "5.4.19",
    "wrangler": "^4.20.1"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "@codemirror/lang-json": "^6.0.1",
    "@codemirror/lang-markdown": "^6.3.3",
    "@codemirror/lang-yaml": "^6.1.2",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@elysiajs/cors": "^1.3.3",
    "@elysiajs/eden": "^1.3.2",
    "@elysiajs/swagger": "^1.3.0",
    "@types/gsap": "^3.0.0",
    "@uiw/react-codemirror": "^4.23.13",
    "elysia": "1.3.4",
    "fast-xml-parser": "4.5.3",
    "gsap": "^3.13.0",
    "is-ip": "^5.0.0",
    "jotai": "^2.12.5",
    "openapi-types": "^12.1.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "repomix": "^0.3.9",
    "yaml": "^2.3.4"
  }
}
```

```json // tsconfig.json
{
  "compilerOptions": {
    // Environment setup & latest features
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": false,
    "noEmit": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    // Stricter flags enabled
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true
  },
  "include": ["src", "vite.config.ts", "test"],
  "exclude": ["node_modules", "dist"]
}
```

These changes strip out the Node.js-specific modules and dependencies, which should resolve the build errors you were seeing with Wrangler. The filtering logic now uses exact string matching instead of glob patterns, which removes the problematic `micromatch` dependency.

Let me know if you have any other questions