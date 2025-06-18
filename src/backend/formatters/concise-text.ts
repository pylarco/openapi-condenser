import { OpenAPIV3 } from 'openapi-types';
import { contentTypeMappings } from '../constants';
import { HTTP_METHODS } from '../../shared/constants';

const resolveRef = <T extends object>(
  refObj: OpenAPIV3.ReferenceObject | T,
  doc: OpenAPIV3.Document,
): T => {
  if (!refObj || typeof refObj !== 'object' || !('$ref' in refObj))
    return refObj as T;

  const refPath = refObj.$ref.replace('#/components/', '').split('/');
  let current: any = doc.components;
  for (const part of refPath) {
    current = current?.[part];
  }
  return (current || refObj) as T;
};

const formatSchemaType = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  doc: OpenAPIV3.Document,
): string => {
  if (!schema) return 'any';
  if ('$ref' in schema) {
    return schema.$ref.split('/').pop() || 'any';
  }
  if (schema.type === 'array' && schema.items) {
    const itemType = formatSchemaType(schema.items, doc);
    return `array<${itemType}>`;
  }
  return schema.type || 'any';
};

const shortenContentType = (contentType: string): string => {
    for (const [key, shortName] of contentTypeMappings) {
        if (contentType.includes(key)) {
            return shortName;
        }
    }
    return contentType;
};


const formatProperties = (
  properties: { [name: string]: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject },
  required: string[] | undefined,
  doc: OpenAPIV3.Document,
  indent = 0,
): string => {
  let propsMarkdown = '';
  const indentStr = '  '.repeat(indent);

  for (const [propName, propSchema] of Object.entries(properties)) {
    const resolvedPropSchema = resolveRef(propSchema, doc);
    const isRequired = required?.includes(propName);
    const requiredStr = isRequired ? ' (required)' : '';
    
    const typeStr = formatSchemaType(propSchema, doc);
    const descriptionStr = resolvedPropSchema.description ? ` - ${resolvedPropSchema.description.split('\n')[0]}` : '';

    propsMarkdown += `${indentStr}* \`${propName}\`: \`${typeStr}\`${requiredStr}${descriptionStr}\n`;

    let nestedPropsSchema: OpenAPIV3.SchemaObject | undefined;
    const resolvedItems = resolvedPropSchema.type === 'array' && resolvedPropSchema.items ? resolveRef(resolvedPropSchema.items, doc) : undefined;

    if (resolvedPropSchema.type === 'object') {
        nestedPropsSchema = resolvedPropSchema;
    } else if (resolvedItems?.type === 'object') {
        nestedPropsSchema = resolvedItems;
    }

    if (nestedPropsSchema?.properties) {
        propsMarkdown += formatProperties(nestedPropsSchema.properties, nestedPropsSchema.required, doc, indent + 1);
    }
  }
  return propsMarkdown;
};

const formatEndpoint = (method: string, path: string, operation: OpenAPIV3.OperationObject, data: OpenAPIV3.Document): string => {
    let output = '';
    output += `### \`${method.toUpperCase()}\` ${path}\n`;

    const description = (operation.summary || operation.description || '').replace(/\n/g, ' ');
    if (description) {
      output += `\n${description}\n`;
    }

    // Parameters
    if (operation.parameters?.length) {
      output += `\nP:\n`;
      for (const paramRef of operation.parameters) {
        const param = resolveRef(paramRef, data);
        const schema = param.schema as OpenAPIV3.SchemaObject;
        const type = schema ? formatSchemaType(schema, data) : 'any';
        const required = param.required ? ' (required)' : '';
        const paramDesc = param.description ? ` - ${param.description.replace(/\n/g, ' ')}` : '';
        output += `* \`${param.name}\` (*${param.in}*): \`${type}\`${required}${paramDesc}\n`;
      }
    }
    
    // Request Body
    if (operation.requestBody) {
      const requestBody = resolveRef(operation.requestBody, data);
      if (requestBody.content) {
        const contentEntries = Object.entries(requestBody.content);
        if (contentEntries.length > 0) {
            output += `\nB:\n`;
            for (const [contentType, mediaType] of contentEntries) {
                output += `* \`${shortenContentType(contentType)}\` -> \`${formatSchemaType(mediaType.schema, data)}\`\n`;
            }
        }
      }
    }

    // Responses
    if (operation.responses) {
      output += `\nR:\n`;
      for (const [code, responseRef] of Object.entries(operation.responses)) {
        const response = resolveRef(responseRef, data);
        const responseIdParts: string[] = [];
        if (response.content) {
            for (const [contentType, mediaType] of Object.entries(response.content)) {
                responseIdParts.push(`\`${shortenContentType(contentType)}\` -> \`${formatSchemaType(mediaType.schema, data)}\``);
            }
        }
        
        let responseId = responseIdParts.join(', ');
        if (!responseId) {
            responseId = response.description?.replace(/\n/g, ' ') || 'No description';
        }

        output += `* \`${code}\`: ${responseId}\n`;
      }
    }
    return output;
}

const formatSchema = (name: string, schemaRef: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, data: OpenAPIV3.Document): string => {
    let output = '';
    const schema = resolveRef(schemaRef, data);
      
    output += `### S: ${name}\n`;
    if (schema.description) {
        output += `\n${schema.description.replace(/\n/g, ' ')}\n`;
    }

    if (schema.type === 'object' && schema.properties) {
        output += '\nProps:\n';
        output += formatProperties(schema.properties, schema.required, data, 0);
    } else if (schema.type === 'array' && schema.items) {
        output += `\n**Type**: Array of \`${formatSchemaType(schema.items, data)}\`\n`;
        const resolvedItems = resolveRef(schema.items, data);
        if (resolvedItems.type === 'object' && resolvedItems.properties) {
             output += "\nItem Props:\n";
             output += formatProperties(resolvedItems.properties, resolvedItems.required, data, 0);
        }
    } else if (schema.type) {
        output += `\n**Type**: \`${schema.type}\`\n`;
    }
    return output;
}

/**
 * Format data as a concise text format for LLMs.
 */
export const formatAsConciseText = (data: OpenAPIV3.Document): string => {
  const parts: string[] = [];

  // Info Block
  if (data.info) {
    let infoBlock = `# ${data.info.title}`;
    if (data.info.version) {
        infoBlock += ` (v${data.info.version})`;
    }
    if (data.info.description) {
        infoBlock += `\n\n${data.info.description.trim()}`;
    }
    parts.push(infoBlock);
  }

  const endpoints: string[] = [];
  // Endpoints
  if (data.paths) {
    for (const [path, pathItem] of Object.entries(data.paths)) {
      if (!pathItem) continue;
      
      const validMethods = Object.keys(pathItem).filter(method => 
        HTTP_METHODS.includes(method as any)
      ) as (keyof typeof pathItem)[];

      for (const method of validMethods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject;
        if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
        
        endpoints.push(formatEndpoint(method, path, operation, data));
      }
    }
  }
  
  if (endpoints.length > 0) {
      parts.push("## Endpoints\n\n" + endpoints.join('\n---\n\n'));
  }

  const schemas: string[] = [];
  // Schemas
  if (data.components?.schemas) {
    for (const [name, schemaRef] of Object.entries(data.components.schemas)) {
        schemas.push(formatSchema(name, schemaRef, data));
    }
  }

  if (schemas.length > 0) {
      parts.push("## Schemas\n\n" + schemas.join('\n---\n\n'));
  }
  
  return parts.join('\n\n---\n\n').trim();
};