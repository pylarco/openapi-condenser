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