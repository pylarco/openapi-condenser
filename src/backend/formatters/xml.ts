import { XMLBuilder } from 'fast-xml-parser';

/**
 * Format data as XML
 */
export const formatAsXml = (data: any): string => {
  const builder = new XMLBuilder({
    format: true,
    indentBy: '  ',
    ignoreAttributes: false
  });
  
  return builder.build({ openapi: data });
}; 