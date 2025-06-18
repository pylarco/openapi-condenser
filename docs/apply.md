An excellent set of feature requests! I've implemented the changes for you. Here are the modifications for each file:

### 1. Frontend: Invisible Scrollable Transformation Section
I've added CSS to create an "invisible" scrollbar and applied it to the Transformation settings panel, making it scrollable without a visible scrollbar if the content overflows.

### 2. Frontend: Collapsible Output Panel
The Output Panel is now collapsible. You can click its header to toggle the visibility of the content area. A chevron icon indicates the current state.

### 3. Backend & Frontend: Endpoint Paths Summary
A new transformation option, "Include Paths Summary," has been added. When enabled, it prepends a summary of the endpoint paths to the generated output. This is supported in the UI, server, and formatters.

Here is the full set of code changes:

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

const shortenParamIn = (paramIn: string): string => {
    switch (paramIn) {
        case 'query': return 'q';
        case 'path': return 'p';
        case 'header': return 'h';
        case 'cookie': return 'c';
        default: return paramIn;
    }
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

    propsMarkdown += `${indentStr}* \`${propName}\`: \`${typeStr}\`${requiredStr}${descriptionStr}\n`;

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
    output += `### \`${method.toUpperCase()}\` ${path}\n`;

    const description = (operation.summary || operation.description || '').replace(/\n/g, ' ');
    if (description) {
      output += `\n${description}\n`;
    }

    // Parameters
    if (operation.parameters?.length) {
      output += `\nP:\n`;
      for (const paramRef of operation.parameters) {
        const param = resolveRef(paramRef, data);
        const schema = param.schema as OpenAPIV3.SchemaObject;
        const type = schema ? formatSchemaType(schema, data) : 'any';
        const required = param.required ? ' (required)' : '';
        const paramDesc = param.description ? ` - ${param.description.replace(/\n/g, ' ')}` : '';
        output += `* \`${param.name}\` ${shortenParamIn(param.in)}: \`${type}\`${required}${paramDesc}\n`;
      }
    }
    
    // Request Body
    if (operation.requestBody) {
      const requestBody = resolveRef(operation.requestBody, data);
      if (requestBody.content) {
        const contentEntries = Object.entries(requestBody.content);
        if (contentEntries.length > 0) {
            output += `\nB:\n`;
            for (const [contentType, mediaType] of contentEntries) {
                output += `* \`${shortenContentType(contentType)}\` -> \`${formatSchemaType(mediaType.schema, data)}\`\n`;
            }
        }
      }
    }

    // Responses
    if (operation.responses) {
      output += `\nR:\n`;
      
      const responseGroups: Map<string, string[]> = new Map();

      for (const [code, responseRef] of Object.entries(operation.responses)) {
        const response = resolveRef(responseRef, data);
        let responseId = 'No description';

        if (response.content) {
            // Take the first content type's schema as the identifier.
            const firstContent = Object.values(response.content)[0];
            if (firstContent?.schema) {
                responseId = `\`${formatSchemaType(firstContent.schema, data)}\``;
            }
        }
        
        if (responseId === 'No description' && response.description) {
            // Fallback to description if no content/schema
            responseId = response.description.replace(/\n/g, ' ');
        }

        if (!responseGroups.has(responseId)) {
            responseGroups.set(responseId, []);
        }
        responseGroups.get(responseId)!.push(code);
      }

      for (const [responseId, codes] of responseGroups.entries()) {
        const codesStr = codes.map(c => `\`${c}\``).join(', ');
        output += `* ${codesStr}: ${responseId}\n`;
      }
    }
    return output;
}

const formatSchema = (name: string, schemaRef: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, data: OpenAPIV3.Document): string => {
    let output = '';
    const schema = resolveRef(schemaRef, data);
      
    output += `### S: ${name}\n`;
    if (schema.description) {
        output += `\n${schema.description.replace(/\n/g, ' ')}\n`;
    }

    if (schema.type === 'object' && schema.properties) {
        output += '\nProps:\n';
        output += formatProperties(schema.properties, schema.required, data, 0);
    } else if (schema.type === 'array' && schema.items) {
        output += `\n**Type**: Array of \`${formatSchemaType(schema.items, data)}\`\n`;
        const resolvedItems = resolveRef(schema.items, data);
        if (resolvedItems.type === 'object' && resolvedItems.properties) {
             output += "\nItem Props:\n";
             output += formatProperties(resolvedItems.properties, resolvedItems.required, data, 0);
        }
    } else if (schema.type) {
        output += `\n**Type**: \`${schema.type}\`\n`;
    }
    return output;
}

