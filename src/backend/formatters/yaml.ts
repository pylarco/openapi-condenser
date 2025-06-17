import YAML from 'yaml';
import { OpenAPIV3 } from 'openapi-types';

/**
 * Format data as YAML
 */
export const formatAsYaml = (data: OpenAPIV3.Document): string => {
  return YAML.stringify(data);
};