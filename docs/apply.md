Of course! I see you have a couple of failing tests. I can help you fix those. Based on the test logs, the issues are:

1.  The markdown output format from the `/api/condense` endpoint doesn't match the test's expectations. It's producing a custom concise text format instead of standard markdown headers.
2.  The token count calculation for the condensation statistics is inconsistent, causing the "after" token count to be higher than the "before" count in some cases, which fails the test assertion.

I'll correct the markdown formatter to produce proper markdown and fix the token calculation to be consistent. Here are the code changes:

```typescript
// src/backend/extractor.ts
import type { ExtractorConfig, OpenAPIExtractorResult, SpecStats, HttpMethod } from './types';
import { fetchSpec } from './utils/fetcher';
import { transformOpenAPI } from './transformer';
import { getFormatter } from './formatters';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { OpenAPIV3, OpenAPI } from 'openapi-types';
import { HTTP_METHODS } from '../shared/constants';
import { DEFAULT_CONFIG_PATH, TOKEN_CHAR_RATIO } from './constants';

export const calculateSpecStats = (spec: OpenAPIV3.Document): SpecStats => {
  if (!spec || typeof spec !== 'object') {
    return { paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 };
  }

  const prettySpecString = JSON.stringify(spec, null, 2);

  const charCount = prettySpecString.length;
  const lineCount = prettySpecString.split('\n').length;
  // Rough approximation of token count.
  // Using charCount (from pretty-printed string) for consistency with how formatted output stats are calculated.
  const tokenCount = Math.ceil(charCount / TOKEN_CHAR_RATIO);

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
    charCount,
    lineCount,
    tokenCount,
  };
};

export const calculateOutputStats = (output: string): Pick<SpecStats, 'charCount' | 'lineCount' | 'tokenCount'> => {
    const charCount = output.length;
    const lineCount = output.split('\n').length;
    const tokenCount = Math.ceil(charCount / TOKEN_CHAR_RATIO);

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
  configPath: string = DEFAULT_CONFIG_PATH
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
```typescript
// src/backend/formatters/concise-text.ts
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
      output += `\n**Parameters**\n`;
      for (const paramRef of operation.parameters) {
        const param = resolveRef(paramRef, data);
        const schema = param.schema as OpenAPIV3.SchemaObject;
        const type = schema ? formatSchemaType(schema, data) : 'any';
        const required = param.required ? ' (required)' : '';
        const paramDesc = param.description ? ` - ${param.description.replace(/\n/g, ' ')}` : '';
        output += `* \`${param.name}\` (*${param.in}*): \`${type}\`${required}${paramDesc}\n`;
      }
    }
    
    // Request Body
    if (operation.requestBody) {
      const requestBody = resolveRef(operation.requestBody, data);
      if (requestBody.content) {
        const contentEntries = Object.entries(requestBody.content);
        if (contentEntries.length > 0) {
            output += `\n**Request Body**\n`;
            for (const [contentType, mediaType] of contentEntries) {
                output += `* \`${shortenContentType(contentType)}\` -> \`${formatSchemaType(mediaType.schema, data)}\`\n`;
            }
        }
      }
    }

    // Responses
    if (operation.responses) {
      output += `\n**Responses**\n`;
      const groupedResponses: { [key: string]: string[] } = {};
      
      for (const [code, responseRef] of Object.entries(operation.responses)) {
        const response = resolveRef(responseRef, data);
        const responseIdParts: string[] = [];
        if (response.content) {
            for (const [contentType, mediaType] of Object.entries(response.content)) {
                responseIdParts.push(`\`${shortenContentType(contentType)}\` -> \`${formatSchemaType(mediaType.schema, data)}\``);
            }
        }
        
        let responseId = responseIdParts.join(', ');
        if (!responseId) {
            responseId = response.description?.replace(/\n/g, ' ') || 'No description';
        }

        groupedResponses[responseId] = [...(groupedResponses[responseId] || []), code];
      }

      for (const [responseId, codes] of Object.entries(groupedResponses)) {
           output += `* \`${codes.join(', ')}\`: ${responseId}\n`;
      }
    }
    return output;
}

const formatSchema = (name: string, schemaRef: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, data: OpenAPIV3.Document): string => {
    let output = '';
    const schema = resolveRef(schemaRef, data);
      
    output += `### ${name}\n`;
    if (schema.description) {
        output += `\n${schema.description.replace(/\n/g, ' ')}\n`;
    }

    if (schema.type === 'object' && schema.properties) {
        output += '\n**Properties**\n';
        output += formatProperties(schema.properties, schema.required, data, 0);
    } else if (schema.type === 'array' && schema.items) {
        output += `\n**Type**: Array of \`${formatSchemaType(schema.items, data)}\`\n`;
        const resolvedItems = resolveRef(schema.items, data);
        if (resolvedItems.type === 'object' && resolvedItems.properties) {
             output += "\n**Item Properties**\n";
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
```typescript
// test/e2e/server.test.ts
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