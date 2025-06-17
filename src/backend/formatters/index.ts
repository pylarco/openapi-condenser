import { formatAsJson } from './json.ts';
import { formatAsYaml } from './yaml.ts';
import { formatAsXml } from './xml.ts';
import { formatAsMarkdown } from './markdown.ts';
import type { OutputFormat } from '../types.ts';
import { OpenAPIV3 } from 'openapi-types';

export interface Formatter {
  format: (data: OpenAPIV3.Document) => string;
}

export const getFormatter = (format: OutputFormat): Formatter => {
  switch (format) {
    case 'json':
      return { format: formatAsJson };
    case 'yaml':
      return { format: formatAsYaml };
    case 'xml':
      return { format: formatAsXml };
    case 'markdown':
      return { format: formatAsMarkdown };
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}; 