import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import YAML from 'yaml';
import type { OpenAPIExtractorResult } from '../types';

/**
 * Fetch OpenAPI spec from local file or remote URL
 */
export const fetchSpec = async (
  sourcePath: string, 
  sourceType: 'local' | 'remote'
): Promise<OpenAPIExtractorResult> => {
  try {
    let content: string;
    
    if (sourceType === 'local') {
      content = await fs.readFile(sourcePath, 'utf-8');
    } else {
      const response = await fetch(sourcePath);
      if (!response.ok) {
        return {
          success: false,
          errors: [`Failed to fetch remote spec: ${response.status} ${response.statusText}`]
        };
      }
      content = await response.text();
    }
    
    return {
      success: true,
      data: parseContent(content, sourcePath),
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Error fetching spec: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

/**
 * Parse content based on file extension or content type
 */
export const parseContent = (content: string, source: string): any => {
  const ext = extname(source).toLowerCase();
  
  try {
    if (ext === '.yaml' || ext === '.yml') {
      return YAML.parse(content);
    } else {
      return JSON.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse content: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 