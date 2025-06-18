import { describe, it, expect } from 'bun:test';
import { extractOpenAPI } from '../../src/backend/extractor';
import type { ExtractorConfig, OpenAPIExtractorResult } from '../../src/shared/types';

const complexTestSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Complex Test API',
    version: '1.0.0',
  },
  paths: {
    '/users/{id}': {
      get: {
        summary: 'Get a user',
        tags: ['Users'],
        operationId: 'getUser',
        parameters: [
          { $ref: '#/components/parameters/UserId' }
        ],
        responses: {
          '200': {
            description: 'A user object',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
    },
    '/posts/{id}': {
      get: {
        summary: 'Get a post',
        tags: ['Posts'],
        operationId: 'getPost',
        responses: {
          '200': {
            description: 'A post object',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Post' },
              },
            },
          },
        },
      },
    },
    '/tags': {
        post: {
            summary: 'Create a tag',
            tags: ['Tags'],
            operationId: 'createTag',
            requestBody: {
                $ref: '#/components/requestBodies/TagBody'
            },
            responses: {
                '201': {
                    description: 'Tag created'
                }
            }
        }
    }
  },
  components: {
    parameters: {
        UserId: {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }
    },
    requestBodies: {
        TagBody: {
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Tag' }
                }
            }
        }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          profile: { $ref: '#/components/schemas/UserProfile' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          avatar: { $ref: '#/components/schemas/Avatar' }
        },
      },
      Avatar: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        }
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          author: { $ref: '#/components/schemas/User' },
        },
      },
      Tag: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
  },
};

describe('Complex Transformer and Stats Validation', () => {
  it('should correctly filter paths, remove unused components transitively, and calculate accurate stats', async () => {
    const config: ExtractorConfig = {
      source: {
        type: 'memory',
        path: 'spec.json',
        content: JSON.stringify(complexTestSpec),
      },
      filter: {
        paths: {
          exclude: ['/posts/{id}'],
        },
      },
      transform: {},
      output: {
        format: 'json',
      },
    };

    const result: OpenAPIExtractorResult = await extractOpenAPI(config);

    expect(result.success).toBe(true);
    if (!result.success || !result.stats) return;

    const transformedSpec = JSON.parse(result.data as string);
    
    // 1. Validate Stats
    expect(result.stats.before.operations).toBe(3);
    expect(result.stats.before.schemas).toBe(5);
    expect(result.stats.after.operations).toBe(2); // get user, create tag
    expect(result.stats.after.schemas).toBe(4);   // User, UserProfile, Avatar, Tag (Post should be removed)
    expect(result.stats.after.charCount).toBeLessThan(result.stats.before.charCount);
    expect(result.stats.after.tokenCount).toBeLessThan(result.stats.before.tokenCount);

    // 2. Validate Path Filtering
    expect(transformedSpec.paths['/users/{id}']).toBeDefined();
    expect(transformedSpec.paths['/posts/{id}']).toBeUndefined();
    expect(transformedSpec.paths['/tags']).toBeDefined();

    // 3. Validate Component Removal
    const components = transformedSpec.components;
    // Kept because /users/{id} is kept
    expect(components.schemas.User).toBeDefined();
    // Kept because User needs it (transitive)
    expect(components.schemas.UserProfile).toBeDefined();
    // Kept because UserProfile needs it (transitive)
    expect(components.schemas.Avatar).toBeDefined();
    // Kept because /tags is kept
    expect(components.schemas.Tag).toBeDefined();
     // Kept because /users/{id} needs it
    expect(components.parameters.UserId).toBeDefined();
    // Kept because /tags needs it
    expect(components.requestBodies.TagBody).toBeDefined();

    // Removed because /posts/{id} was removed and nothing else uses it
    expect(components.schemas.Post).toBeUndefined();
  });

  it('should handle a combination of path, tag, and method filters plus transformations', async () => {
    const multiFilterSpec = {
      openapi: '3.0.0',
      info: { title: 'Multi-filter Test', version: '1.0' },
      paths: {
        '/products': {
          get: { 
            tags: ['products', 'search'],
            summary: 'Get all products',
            description: 'This should be removed.',
            responses: { '200': { description: 'OK' } }
          },
          post: {
            tags: ['products'],
            summary: 'Create a product',
            responses: { '201': { description: 'Created' } }
          }
        },
        '/inventory': {
          get: {
            tags: ['inventory'],
            summary: 'Get inventory',
            responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Inventory' }, example: { 'stock': 100 } } } } }
          }
        },
        '/users': {
          get: {
            tags: ['users'],
            summary: 'Get users',
            responses: { '200': { description: 'OK' } }
          }
        }
      },
      components: {
        schemas: {
          Inventory: { type: 'object', properties: { stock: { type: 'integer' } } }
        }
      }
    };

    const config: ExtractorConfig = {
      source: {
        type: 'memory',
        path: 'spec.json',
        content: JSON.stringify(multiFilterSpec)
      },
      filter: {
        paths: { exclude: ['/users'] }, // Exclude /users
        tags: { include: ['products', 'inventory'] }, // Only include endpoints with these tags
        methods: ['get'] // Only allow GET methods
      },
      transform: {
        removeDescriptions: true,
        removeExamples: true
      },
      output: { format: 'json' }
    };

    const result = await extractOpenAPI(config);
    expect(result.success).toBe(true);
    if(!result.success || !result.stats) return;

    const spec = JSON.parse(result.data as string);

    // 1. Path and method assertions
    expect(spec.paths['/products']).toBeDefined();
    expect(spec.paths['/products'].get).toBeDefined(); // Kept: matches tags and method
    expect(spec.paths['/products'].post).toBeUndefined(); // Removed: method is not 'get'
    
    expect(spec.paths['/inventory']).toBeDefined();
    expect(spec.paths['/inventory'].get).toBeDefined(); // Kept: matches tags and method
    
    expect(spec.paths['/users']).toBeUndefined(); // Removed: excluded by path filter

    // 2. Transformation assertions
    expect(spec.paths['/products'].get.description).toBeUndefined();
    expect(spec.paths['/inventory'].get.responses['200'].content['application/json'].example).toBeUndefined();

    // 3. Component assertions
    expect(spec.components.schemas.Inventory).toBeDefined(); // Kept because /inventory is kept

    // 4. Stats assertions
    expect(result.stats.before.operations).toBe(4);
    expect(result.stats.after.operations).toBe(2); // /products -> get, /inventory -> get
    expect(result.stats.after.charCount).toBeLessThan(result.stats.before.charCount);
  });
});