/**
 * Format data as a concise text format for LLMs.
 */
export const formatAsConciseText = (data: OpenAPIV3.Document): string => {
  const parts: string[] = [];

  // Endpoint Paths Summary
  if ((data as any)['x-endpoint-paths-summary'] && Array.isArray((data as any)['x-endpoint-paths-summary'])) {
      const paths: string[] = (data as any)['x-endpoint-paths-summary'];
      if (paths.length > 0) {
          let summaryBlock = "## Endpoint Paths Summary\n\n";
          summaryBlock += paths.map(p => `* \`${p}\``).join('\n');
          parts.push(summaryBlock);
      }
  }

  // Info Block
  if (data.info) {
    let infoBlock = `# ${data.info.title}`;
    if (data.info.version) {
        infoBlock += ` (v${data.info.version})`;
    }
    if (data.info.description) {
        infoBlock += `\n\n${data.info.description.trim()}`;
    }
    parts.push(infoBlock);
  }

  const endpoints: string[] = [];
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
  
  if (endpoints.length > 0) {
      parts.push("## Endpoints\n\n" + endpoints.join('\n---\n\n'));
  }

  const schemas: string[] = [];
  // Schemas
  if (data.components?.schemas) {
    for (const [name, schemaRef] of Object.entries(data.components.schemas)) {
        schemas.push(formatSchema(name, schemaRef, data));
    }
  }

  if (schemas.length > 0) {
      parts.push("## Schemas\n\n" + schemas.join('\n---\n\n'));
  }
  
  return parts.join('\n\n---\n\n').trim();
};
```

```typescript // src/backend/server.ts
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { extractOpenAPI } from './extractor';
import type { ExtractorConfig, SpecStats } from '../shared/types';
import { API_PORT } from '../shared/constants';
import { USER_AGENT } from './constants';
import { checkUrlSafety } from './utils/ssrf';

