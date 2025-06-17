import type { FilterOptions, TransformOptions, SchemaTransformer } from './types';

/**
 * Filter paths based on configuration
 */
export const filterPaths = (
  paths: Record<string, any>, 
  filterOptions: FilterOptions
): Record<string, any> => {
  if (!filterOptions) return paths;
  
  return Object.entries(paths).reduce((acc, [path, methods]) => {
    // Filter by path
    if (filterOptions.paths) {
      if (filterOptions.paths instanceof RegExp && !filterOptions.paths.test(path)) {
        return acc;
      } else if (Array.isArray(filterOptions.paths) && !filterOptions.paths.includes(path)) {
        return acc;
      }
    }
    
    // Filter methods based on configuration
    const filteredMethods = filterMethods(methods, filterOptions);
    
    if (Object.keys(filteredMethods).length > 0) {
      acc[path] = filteredMethods;
    }
    
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Filter HTTP methods based on configuration
 */
export const filterMethods = (
  methods: Record<string, any>,
  filterOptions: FilterOptions
): Record<string, any> => {
  return Object.entries(methods).reduce((acc, [method, definition]) => {
    // Skip if method is not in the filter list
    if (filterOptions.methods && !filterOptions.methods.includes(method as any)) {
      return acc;
    }
    
    // Skip deprecated endpoints if configured
    if (!filterOptions.includeDeprecated && definition.deprecated) {
      return acc;
    }
    
    // Filter by tags
    if (filterOptions.tags && definition.tags) {
      const hasMatchingTag = definition.tags.some((tag: string) => {
        if (filterOptions.tags instanceof RegExp) {
          return filterOptions.tags.test(tag);
        } else if (Array.isArray(filterOptions.tags)) {
          return filterOptions.tags.includes(tag);
        }
        return false;
      });
      
      if (!hasMatchingTag) {
        return acc;
      }
    }
    
    acc[method] = definition;
    return acc;
  }, {} as Record<string, any>);
};

/**
 * Transform OpenAPI schema based on configuration
 */
export const transformSchema = (
  schema: any,
  transformOptions: TransformOptions,
  currentDepth = 0
): any => {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  
  // Handle maximum depth
  if (transformOptions.maxDepth !== undefined && currentDepth >= transformOptions.maxDepth) {
    if (Array.isArray(schema)) {
      return schema.length > 0 ? ['...'] : [];
    }
    return { truncated: true };
  }
  
  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map(item => transformSchema(item, transformOptions, currentDepth + 1));
  }
  
  // Handle objects
  const result = { ...schema };
  
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
  
  // Process all properties recursively
  Object.keys(result).forEach(key => {
    if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = transformSchema(result[key], transformOptions, currentDepth + 1);
    }
  });
  
  return result;
};

/**
 * Transform the entire OpenAPI document based on configuration
 */
export const transformOpenAPI = (
  openapi: any,
  filterOpts?: FilterOptions,
  transformOpts?: TransformOptions
): any => {
  const result = { ...openapi };
  
  // Transform paths if they exist
  if (result.paths && filterOpts) {
    result.paths = filterPaths(result.paths, filterOpts);
  }
  
  // Apply schema transformations
  if (transformOpts) {
    // Remove server information if not required
    if (!transformOpts.includeServers && result.servers) {
      delete result.servers;
    }
    
    // Remove API info if not required
    if (!transformOpts.includeInfo && result.info) {
      delete result.info;
    }
    
    // Transform schemas if they exist
    if (result.components?.schemas) {
      result.components.schemas = transformSchema(
        result.components.schemas,
        transformOpts
      );
    }
  }
  
  return result;
};

/**
 * Higher-order function for composing transformers
 */
export const composeTransformers = 
  (...transformers: SchemaTransformer[]): SchemaTransformer => 
  (schema: any) => 
    transformers.reduce((result, transformer) => transformer(result), schema); 