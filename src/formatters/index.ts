import type { OutputFormat } from '../types';
import { formatAsJson } from './json.ts';
import { formatAsYaml } from './yaml.ts';
import { formatAsXml } from './xml.ts';
import { formatAsMarkdown } from './markdown.ts';

export interface Formatter {
  format: (data: any) => string;
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