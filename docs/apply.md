I've reviewed the errors and your request for improved type safety. Here are the code changes to fix all the issues and enhance the types where possible.

### `src/backend/formatters/markdown.ts`

I'll fix the type errors when processing schemas by correctly resolving references and handling different schema types. This also resolves the unused variable warning.

```typescript // src/backend/formatters/markdown.ts
import { OpenAPIV3 } from 'openapi-types';

/**
 * Format data as Markdown documentation
 */
export const formatAsMarkdown = (data: OpenAPIV3.Document): string => {
  let markdown = '';
  
  const resolveRef = <T extends object>(
    refObj: OpenAPIV3.ReferenceObject | T,
  ): T => {
    if (!refObj || typeof refObj !== 'object' || !('$ref' in refObj))
      return refObj as T;

    const refPath = refObj.$ref.replace('#/components/', '').split('/');
    let current: any = data.components;
    for (const part of refPath) {
      current = current?.[part];
    }
    return (current || refObj) as T;
  };
  
  // Add API information
  if (data.info) {
    markdown += `# ${data.info.title || 'API Documentation'}\n\n`;
    if (data.info.version) {
      markdown += `**Version:** ${data.info.version}\n\n`;
    }
    if (data.info.description) {
      markdown += `${data.info.description}\n\n`;
    }
  }
  
  // Add server information
  if (data.servers && data.servers.length > 0) {
    markdown += `## Servers\n\n`;
    data.servers.forEach((server: OpenAPIV3.ServerObject) => {
      markdown += `- ${server.url}${server.description ? ` - ${server.description}` : ''}\n`;
    });
    markdown += '\n';
  }
  
  // Add endpoints
  if (data.paths && Object.keys(data.paths).length > 0) {
    markdown += `## Endpoints\n\n`;
    
    Object.entries(data.paths)
      .filter(
        (entry): entry is [string, OpenAPIV3.PathItemObject] =>
          entry[1] !== undefined,
      )
      .forEach(([path, methods]) => {
        Object.entries(methods)
          .filter(
            (entry): entry is [string, OpenAPIV3.OperationObject] =>
              typeof entry[1] === 'object' &&
              entry[1] !== null &&
              'responses' in entry[1],
          )
          .forEach(([method, operation]) => {
            markdown += `### \`${method.toUpperCase()}\` ${path}\n\n`;
            
            if (operation.summary) {
              markdown += `> ${operation.summary}\n\n`;
            }
            
            if (operation.description) {
              markdown += `${operation.description}\n\n`;
            }
            
            // Parameters
            if (operation.parameters && operation.parameters.length > 0) {
              markdown += `**Parameters:**\n`;
              operation.parameters.forEach(
                (
                  paramRef:
                    | OpenAPIV3.ReferenceObject
                    | OpenAPIV3.ParameterObject,
                ) => {
                  const param = resolveRef<OpenAPIV3.ParameterObject>(paramRef);
                  const schema = param.schema as OpenAPIV3.SchemaObject;
                  const type = schema ? formatSchemaType(schema) : 'any';
                  const required = param.required ? ' (required)' : '';
                  markdown += `- \`${param.name}\` (${param.in})${required}: \`${type}\`${param.description ? ` - ${param.description}` : ''}\n`;
                },
              );
              markdown += '\n';
            }
            
            // Request body
            if (operation.requestBody) {
              const requestBody = resolveRef<OpenAPIV3.RequestBodyObject>(operation.requestBody);
              markdown += `**Request Body:**\n\n`;
              
              if (requestBody.description) {
                markdown += `${requestBody.description}\n\n`;
              }
              
              if (requestBody.content) {
                Object.entries(requestBody.content).forEach(([contentType, content]: [string, OpenAPIV3.MediaTypeObject]) => {
                  markdown += `*Content-Type: ${contentType}*\n`;
                  if (content.schema) {
                    markdown += formatSchema(content.schema, data, 1);
                  }
                  markdown += '\n';
                });
              }
            }
            
            // Responses
            if (operation.responses && Object.keys(operation.responses).length > 0) {
              markdown += `**Responses:**\n`;
              Object.entries(operation.responses).forEach(
                ([
                  code,
                  responseRef,
                ]: [
                  string,
                  OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject,
                ]) => {
                  const response =
                    resolveRef<OpenAPIV3.ResponseObject>(responseRef);
                  markdown += `- \`${code}\`: ${response.description || ''}\n`;
                  if (response.content) {
                    Object.entries(response.content).forEach(
                      ([
                        contentType,
                        content,
                      ]: [string, OpenAPIV3.MediaTypeObject]) => {
                        markdown += `  - *${contentType}*: \`${formatSchemaType(
                          content.schema,
                        )}\`\n`;
                      },
                    );
                  }
                },
              );
              markdown += '\n';
            }
            markdown += '---\n\n';
          });
      });
  }
  
  // Add schemas
  if (data.components?.schemas) {
    markdown += `## Schemas\n\n`;
    Object.entries(data.components.schemas).forEach(([name, schema]: [string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject]) => {
      markdown += `### ${name}\n\n`;
      const resolvedSchema = resolveRef<OpenAPIV3.SchemaObject>(schema);
      if (resolvedSchema.description) {
        markdown += `${resolvedSchema.description}\n\n`;
      }
      markdown += formatSchema(schema, data);
      markdown += '\n';
    });
  }
  
  return markdown;
};