export const app = new Elysia()
  .use(swagger())
  .use(cors({
    origin: /^http:\/\/localhost(:\d+)?$/,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }))
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: error.message };
    }
  })
  .get('/api/fetch-spec', async ({ query: { url }, set }) => {
    if (!url) {
        set.status = 400;
        return { error: 'URL parameter is required' };
    }
    
    const safetyCheck = await checkUrlSafety(url);
    if (!safetyCheck.safe) {
      set.status = safetyCheck.status;
      return { error: safetyCheck.message };
    }

    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      
      if (!response.ok) {
        set.status = response.status;
        const errorText = await response.text();
        return { error: `Failed to fetch spec from ${url}: ${response.statusText}. Details: ${errorText}` };
      }

      const content = await response.text();
      return { content };

    } catch (e) {
      set.status = 500;
      const message = e instanceof Error ? e.message : String(e);
      return { error: `An unexpected error occurred while fetching the spec: ${message}` };
    }
  }, {
    query: t.Object({
      url: t.Optional(t.String({
        format: 'uri-reference',
        description: 'A public URL to an OpenAPI specification file.',
        error: 'Invalid URL format provided.'
      }))
    }),
    response: {
      200: t.Object({ content: t.String() }),
      400: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() }),
      500: t.Object({ error: t.String() })
    },
    detail: {
        tags: ['API'],
        summary: 'Fetch an OpenAPI specification from a public URL',
        description: `Fetches the content of a remote OpenAPI specification. Performs basic SSRF protection by disallowing requests to private, loopback, or otherwise reserved IP addresses.`,
    }
  })
  .post(
    '/api/condense',
    async ({ body, set }) => {
      const config: ExtractorConfig = {
        source: {
          type: 'memory',
          content: body.source.content,
          path: body.source.path,
        },
        output: {
          format: body.output.format,
        },
        filter: {
          ...body.filter,
          includeDeprecated: body.filter?.includeDeprecated ?? false,
        },
        transform: {
          removeExamples: body.transform?.removeExamples ?? false,
          removeDescriptions: body.transform?.removeDescriptions ?? false,
          removeSummaries: body.transform?.removeSummaries ?? false,
          includeServers: body.transform?.includeServers ?? true,
          includeInfo: body.transform?.includeInfo ?? true,
          includeSchemas: body.transform?.includeSchemas ?? true,
          includeRequestBodies: body.transform?.includeRequestBodies ?? true,
          includeResponses: body.transform?.includeResponses ?? true,
          includeEndpointPathsSummary: body.transform?.includeEndpointPathsSummary ?? false,
        },
      };

      const result = await extractOpenAPI(config);

      if (!result.success) {
        set.status = 400;
        return {
          success: false,
          errors: result.errors || ['Unknown error occurred'],
          warnings: result.warnings
        };
      }

      // Ensure we have stats with the expected structure
      const defaultStats: SpecStats = { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
      const stats = result.stats || { before: defaultStats, after: defaultStats };

      return {
        success: true as const,
        data: result.data as string,
        stats: {
          before: stats.before || defaultStats,
          after: stats.after || defaultStats
        },
        warnings: result.warnings
      };
    },
    {
      body: t.Object({
        source: t.Object({
          content: t.String(),
          path: t.String(),
        }),
        output: t.Object({
          format: t.Union([
            t.Literal('json'),
            t.Literal('yaml'),
            t.Literal('xml'),
            t.Literal('markdown'),
          ]),
        }),
        filter: t.Optional(
          t.Object({
            paths: t.Optional(t.Object({
              include: t.Optional(t.Array(t.String())),
              exclude: t.Optional(t.Array(t.String())),
            })),
            tags: t.Optional(t.Object({
                include: t.Optional(t.Array(t.String())),
                exclude: t.Optional(t.Array(t.String())),
            })),
            operationIds: t.Optional(t.Object({
              include: t.Optional(t.Array(t.String())),
              exclude: t.Optional(t.Array(t.String())),
            })),
            methods: t.Optional(t.Array(t.Union([
                t.Literal('get'),
                t.Literal('post'),
                t.Literal('put'),
                t.Literal('delete'),
                t.Literal('patch'),
                t.Literal('options'),
                t.Literal('head'),
                t.Literal('trace'),
            ]))),
            includeDeprecated: t.Optional(t.Boolean()),
          })
        ),
        transform: t.Optional(
          t.Object({
            removeExamples: t.Optional(t.Boolean()),
            removeDescriptions: t.Optional(t.Boolean()),
            removeSummaries: t.Optional(t.Boolean()),
            includeServers: t.Optional(t.Boolean()),
            includeInfo: t.Optional(t.Boolean()),
            includeSchemas: t.Optional(t.Boolean()),
            includeRequestBodies: t.Optional(t.Boolean()),
            includeResponses: t.Optional(t.Boolean()),
            includeEndpointPathsSummary: t.Optional(t.Boolean()),
          })
        ),
      }),
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.String(),
          stats: t.Object({
            before: t.Object({ paths: t.Number(), operations: t.Number(), schemas: t.Number(), charCount: t.Number(), lineCount: t.Number(), tokenCount: t.Number() }),
            after: t.Object({ paths: t.Number(), operations: t.Number(), schemas: t.Number(), charCount: t.Number(), lineCount: t.Number(), tokenCount: t.Number() }),
          }),
          warnings: t.Optional(t.Array(t.String())),
        }),
        400: t.Object({
          success: t.Literal(false),
          errors: t.Optional(t.Array(t.String())),
          warnings: t.Optional(t.Array(t.String())),
        })
      }
    }
  );

export type App = typeof app;

if (import.meta.main) {
  app.listen(API_PORT);
  console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}
```

```typescript // src/backend/transformer.ts
import {
  type FilterOptions,
  type TransformOptions,
  type SchemaTransformer,
  type FilterPatterns,
  type HttpMethod,
} from '../shared/types';
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

