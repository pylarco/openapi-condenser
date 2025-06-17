import YAML from 'yaml';

/**
 * Format data as YAML
 */
export const formatAsYaml = (data: any): string => {
  return YAML.stringify(data);
}; 