const formatSchemaType = (
  schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
): string => {
  if (!schema) return '';
  if ('$ref' in schema) {
    return schema.$ref.split('/').pop() || '';
  }
  if (schema.type === 'array' && schema.items) {
    const itemType = formatSchemaType(schema.items);
    return itemType ? `array<${itemType}>` : 'array';
  }
  return schema.type || '';
};

const formatSchema = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  data: OpenAPIV3.Document,
  indent = 0,
): string => {
    if (!schema) return '';
    
    const indentStr = '  '.repeat(indent);
    let markdown = '';

    const resolveRef = <T extends object>(
      refObj: OpenAPIV3.ReferenceObject | T,
    ): T => {
        if (!refObj || typeof refObj !== 'object' || !('$ref' in refObj))
          return refObj as T;
        const refPath = refObj.$ref.replace('#/components/', '').split('/');
        let current: any = data.components;
        for (const part of refPath) {
            current = current?.[part];
        }
        return (current || refObj) as T;
    };
    
    const currentSchema = resolveRef<OpenAPIV3.SchemaObject>(schema);
    
    if ('$ref' in schema) {
        const refName = schema.$ref.split('/').pop();
        if (schema.$ref.includes('/schemas/')) {
            return `${indentStr}- Refers to Schema: \`${refName}\`\n`;
        }
    }

    if (currentSchema.type === 'object' && currentSchema.properties) {
        markdown += `${indentStr}**Properties:**\n`;
        Object.entries(currentSchema.properties).forEach(([propName, propSchema]: [string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject]) => {
            const required = currentSchema.required?.includes(propName) ? ' (required)' : '';
            const type = formatSchemaType(propSchema);
            markdown += `${indentStr}- \`${propName}\`${required}: \`${type}\``;
            
            const resolvedPropSchema = resolveRef<OpenAPIV3.SchemaObject>(propSchema);

            if (resolvedPropSchema.description) {
                markdown += ` - ${resolvedPropSchema.description}`;
            }
            markdown += '\n';

            const isNestedObject = (items: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject): boolean => {
              const resolvedItems = resolveRef<OpenAPIV3.SchemaObject>(items);
              return resolvedItems.type === 'object';
            };

            if (
                resolvedPropSchema.type === 'object' ||
                (resolvedPropSchema.type === 'array' &&
                  resolvedPropSchema.items &&
                  isNestedObject(resolvedPropSchema.items))
            ) {
                markdown += formatSchema(
                    resolvedPropSchema.type === 'array'
                      ? resolvedPropSchema.items
                      : resolvedPropSchema,
                    data,
                    indent + 1
                );
            }
        });
    } else if (currentSchema.type === 'array' && currentSchema.items) {
        markdown += `${indentStr}**Array of:** \`${formatSchemaType(
          currentSchema.items,
        )}\`\n`;
        const resolvedItems = resolveRef<OpenAPIV3.SchemaObject>(currentSchema.items);
        if (resolvedItems.type === 'object') {
            markdown += formatSchema(currentSchema.items, data, indent + 1);
        }
    } else if (currentSchema.type) {
        markdown += `${indentStr}**Type:** \`${currentSchema.type}\`\n`;
    }
    return markdown;
};
```

### `src/backend/transformer.ts`

Here, I'll fix the method filtering logic to be more type-safe, remove the unused import, and adjust the `transformSchema` function to handle deep recursive transformations on any part of the spec without type errors.

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

const httpMethods: HttpMethod[] = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
];

function isHttpMethod(method: string): method is HttpMethod {
  return httpMethods.includes(method as HttpMethod);
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

  // Apply filtering
  if (filterOpts && transformed.paths) {
    transformed.paths = filterPaths(transformed.paths, filterOpts);
  }

  // Apply transformations on the entire document
  if (transformOpts) {
    transformed = transformSchema(
      transformed,
      transformOpts,
    ) as OpenAPIV3.Document;
  }

  // Then, remove any components that are no longer referenced
  transformed = removeUnusedComponents(transformed);

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

### `src/backend/types.ts`

I'm updating the `HttpMethod` type to be more precise and reusable, which helps fix errors in other files.

```typescript // src/backend/types.ts
import type { OpenAPI, OpenAPIV3 } from 'openapi-types';