```typescript // src/frontend/components/features/config/ConfigPanel.tsx
import React from 'react';
import { useAtom } from 'jotai';
import type { FilterOptions, TransformOptions, OutputFormat } from '../../../../shared/types';
import { configAtom, outputFormatAtom } from '../../../state/atoms';
import { Section, Switch, TextInput } from '../../ui';

type Config = {
  filter: FilterOptions;
  transform: TransformOptions;
}

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useAtom(configAtom);
  const [outputFormat, setOutputFormat] = useAtom(outputFormatAtom);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setConfig((c: Config) => ({ ...c, filter: { ...c.filter, [key]: value } }));
  };

  const handleTransformChange = (key: keyof TransformOptions, value: any) => {
    setConfig((c: Config) => ({ ...c, transform: { ...c.transform, [key]: value } }));
  };
  
  return (
    <div className="sticky top-24 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg">
      <Section title="Output Format">
        <select 
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
        >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="xml">XML</option>
        </select>
      </Section>

      <Section title="Filtering">
        <TextInput 
            label="Include Paths (glob)" 
            placeholder="/users/**, /posts/*"
            value={config.filter.paths?.include}
            onChange={v => handleFilterChange('paths', { ...config.filter.paths, include: v })}
            tooltip="Comma-separated list of glob patterns to include paths. e.g., /users/**"
        />
        <TextInput 
            label="Exclude Paths (glob)" 
            placeholder="/internal/**"
            value={config.filter.paths?.exclude}
            onChange={v => handleFilterChange('paths', { ...config.filter.paths, exclude: v })}
            tooltip="Comma-separated list of glob patterns to exclude paths. e.g., /admin/**"
        />
        <Switch 
            label="Include Deprecated"
            checked={!!config.filter.includeDeprecated}
            onChange={v => handleFilterChange('includeDeprecated', v)}
            tooltip="If checked, endpoints marked as 'deprecated' will be included."
        />
      </Section>

      <Section title="Transformation">
        <div className="max-h-[26rem] overflow-y-auto space-y-4 pr-1 invisible-scrollbar">
            <Switch 
                label="Include Paths Summary"
                checked={!!config.transform.includeEndpointPathsSummary}
                onChange={v => handleTransformChange('includeEndpointPathsSummary', v)}
                tooltip="If checked, a summary of all endpoint paths will be added to the top of the output."
            />
            <Switch 
                label="Include Info"
                checked={!!config.transform.includeInfo}
                onChange={v => handleTransformChange('includeInfo', v)}
                tooltip="If checked, the 'info' block (title, version, etc.) will be included."
            />
            <Switch 
                label="Include Servers"
                checked={!!config.transform.includeServers}
                onChange={v => handleTransformChange('includeServers', v)}
                tooltip="If checked, the 'servers' block will be included."
            />
            <Switch 
                label="Include Responses"
                checked={!!config.transform.includeResponses}
                onChange={v => handleTransformChange('includeResponses', v)}
                tooltip="If checked, the 'responses' block for each endpoint will be included."
            />
            <Switch 
                label="Include Request Bodies"
                checked={!!config.transform.includeRequestBodies}
                onChange={v => handleTransformChange('includeRequestBodies', v)}
                tooltip="If checked, the 'requestBody' block for each endpoint will be included."
            />
            <Switch 
                label="Include Schemas"
                checked={!!config.transform.includeSchemas}
                onChange={v => handleTransformChange('includeSchemas', v)}
                tooltip="If checked, the 'components/schemas' block will be included."
            />
            <Switch 
                label="Remove Examples"
                checked={!!config.transform.removeExamples}
                onChange={v => handleTransformChange('removeExamples', v)}
                tooltip="If checked, all 'example' and 'examples' fields will be removed."
            />
            <Switch 
                label="Remove Descriptions"
                checked={!!config.transform.removeDescriptions}
                onChange={v => handleTransformChange('removeDescriptions', v)}
                tooltip="If checked, all 'description' fields will be removed."
            />
            <Switch 
                label="Remove Summaries"
                checked={!!config.transform.removeSummaries}
                onChange={v => handleTransformChange('removeSummaries', v)}
                tooltip="If checked, all 'summary' fields will be removed."
            />
        </div>
      </Section>
    </div>
  );
};
```

