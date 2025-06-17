import type { OutputFormat } from '../types';
import { formatAsJson } from './json';
import { formatAsYaml } from './yaml';
import { formatAsXml } from './xml';
import { formatAsMarkdown } from './markdown';

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