export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

export type FilterPatterns = {
  include?: string[];
  exclude?: string[];
};

export type FilterOptions = {
  paths?: FilterPatterns;
  tags?: FilterPatterns;
  operationIds?: FilterPatterns;
  methods?: HttpMethod[];
  includeDeprecated?: boolean;
};

export type TransformOptions = {
  maxDepth?: number;
  removeExamples?: boolean;
  removeDescriptions?: boolean;
  removeSummaries?: boolean;
  includeServers?: boolean;
  includeInfo?: boolean;
};

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

export type ExtractorConfig = {
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
};

export type SpecStats = {
  paths: number;
  operations: number;
  schemas: number;
  charCount: number;
  lineCount: number;
  tokenCount: number;
};

export type OpenAPIExtractorResult = {
  success: boolean;
  data?: OpenAPI.Document | string;
  stats?: {
    before: SpecStats;
    after: SpecStats;
  };
  warnings?: string[];
  errors?: string[];
};

export type SchemaTransformer = (
  schema: OpenAPIV3.SchemaObject,
) => OpenAPIV3.SchemaObject;
```

### `src/frontend/components/features/input/InputPanel.tsx`

I'll fix the broken module import paths.

```typescript // src/frontend/components/features/input/InputPanel.tsx
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { client } from '../../../client';
import { specContentAtom, fileNameAtom } from '../../../state/atoms';

interface InputPanelProps {
  // No props needed after Jotai integration
}

const TabButton = memo<{tab: 'paste' | 'upload' | 'url', activeTab: 'paste' | 'upload' | 'url', onClick: (tab: 'paste' | 'upload' | 'url') => void, children: React.ReactNode}>(
  ({ tab, activeTab, onClick, children }) => (
    <button
      onClick={() => onClick(tab)}
      className={`px-4 py-2 text-sm font-medium transition ${activeTab === tab ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:bg-slate-800/60'}`}
    >
      {children}
    </button>
  )
);

