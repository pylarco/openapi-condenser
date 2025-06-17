import { XMLBuilder } from 'fast-xml-parser';
import { OpenAPIV3 } from 'openapi-types';

/**
 * Format data as XML
 */
export const formatAsXml = (data: OpenAPIV3.Document): string => {
  const builder = new XMLBuilder({
    format: true,
    indentBy: '  ',
    ignoreAttributes: false
  });
  
  return builder.build({ openapi: data });
}; 