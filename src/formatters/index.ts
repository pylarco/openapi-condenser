import type { OutputFormat } from '../backend/types';
import { formatAsJson } from '../backend/formatters/json';
import { formatAsYaml } from '../backend/formatters/yaml';
import { formatAsXml } from '../backend/formatters/xml';
import { formatAsMarkdown } from '../backend/formatters/markdown';

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