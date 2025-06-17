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
        expect(data?.data).toInclude('### /users');
    });

    it('should filter paths based on include glob pattern', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                paths: { include: ['/users'] },
            },
        });
        
        const result = JSON.parse(data!.data);
        expect(Object.keys(result.paths)).toEqual(['/users']);
        expect(result.paths['/users/{userId}']).toBeUndefined();
        // Check stats
        expect(data?.stats.before.paths).toBe(4);
        expect(data?.stats.after.paths).toBe(1);
    });
    
    it('should filter paths based on exclude glob pattern', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                paths: { exclude: ['/internal/**'] },
            },
        });
        
        const result = JSON.parse(data!.data);
        expect(Object.keys(result.paths)).not.toInclude('/internal/status');
        expect(Object.keys(result.paths)).toHaveLength(3);
        // Check stats
        expect(data?.stats.before.paths).toBe(4);
        expect(data?.stats.after.paths).toBe(3);
    });

    it('should filter by tags', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            filter: {
                tags: { include: ['users'] },
            },
        });
        
        const result = JSON.parse(data!.data);
        expect(Object.keys(result.paths)).toEqual(['/users', '/users/{userId}']);
        expect(data?.stats.after.operations).toBe(2);
    });

    it('should exclude deprecated endpoints by default', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
        });
        
        const result = JSON.parse(data!.data);
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
        
        const result = JSON.parse(data!.data);
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

        const result = JSON.parse(data!.data);
        // Only '/items' path should remain
        expect(Object.keys(result.paths)).toEqual(['/items']);
        // Only 'Item' schema should remain, 'User' and 'UnusedSchema' should be gone
        expect(Object.keys(result.components.schemas)).toEqual(['Item']);
        expect(data?.stats.before.schemas).toBe(3);
        expect(data?.stats.after.schemas).toBe(1);
    });

    it('should apply transformations like removing descriptions', async () => {
        const { data } = await api.api.condense.post({
            source: { content: JSON.stringify(sampleSpec), path: 'spec.json' },
            output: { format: 'json' },
            transform: {
                removeDescriptions: true,
            },
        });

        const result = JSON.parse(data!.data);
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

        if (error?.value && 'success' in error.value && 'errors' in error.value) {
            expect(error.value.success).toBe(false);
            expect(error.value.errors).toContain('Error extracting OpenAPI: Error processing spec: Failed to parse content from \'spec.json\'. Not valid JSON or YAML.');
        } else {
            throw new Error('Unexpected error response format');
        }
    });
  });
});