export const InputPanel: React.FC<InputPanelProps> = () => {
  const [specContent, setSpecContent] = useAtom(specContentAtom);
  const setFileName = useSetAtom(fileNameAtom);

  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'url'>('paste');
  const [url, setUrl] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localSpecContent, setLocalSpecContent] = useState(specContent);

  // Debounce effect for spec content
  useEffect(() => {
    const handler = setTimeout(() => {
      if (specContent !== localSpecContent) {
        setSpecContent(localSpecContent);
      }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [localSpecContent, specContent, setSpecContent]);

  // When global state changes (e.g., from file upload or URL fetch), update local state
  useEffect(() => {
    if (specContent !== localSpecContent) {
        setLocalSpecContent(specContent);
    }
  }, [specContent]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSpecContent(content);
        if (textareaRef.current) {
          textareaRef.current.value = content;
        }
        setFileName(file.name);
        setFetchError(null);
      };
      reader.readAsText(file);
    }
  }, [setSpecContent, setFileName]);

  const handlePasteChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalSpecContent(event.target.value);
    setFileName('spec.json'); // Assume json for pasted content
    setFetchError(null);
    setUploadedFileName(null);
  }, [setFileName]);
  
  const handleTabClick = useCallback((tab: 'paste' | 'upload' | 'url') => {
    setActiveTab(tab);
  }, []);
  
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  }, []);

  useEffect(() => {
    const fetchSpecFromUrl = async () => {
      if (!url) {
        setFetchError(null);
        return;
      }

      try {
        new URL(url);
      } catch {
        setFetchError('Invalid URL format.');
        return;
      }

      setIsFetching(true);
      setFetchError(null);
      setUploadedFileName(null);

      try {
        const { data, error } = await client.api['fetch-spec'].get({ $query: { url } });

        if (error) {
          let errorMessage = 'Failed to fetch the spec.';
          const errorValue = error.value as any;
          if (typeof errorValue === 'object' && errorValue !== null) {
            errorMessage = errorValue.error || (typeof errorValue.message === 'string' ? errorValue.message : errorMessage);
          }
          setFetchError(errorMessage);
        } else if (data) {
          setSpecContent(data.content);
          if (textareaRef.current) {
              textareaRef.current.value = data.content;
          }
          try {
            const urlObject = new URL(url);
            setFileName(urlObject.pathname.split('/').pop() || 'spec.from.url');
          } catch {
            setFileName('spec.from.url');
          }
        }
      } catch (err) {
        setFetchError(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      setIsFetching(false);
    };

    if (activeTab === 'url') {
      const handler = setTimeout(() => {
        fetchSpecFromUrl();
      }, 500); // 500ms debounce

      return () => clearTimeout(handler);
    }
  }, [url, activeTab, setSpecContent, setFileName]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-700/50">
        <TabButton tab="paste" activeTab={activeTab} onClick={handleTabClick}>Paste Spec</TabButton>
        <TabButton tab="upload" activeTab={activeTab} onClick={handleTabClick}>Upload File</TabButton>
        <TabButton tab="url" activeTab={activeTab} onClick={handleTabClick}>From URL</TabButton>
      </div>
      <div className="p-1">
        {activeTab === 'paste' && (
          <textarea
            ref={textareaRef}
            value={localSpecContent}
            onChange={handlePasteChange}
            placeholder="Paste your OpenAPI (JSON or YAML) spec here..."
            className="w-full h-64 bg-transparent text-slate-300 p-4 resize-none focus:outline-none placeholder-slate-500 font-mono text-sm"
          />
        )}
        {activeTab === 'upload' && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,.yaml,.yml" />
            <button onClick={handleUploadClick} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Select OpenAPI File
            </button>
            {uploadedFileName && <p className="mt-4 text-sm text-slate-300">Selected: <span className="font-medium">{uploadedFileName}</span></p>}
            {!uploadedFileName && <p className="mt-4 text-sm">Supports .json, .yaml, and .yml</p>}
          </div>
        )}
        {activeTab === 'url' && (
          <div className="h-64 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
              <label htmlFor="url-input" className="block text-sm font-medium text-slate-300 mb-2">
                Enter public URL to an OpenAPI spec
              </label>
              <div className="relative flex items-center">
                <input
                  id="url-input"
                  type="url"
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://petstore3.swagger.io/api/v3/openapi.json"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-md pl-3 pr-10 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                />
                {isFetching && (
                    <div className="absolute right-3">
                        <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                )}
              </div>
              {fetchError && <p className="mt-2 text-sm text-red-400">{fetchError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

### `src/frontend/components/features/output/OutputPanel.tsx`

I'll fix the import paths and also address the `noUncheckedIndexedAccess` issue by changing the type definition of `languageMap` to a mapped type, which assures the compiler that all keys of `OutputFormat` exist.

```typescript // src/frontend/components/features/output/OutputPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import type { OutputFormat } from '../../../../backend/types';
import { outputAtom, isLoadingAtom, errorAtom, outputFormatAtom } from '../../../state/atoms';

interface OutputPanelProps {
  // No props needed after Jotai integration
}

const languageMap: { [K in OutputFormat]: () => any } = {
  json: () => json(),
  yaml: () => yaml(),
  xml: () => markdown({}), // fallback for xml
  markdown: () => markdown({}),
};

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


export const OutputPanel: React.FC<OutputPanelProps> = () => {
  const output = useAtomValue(outputAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const error = useAtomValue(errorAtom);
  const format = useAtomValue(outputFormatAtom);

  const [copyStatus, setCopyStatus] = useState('Copy');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (copyStatus === 'Copied!') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  // Check if we need to automatically go fullscreen
  useEffect(() => {
    if (!output) return;
    
    const lineCount = output.split('\n').length;
    if (lineCount > 100) {
      setIsFullScreen(true);
    }
  }, [output]);

  // Setup scroll listener for fullscreen mode
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isFullScreen) return;

    const handleScroll = () => {
      // If user starts scrolling and we have lots of content, go fullscreen
      if (container.scrollTop > 20 && output.split('\n').length > 30) {
        setIsFullScreen(true);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [output, isFullScreen]);

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
    setIsFullScreen(prev => !prev);
  }, []);
  
  const panelClasses = isFullScreen 
    ? "fixed inset-0 z-50 bg-slate-900 flex flex-col"
    : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg min-h-[20rem] flex flex-col";

  return (
    <div className={panelClasses}>
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">Condensed Output</h3>
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
      <div ref={scrollContainerRef} className="flex-grow p-1 relative overflow-auto">
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
    </div>
  );
};
```

### `test/e2e/server.test.ts`

I'll add guards to ensure stats objects exist before making comparisons, which resolves the type errors.

```typescript // test/e2e/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { treaty } from '@elysiajs/eden';
import YAML from 'yaml';
import { app } from '../../src/backend/server';
import type { App } from '../../src/backend/server';
import { sampleSpec } from '../test.util';

// Using a real public spec for fetch tests
const publicSpecUrl = 'https://petstore3.swagger.io/api/v3/openapi.json';
const nonExistentUrl = 'https://example.com/non-existent-spec.json';

describe('E2E API Tests', () => {
  let server: ReturnType<typeof app.listen>;
  let api: ReturnType<typeof treaty<App>>;

  beforeAll(() => {
    // Start server on a random available port
    server = app.listen(0);
    const port = server.server?.port;
    if (!port) {
        throw new Error('Server port not available');
    }
    api = treaty<App>(`http://localhost:${port}`);
  });

  afterAll(() => {
    server.stop(true);
  });

  describe('/api/fetch-spec', () => {
    it('should fetch a valid remote OpenAPI spec', async () => {
      const { data, error, status } = await api['api']['fetch-spec'].get({
        query: { url: publicSpecUrl },
      });

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data?.content).toBeString();
      expect(() => JSON.parse(data!.content)).not.toThrow();
      const parsed = JSON.parse(data!.content);
      expect(parsed.openapi).toStartWith('3.');
    }, 10000);

    it('should return 400 for a missing URL parameter', async () => {
        // @ts-expect-error - testing invalid input
        const { data, error, status } = await api['api']['fetch-spec'].get({ query: {} });
        expect(status).toBe(400);
        if (error?.value && 'error' in error.value) {
            expect(error.value.error).toBe('URL parameter is required');
        } else {
            throw new Error('Unexpected error response format');
        }
    });

    it('should return 400 for an invalid URL format', async () => {
        const { error, status } = await api['api']['fetch-spec'].get({ query: { url: 'not-a-url' } });
        expect(status).toBe(400);
        if (error?.value && 'error' in error.value) {
            expect(error.value.error).toInclude('Invalid URL');
        } else {
            throw new Error('Unexpected error response format');
        }
    });
    
    it('should return 403 when trying to fetch from a private network address (SSRF protection)', async () => {
        const { error, status } = await api['api']['fetch-spec'].get({ query: { url: 'http://127.0.0.1/spec.json' } });
        expect(status).toBe(403);
        if (error?.value && 'error' in error.value) {
            expect(error.value.error).toBe('Fetching specs from private or local network addresses is forbidden.');
        } else {
            throw new Error('Unexpected error response format');
        }
    });

    it('should handle non-existent remote files gracefully', async () => {
        const { error, status } = await api['api']['fetch-spec'].get({ query: { url: nonExistentUrl } });
        expect(status).toBe(404);
        if (error?.value && 'error' in error.value) {
            expect(error.value.error).toInclude('Failed to fetch spec');
        } else {
            throw new Error('Unexpected error response format');
        }
    });
  });

  describe('/api/condense', () => {
    it('should condense a spec to YAML format', async () => {
      const { data, error, status } = await api.api.condense.post({
        source: {
          content: JSON.stringify(sampleSpec),
          path: 'spec.json',
        },
        output: { format: 'yaml' },
      });

      expect(status).toBe(200);
      expect(error).toBeNull();
      expect(data?.success).toBe(true);
      expect(data?.data).toBeString();

      // Check if the output is valid YAML
      let parsedYaml: any;
      expect(() => parsedYaml = YAML.parse(data!.data)).not.toThrow();
      
      if(parsedYaml) {
        expect(parsedYaml.openapi).toBe('3.0.0');
        expect(parsedYaml.info.title).toBe('Sample API');
      } else {
        throw new Error('parsedYaml should not be undefined');
      }
    });
    
    it('should condense a spec to Markdown format', async () => {
        const { data, error, status } = await api.api.condense.post({
            source: {
              content: JSON.stringify(sampleSpec),
              path: 'spec.json',
            },
            output: { format: 'markdown' },
        });

        expect(status).toBe(200);
        expect(error).toBeNull();
        expect(data?.success).toBe(true);
        expect(data?.data).toBeString();
        expect(data?.data).toStartWith('# Sample API');
        expect(data?.data).toInclude('## Endpoints');
        expect(data?.data).toInclude('### `GET` /users');
    });

    it('should filter paths based on include glob pattern', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                paths: { include: ['/users'] },
            },
        });
        
        expect(data).toBeDefined();
        expect(data?.stats).toBeDefined();
        if (!data || !data.stats) throw new Error("Data or stats missing");
        
        const result = JSON.parse(data.data);
        expect(Object.keys(result.paths)).toEqual(['/users']);
        expect(result.paths['/users/{userId}']).toBeUndefined();
        // Check stats
        expect(data.stats.before.paths).toBe(4);
        expect(data.stats.after.paths).toBe(1);
        expect(data.stats.after.charCount).toBeLessThan(data.stats.before.charCount);
    });
    
    it('should filter paths based on exclude glob pattern', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                paths: { exclude: ['/internal/**'] },
            },
        });
        
        expect(data).toBeDefined();
        expect(data?.stats).toBeDefined();
        if (!data || !data.stats) throw new Error("Data or stats missing");

        const result = JSON.parse(data.data);
        expect(Object.keys(result.paths)).not.toInclude('/internal/status');
        expect(Object.keys(result.paths)).toHaveLength(3);
        // Check stats
        expect(data.stats.before.paths).toBe(4);
        expect(data.stats.after.paths).toBe(3);
        expect(data.stats.after.charCount).toBeLessThan(data.stats.before.charCount);
    });

    it('should filter by tags', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                tags: { include: ['users'] },
            },
        });
        
        expect(data).toBeDefined();
        if (!data) throw new Error("Data missing");

        const result = JSON.parse(data.data);
        expect(Object.keys(result.paths)).toEqual(['/users', '/users/{userId}']);
        expect(data.stats?.after.operations).toBe(2);
    });

    it('should exclude deprecated endpoints by default', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
        });
        
        expect(data).toBeDefined();
        if (!data) throw new Error("Data missing");
        
        const result = JSON.parse(data.data);
        expect(result.paths['/internal/status']).toBeUndefined();
    });

    it('should include deprecated endpoints when requested', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                includeDeprecated: true,
            },
        });
        
        expect(data).toBeDefined();
        if (!data) throw new Error("Data missing");

        const result = JSON.parse(data.data);
        expect(result.paths['/internal/status']).toBeDefined();
    });

    it('should remove unused components after filtering', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                tags: { include: ['items'] },
            },
        });

        expect(data).toBeDefined();
        expect(data?.stats).toBeDefined();
        if (!data || !data.stats) throw new Error("Data or stats missing");

        const result = JSON.parse(data.data);
        // Only '/items' path should remain
        expect(Object.keys(result.paths)).toEqual(['/items']);
        // Only 'Item' schema should remain, 'User' and 'UnusedSchema' should be gone
        expect(Object.keys(result.components.schemas)).toEqual(['Item']);
        expect(data.stats.before.schemas).toBe(3);
        expect(data.stats.after.schemas).toBe(1);
    });

    it('should apply transformations like removing descriptions', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            transform: {
                removeDescriptions: true,
            },
        });

        expect(data).toBeDefined();
        if (!data) throw new Error("Data missing");

        const result = JSON.parse(data.data);
        expect(result.info.description).toBeUndefined();
        expect(result.paths['/users'].get.description).toBeUndefined();
        expect(result.components.schemas.User.properties.id.description).toBeUndefined();
    });

    it('should return 400 for invalid source content', async () => {
        const { error, status } = await api.api.condense.post({
            source: {
              content: 'this is not a valid json or yaml',
              path: 'spec.json',
            },
            output: { format: 'json' },
        });

        expect(status).toBe(400);

        if (error?.value && 'success' in error.value && 'errors' in error.value && Array.isArray(error.value.errors)) {
            expect(error.value.success).toBe(false);
            expect(error.value.errors).toContain('Error extracting OpenAPI: Error processing spec: Failed to parse content from \'spec.json\'. Not valid JSON or YAML.');
        } else {
            throw new Error('Unexpected error response format');
        }
    });
  });
});
```

### `test/unit/extractor.test.ts`

Here, I'm fixing the import to use the correct `calculateSpecStats` function name.

```typescript // test/unit/extractor.test.ts
import { describe, it, expect } from 'bun:test';
import { calculateSpecStats } from '../../src/backend/extractor';
import { OpenAPIV3 } from 'openapi-types';

