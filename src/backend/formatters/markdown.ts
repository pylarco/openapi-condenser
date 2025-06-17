import { OpenAPIV3 } from 'openapi-types';

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
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('form-data')) return 'form-data';
  if (contentType.includes('x-www-form-urlencoded')) return 'form-urlencoded';
  if (contentType.includes('xml')) return 'xml';
  if (contentType.includes('text/plain')) return 'text';
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

    propsMarkdown += `${indentStr}- ${propName}: ${typeStr}${requiredStr}${descriptionStr}\n`;

    let nestedPropsSchema: OpenAPIV3.SchemaObject | undefined;
    if (resolvedPropSchema.type === 'object') {
        nestedPropsSchema = resolvedPropSchema;
    } else if (resolvedPropSchema.type === 'array' && resolvedPropSchema.items) {
        const resolvedItems = resolveRef(resolvedPropSchema.items, doc);
        if (resolvedItems.type === 'object') {
            nestedPropsSchema = resolvedItems;
        }
    }

    if (nestedPropsSchema?.properties) {
        propsMarkdown += formatProperties(nestedPropsSchema.properties, nestedPropsSchema.required, doc, indent + 1);
    }
  }
  return propsMarkdown;
};

/**
 * Format data as a concise markdown format for LLMs.
 */
export const formatAsMarkdown = (data: OpenAPIV3.Document): string => {
  let output = '';
  
  // Endpoints
  if (data.paths) {
    for (const [path, pathItem] of Object.entries(data.paths)) {
      if (!pathItem) continue;
      
      const validMethods = Object.keys(pathItem).filter(method => 
        ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method)
      ) as (keyof typeof pathItem)[];

      for (const method of validMethods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject;
        if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
        
        output += `${method.toUpperCase()} ${path}\n`;

        const description = (operation.summary || operation.description || '').replace(/\n/g, ' ');
        if (description) {
          output += `D: ${description}\n`;
        }

        // Parameters
        if (operation.parameters?.length) {
          output += `P:\n`;
          for (const paramRef of operation.parameters) {
            const param = resolveRef(paramRef, data);
            const schema = param.schema as OpenAPIV3.SchemaObject;
            const type = schema ? formatSchemaType(schema, data) : 'any';
            const required = param.required ? 'required' : 'optional';
            const paramDesc = param.description ? ` - ${param.description.replace(/\n/g, ' ')}` : '';
            output += `  - ${param.name}: ${type} (${param.in}, ${required})${paramDesc}\n`;
          }
        }
        
        // Request Body
        if (operation.requestBody) {
          const requestBody = resolveRef(operation.requestBody, data);
          if (requestBody.content) {
            const contentEntries = Object.entries(requestBody.content);
            const schemaName = formatSchemaType(contentEntries[0]?.[1].schema, data);
            if (contentEntries.length === 1) {
              output += `B: ${shortenContentType(contentEntries[0]![0])} -> ${schemaName}\n`;
            } else if (contentEntries.length > 1) {
              output += `B:\n`;
              for (const [contentType, mediaType] of contentEntries) {
                output += `  - ${shortenContentType(contentType)} -> ${formatSchemaType(mediaType.schema, data)}\n`;
              }
            }
          }
        }

        // Responses
        if (operation.responses) {
          output += `R:\n`;
          const groupedResponses: { [key: string]: string[] } = {};
          
          for (const [code, responseRef] of Object.entries(operation.responses)) {
            const response = resolveRef(responseRef, data);
            let responseIdParts: string[] = [];
            if (response.content) {
                for (const [contentType, mediaType] of Object.entries(response.content)) {
                    responseIdParts.push(`${shortenContentType(contentType)} -> ${formatSchemaType(mediaType.schema, data)}`);
                }
            }
            
            let responseId = responseIdParts.join(', ');
            if (!responseId) {
                responseId = response.description?.replace(/\n/g, ' ') || 'No description';
            }

            groupedResponses[responseId] = [...(groupedResponses[responseId] || []), code];
          }

          for (const [responseId, codes] of Object.entries(groupedResponses)) {
               output += `  ${codes.join(', ')}: ${responseId}\n`;
          }
        }
        output += '\n';
      }
    }
  }

  if (data.components?.schemas && Object.keys(data.components.schemas).length > 0) {
      output += '---\n\n';
  }

  // Schemas
  if (data.components?.schemas) {
    for (const [name, schemaRef] of Object.entries(data.components.schemas)) {
      const schema = resolveRef(schemaRef, data);
      
      output += `SCHEMA: ${name}\n`;
      if (schema.description) {
        output += `D: ${schema.description.replace(/\n/g, ' ')}\n`;
      }

      if (schema.type === 'object' && schema.properties) {
        output += 'PROPS:\n';
        output += formatProperties(schema.properties, schema.required, data, 1);
      } else if (schema.type === 'array' && schema.items) {
        output += `ARRAY OF: ${formatSchemaType(schema.items, data)}\n`;
        const resolvedItems = resolveRef(schema.items, data);
        if (resolvedItems.type === 'object' && resolvedItems.properties) {
             output += formatProperties(resolvedItems.properties, resolvedItems.required, data, 1);
        }
      } else if (schema.type) {
        output += `TYPE: ${schema.type}\n`;
      }
      output += '\n';
    }
  }
  
  return output.trim();
};