import { OpenAPIV3 } from 'openapi-types';

/**
 * Format data as JSON
 */
export const formatAsJson = (data: OpenAPIV3.Document): string => {
  return JSON.stringify(data, null, 2);
}; 