```typescript // src/frontend/components/features/output/OutputPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { outputAtom, isLoadingAtom, errorAtom, outputFormatAtom } from '../../../state/atoms';
import { languageMap } from '../../../constants';

const SkeletonLoader = () => (
    <div className="absolute inset-0 p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
        <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
        <div className="h-4 bg-slate-700/50 rounded w-1/3"></div>
        <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-slate-700/50 rounded w-2/5"></div>
        <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
    </div>
);


export const OutputPanel: React.FC<{}> = () => {
  const output = useAtomValue(outputAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const error = useAtomValue(errorAtom);
  const format = useAtomValue(outputFormatAtom);

  const [copyStatus, setCopyStatus] = useState('Copy');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (copyStatus === 'Copied!') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  // Sync isFullScreen state with the browser's fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopyStatus('Copied!');
  }, [output]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `condensed-spec.${format === 'markdown' ? 'md' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [output, format]);
  
  const handleToggleFullscreen = useCallback(() => {
    if (!panelRef.current) return;
    
    if (!document.fullscreenElement) {
      panelRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);
  
  const handleToggleCollapse = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) {
        return;
    }
    setIsCollapsed(!isCollapsed);
  };

  const panelClasses = isFullScreen 
    ? "bg-slate-900 flex flex-col"
    : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg flex flex-col";

  return (
    <div ref={panelRef} className={panelClasses}>
      <div 
        onClick={handleToggleCollapse}
        className="flex items-center justify-between p-3 border-b border-slate-700/50 flex-shrink-0 cursor-pointer"
      >
        <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Condensed Output</h3>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleToggleFullscreen} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">
                {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            {output && !isLoading && (
            <>
                <button onClick={handleCopy} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">{copyStatus}</button>
                <button onClick={handleDownload} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors">Download</button>
            </>
            )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="flex-grow p-1 relative overflow-auto min-h-[20rem]">
            {isLoading && <SkeletonLoader />}
            {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg text-sm max-w-full overflow-auto">
                    <p className="font-bold mb-2">An error occurred:</p>
                    <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
            </div>
            )}
            {!isLoading && !error && output && (
                <CodeMirror
                    value={output}
                    height="100%"
                    extensions={[languageMap[format](), oneDark]}
                    readOnly={true}
                    theme="dark"
                    style={{ height: '100%', minHeight: '100%' }}
                />
            )}
            {!isLoading && !error && !output && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    <p>Your condensed OpenAPI spec will appear here.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
```

```css // src/frontend/styles.css
/* You can add any additional global styles here if needed */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Global performance optimizations */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Use GPU acceleration for certain animations */
.transform,
.transition-transform,
.transition,
.transition-all,
.transition-opacity {
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Optimize for scrolling performance */
.overflow-auto {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* Optimize tooltips */
[class*="z-"] {
  transform: translateZ(0);
}

.invisible-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
.invisible-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
```

```typescript // src/shared/constants.ts
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
    includeEndpointPathsSummary: false,
  },
};
```

```typescript // src/shared/types.ts
import type { OpenAPI, OpenAPIV3 } from 'openapi-types';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';

export type FilterPatterns = {
  include?: string[];
  exclude?: string[];
};

export interface FilterOptions {
  paths?: FilterPatterns;
  tags?: FilterPatterns;
  operationIds?: FilterPatterns;
  methods?: HttpMethod[];
  includeDeprecated?: boolean;
}

export interface TransformOptions {
  maxDepth?: number;
  removeExamples?: boolean;
  removeDescriptions?: boolean;
  removeSummaries?: boolean;
  includeServers?: boolean;
  includeInfo?: boolean;
  includeSchemas?: boolean;
  includeRequestBodies?: boolean;
  includeResponses?: boolean;
  includeEndpointPathsSummary?: boolean;
}

export type Source =
  | {
      type: 'local' | 'remote';
      path: string;
      content?: undefined;
    }
  | {
      type: 'memory';
      path: string; // for determining parser, e.g., 'spec.json'
      content: string;
    };

export interface ExtractorConfig {
  source: Source;
  output: {
    format: OutputFormat;
    destination?: string;
  };
  filter?: FilterOptions;
  transform?: TransformOptions;
  validation?: {
    strict: boolean;
    ignoreErrors?: string[];
  };
}

export interface SpecStats {
  paths: number;
  operations: number;
  schemas: number;
  charCount: number;
  lineCount: number;
  tokenCount: number;
}

export interface OpenAPIExtractorResult {
  success: boolean;
  data?: OpenAPI.Document | string;
  stats?: {
    before: SpecStats;
    after: SpecStats;
  };
  warnings?: string[];
  errors?: string[];
}

export type SchemaTransformer = (
  schema: OpenAPIV3.SchemaObject,
) => OpenAPIV3.SchemaObject;
```