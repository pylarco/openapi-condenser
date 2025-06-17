export const sampleSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Sample API',
      version: '1.0.0',
      description: 'A sample API for testing.',
    },
    servers: [
      {
        url: 'https://api.example.com/v1',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'users', description: 'User operations' },
      { name: 'items', description: 'Item operations' },
      { name: 'internal', description: 'Internal stuff' },
    ],
    paths: {
      '/users': {
        get: {
          summary: 'Get all users',
          tags: ['users'],
          description: 'Returns a list of all users.',
          responses: {
            '200': {
              description: 'A list of users.',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' },
                  },
                  example: [{ id: '1', name: 'John Doe' }],
                },
              },
            },
          },
        },
      },
      '/users/{userId}': {
        get: {
          summary: 'Get a user by ID',
          tags: ['users'],
          description: 'Returns a single user.',
          parameters: [
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'A single user.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
      '/items': {
        post: {
          summary: 'Create an item',
          tags: ['items'],
          description: 'Creates a new item.',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Item' },
              },
            },
          },
          responses: {
            '201': { description: 'Item created' },
          },
        },
      },
      '/internal/status': {
        get: {
          summary: 'Get internal status',
          tags: ['internal'],
          deprecated: true,
          description: 'This is a deprecated endpoint.',
          responses: {
            '200': { description: 'OK' },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID', example: 'user-123' },
            name: { type: 'string', description: 'User name', example: 'Jane Doe' },
          },
        },
        Item: {
          type: 'object',
          properties: {
            sku: { type: 'string' },
            price: { type: 'number' },
          },
        },
        UnusedSchema: {
          type: 'object',
          properties: {
            foo: { type: 'string' },
          },
        },
      },
    },
  };