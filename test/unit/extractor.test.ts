import { describe, it, expect } from 'bun:test';
import { calculateStats } from '../../src/backend/extractor';

describe('extractor.ts unit tests', () => {
    describe('calculateStats', () => {
        it('should return zero for an empty or invalid spec', () => {
            expect(calculateStats(null)).toEqual({ paths: 0, operations: 0, schemas: 0 });
            expect(calculateStats({})).toEqual({ paths: 0, operations: 0, schemas: 0 });
        });

        it('should correctly count paths, operations, and schemas', () => {
            const spec = {
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
            const stats = calculateStats(spec);
            expect(stats).toEqual({ paths: 3, operations: 6, schemas: 2 });
        });

        it('should handle paths with no valid methods', () => {
            const spec = {
                paths: {
                    '/users': {
                        'x-custom-property': 'value',
                        parameters: []
                    }
                },
                components: {}
            };
            const stats = calculateStats(spec);
            expect(stats).toEqual({ paths: 1, operations: 0, schemas: 0 });
        });
    });
}); 