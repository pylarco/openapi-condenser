import { formatAsJson } from './json';
import { formatAsYaml } from './yaml';
import { formatAsXml } from './xml';
import { formatAsMarkdown } from './markdown';
import type { OutputFormat } from '../types';
import { OpenAPIV3 } from 'openapi-types';

export interface Formatter {
  format: (data: OpenAPIV3.Document) => string;
}

const formatters: Record<OutputFormat, Formatter> = {
  json: { format: formatAsJson },
  yaml: { format: formatAsYaml },
  xml: { format: formatAsXml },
  markdown: { format: formatAsMarkdown },
};

export const getFormatter = (format: OutputFormat): Formatter => {
  const formatter = formatters[format];
  if (!formatter) {
    throw new Error(`Unsupported output format: ${format}`);
  }
  return formatter;
};