import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import YAML from 'yaml';
import type { OpenAPIExtractorResult, Source } from '../types';
import { OpenAPI } from 'openapi-types';

/**
 * Fetch OpenAPI spec from local file, remote URL, or in-memory content
 */
export const fetchSpec = async (
  source: Source
): Promise<OpenAPIExtractorResult> => {
  try {
    let content: string;
    let contentType: string | null = null;
    
    if (source.type === 'memory') {
      content = source.content;
    } else if (source.type === 'local') {
      content = await fs.readFile(source.path, 'utf-8');
    } else {
      const response = await fetch(source.path);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote spec: ${response.status} ${response.statusText}`);
      }
      content = await response.text();
      contentType = response.headers.get('Content-Type');
    }
    
    const data = parseContent(content, source.path, contentType);
    return {
      success: true,
      data,
    };
  } catch (error) {
    throw new Error(`Error processing spec: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Parse content based on file extension or content type, with fallback.
 */
export const parseContent = (
  content: string,
  source: string,
  contentType?: string | null,
): OpenAPI.Document => {
  try {
    // 1. Try parsing based on content type for remote files
    if (contentType) {
      if (contentType.includes('json')) {
        return JSON.parse(content) as OpenAPI.Document;
      }
      if (contentType.includes('yaml') || contentType.includes('x-yaml') || contentType.includes('yml')) {
        return YAML.parse(content) as OpenAPI.Document;
      }
    }

    // 2. Try parsing based on file extension
    const ext = extname(source).toLowerCase();
    if (ext === '.json') {
      return JSON.parse(content) as OpenAPI.Document;
    }
    if (ext === '.yaml' || ext === '.yml') {
      return YAML.parse(content) as OpenAPI.Document;
    }
    
    // 3. Fallback: try parsing as JSON, then YAML
    try {
      return JSON.parse(content) as OpenAPI.Document;
    } catch (jsonError) {
      return YAML.parse(content) as OpenAPI.Document;
    }
  } catch (error) {
    throw new Error(
      `Failed to parse content from '${source}'. Not valid JSON or YAML.`,
    );
  }
};