describe('extractor.ts unit tests', () => {
    describe('calculateSpecStats', () => {
        it('should return zero for an empty or invalid spec', () => {
            expect(calculateSpecStats(null as any)).toEqual({ paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 });
            const emptyStats = calculateSpecStats({} as OpenAPIV3.Document);
            expect(emptyStats.paths).toBe(0);
            expect(emptyStats.operations).toBe(0);
            expect(emptyStats.schemas).toBe(0);
            expect(emptyStats.charCount).toBe(2); // {}
        });

        it('should correctly count paths, operations, and schemas', () => {
            const spec: Partial<OpenAPIV3.Document> = {
                paths: {
                    '/users': {
                        get: { summary: 'Get users' },
                        post: { summary: 'Create user' }
                    },
                    '/users/{id}': {
                        get: { summary: 'Get user by id' },
                        put: { summary: 'Update user' },
                        delete: { summary: 'Delete user' },
                        // This should not be counted as an operation
                        parameters: [{ name: 'id', in: 'path' }]
                    },
                    '/health': {
                        get: { summary: 'Health check' }
                    }
                },
                components: {
                    schemas: {
                        User: { type: 'object' },
                        Error: { type: 'object' }
                    }
                }
            };
            const stats = calculateSpecStats(spec as OpenAPIV3.Document);
            expect(stats.paths).toBe(3);
            expect(stats.operations).toBe(6);
            expect(stats.schemas).toBe(2);
            expect(stats.charCount).toBeGreaterThan(100);
            expect(stats.lineCount).toBeGreaterThan(10);
            expect(stats.tokenCount).toBeGreaterThan(25);
        });

        it('should handle paths with no valid methods', () => {
            const spec: Partial<OpenAPIV3.Document> = {
                paths: {
                    '/users': {
                        'x-custom-property': 'value',
                        parameters: []
                    }
                },
                components: {}
            };
            const stats = calculateSpecStats(spec as OpenAPIV3.Document);
            expect(stats.paths).toBe(1);
            expect(stats.operations).toBe(0);
            expect(stats.schemas).toBe(0);
        });
    });
});
```

### `test/unit/transformer.test.ts`

I'm making the test specs valid by adding required properties (`openapi`, `info`) and using optional chaining (`?.`) to safely access potentially undefined properties in the assertions.

```typescript // test/unit/transformer.test.ts
import { describe, it, expect } from 'bun:test';
import { getComponentNameFromRef, removeUnusedComponents, findRefsRecursive } from '../../src/backend/transformer';
import { OpenAPIV3 } from 'openapi-types';

