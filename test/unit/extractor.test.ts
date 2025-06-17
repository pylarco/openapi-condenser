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