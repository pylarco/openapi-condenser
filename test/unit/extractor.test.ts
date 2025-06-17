import { describe, it, expect } from 'bun:test';
import { calculateSpecStats } from '../../src/backend/extractor';
import { OpenAPIV3 } from 'openapi-types';

describe('extractor.ts unit tests', () => {
    describe('calculateSpecStats', () => {
        it('should return zero for an empty or invalid spec', () => {
            const spec = null;
            expect(calculateSpecStats(spec as unknown as OpenAPIV3.Document)).toEqual({ paths: 0, operations: 0, schemas: 0, charCount: 0, lineCount: 0, tokenCount: 0 });
            const emptyStats = calculateSpecStats({} as OpenAPIV3.Document);
            expect(emptyStats.paths).toBe(0);
            expect(emptyStats.operations).toBe(0);
            expect(emptyStats.schemas).toBe(0);
            expect(emptyStats.charCount).toBe(2); // {}
        });

        it('should correctly count paths, operations, and schemas', () => {
            const spec: OpenAPIV3.Document = {
                openapi: '3.0.0',
                info: { title: 'test', version: '1.0'},
                paths: {
                    '/users': {
                        get: { summary: 'Get users', responses: { '200': { description: 'OK' } } },
                        post: { summary: 'Create user', responses: { '200': { description: 'OK' } } }
                    },
                    '/users/{id}': {
                        get: { summary: 'Get user by id', responses: { '200': { description: 'OK' } } },
                        put: { summary: 'Update user', responses: { '200': { description: 'OK' } } },
                        delete: { summary: 'Delete user', responses: { '200': { description: 'OK' } } },
                        // This should not be counted as an operation
                        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]
                    },
                    '/health': {
                        get: { summary: 'Health check', responses: { '200': { description: 'OK' } } }
                    }
                },
                components: {
                    schemas: {
                        User: { type: 'object' },
                        Error: { type: 'object' }
                    }
                }
            };
            const stats = calculateSpecStats(spec);
            expect(stats.paths).toBe(3);
            expect(stats.operations).toBe(6);
            expect(stats.schemas).toBe(2);
            expect(stats.charCount).toBeGreaterThan(100);
            expect(stats.lineCount).toBeGreaterThan(10);
            expect(stats.tokenCount).toBeGreaterThan(25);
        });

        it('should handle paths with no valid methods', () => {
            const usersPath: OpenAPIV3.PathItemObject = {
                parameters: [],
            };
            Object.assign(usersPath, { 'x-custom-property': 'value' });

            const spec: OpenAPIV3.Document = {
                openapi: '3.0.0',
                info: { title: 'test', version: '1.0'},
                paths: {
                    '/users': usersPath
                },
                components: {}
            };
            const stats = calculateSpecStats(spec);
            expect(stats.paths).toBe(1);
            expect(stats.operations).toBe(0);
            expect(stats.schemas).toBe(0);
        });
    });
});