describe('transformer.ts unit tests', () => {
    describe('getComponentNameFromRef', () => {
        it('should correctly parse a standard component ref', () => {
            const result = getComponentNameFromRef('#/components/schemas/MySchema');
            expect(result).toEqual({ type: 'schemas', name: 'MySchema' });
        });

        it('should correctly parse a ref with a multi-part name', () => {
            const result = getComponentNameFromRef('#/components/schemas/Common/ErrorResponse');
            expect(result).toEqual({ type: 'schemas', name: 'Common/ErrorResponse' });
        });

        it('should return null for refs not pointing to components', () => {
            const result = getComponentNameFromRef('#/paths/~1users/get');
            expect(result).toBeNull();
        });

        it('should return null for malformed component refs', () => {
            expect(getComponentNameFromRef('#/components/schemas/')).toBeNull();
            expect(getComponentNameFromRef('#/components/')).toBeNull();
            expect(getComponentNameFromRef('invalid-ref')).toBeNull();
        });
    });

    describe('findRefsRecursive', () => {
        it('should find all refs in a complex object', () => {
            const obj = {
                a: { $ref: '#/components/schemas/A' },
                b: [{ $ref: '#/components/schemas/B' }],
                c: { nested: { $ref: '#/components/schemas/C' } },
                d: 'not a ref',
                e: { $ref: 123 } // invalid ref type
            };
            const refs = new Set<string>();
            findRefsRecursive(obj, refs);
            expect(refs).toEqual(new Set(['#/components/schemas/A', '#/components/schemas/B', '#/components/schemas/C']));
        });
    });

    describe('removeUnusedComponents', () => {
        const baseSpec = (): OpenAPIV3.Document => ({
            openapi: '3.0.0',
            info: { title: 'Test Spec', version: '1.0.0' },
            paths: {
                '/users': {
                    get: {
                        responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } }
                    }
                }
            },
            components: {
                schemas: {
                    User: { type: 'object', properties: { profile: { $ref: '#/components/schemas/Profile' } } },
                    Profile: { type: 'object', properties: { avatar: { $ref: '#/components/schemas/Avatar' } } },
                    Avatar: { type: 'object' },
                    UnusedSchema: { type: 'object' },
                    OrphanedDependency: { $ref: '#/components/schemas/UnusedSchema' }
                },
                parameters: {
                    UnusedParam: { name: 'limit', in: 'query' }
                }
            }
        });
        
        it('should remove all unused components, including transitive ones', () => {
            const spec = baseSpec();
            const result = removeUnusedComponents(spec);

            // Kept schemas
            expect(result.components?.schemas?.User).toBeDefined();
            expect(result.components?.schemas?.Profile).toBeDefined();
            expect(result.components?.schemas?.Avatar).toBeDefined();

            // Removed schemas
            expect(result.components?.schemas?.UnusedSchema).toBeUndefined();
            expect(result.components?.schemas?.OrphanedDependency).toBeUndefined();

            // Removed component groups
            expect(result.components?.parameters).toBeUndefined();
        });

        it('should remove the entire components object if nothing is left', () => {
            const spec: OpenAPIV3.Document = {
                openapi: '3.0.0',
                info: { title: 'Test Spec', version: '1.0.0' },
                paths: { '/health': { get: { responses: { '200': { description: 'OK' } } } } },
                components: { schemas: { Unused: { type: 'object' } } }
            };
            const result = removeUnusedComponents(spec);
            expect(result.components).toBeUndefined();
        });

        it('should not modify a spec with no components object', () => {
            const spec: OpenAPIV3.Document = { 
                openapi: '3.0.0',
                info: { title: 'Test Spec', version: '1.0.0' },
                paths: {} 
            };
            const result = removeUnusedComponents(JSON.parse(JSON.stringify(spec)));
            expect(result).toEqual(spec);
        });
    });
});
```

These changes should resolve all the reported TypeScript errors and improve the overall type safety of your application.