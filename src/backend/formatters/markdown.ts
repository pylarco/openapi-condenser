import { OpenAPIV3 } from 'openapi-types';

/**
 * Format data as Markdown documentation
 */
export const formatAsMarkdown = (data: OpenAPIV3.Document): string => {
  let markdown = '';
  
  const resolveRef = <T extends object>(
    refObj: OpenAPIV3.ReferenceObject | T,
  ): T => {
    if (!refObj || typeof refObj !== 'object' || !('$ref' in refObj))
      return refObj as T;

    const refPath = refObj.$ref.replace('#/components/', '').split('/');
    let current: any = data.components;
    for (const part of refPath) {
      current = current?.[part];
    }
    return (current || refObj) as T;
  };
  
  // Add API information
  if (data.info) {
    markdown += `# ${data.info.title || 'API Documentation'}\n\n`;
    if (data.info.version) {
      markdown += `**Version:** ${data.info.version}\n\n`;
    }
    if (data.info.description) {
      markdown += `${data.info.description}\n\n`;
    }
  }
  
  // Add server information
  if (data.servers && data.servers.length > 0) {
    markdown += `## Servers\n\n`;
    data.servers.forEach((server: OpenAPIV3.ServerObject) => {
      markdown += `- ${server.url}${server.description ? ` - ${server.description}` : ''}\n`;
    });
    markdown += '\n';
  }
  
  // Add endpoints
  if (data.paths && Object.keys(data.paths).length > 0) {
    markdown += `## Endpoints\n\n`;
    
    Object.entries(data.paths)
      .filter(
        (entry): entry is [string, OpenAPIV3.PathItemObject] =>
          entry[1] !== undefined,
      )
      .forEach(([path, methods]) => {
        Object.entries(methods)
          .filter(
            (entry): entry is [string, OpenAPIV3.OperationObject] =>
              typeof entry[1] === 'object' &&
              entry[1] !== null &&
              'responses' in entry[1],
          )
          .forEach(([method, operation]) => {
            markdown += `### \`${method.toUpperCase()}\` ${path}\n\n`;
            
            if (operation.summary) {
              markdown += `> ${operation.summary}\n\n`;
            }
            
            if (operation.description) {
              markdown += `${operation.description}\n\n`;
            }
            
            // Parameters
            if (operation.parameters && operation.parameters.length > 0) {
              markdown += `**Parameters:**\n`;
              operation.parameters.forEach(
                (
                  paramRef:
                    | OpenAPIV3.ReferenceObject
                    | OpenAPIV3.ParameterObject,
                ) => {
                  const param = resolveRef<OpenAPIV3.ParameterObject>(paramRef);
                  const schema = param.schema as OpenAPIV3.SchemaObject;
                  const type = schema ? formatSchemaType(schema) : 'any';
                  const required = param.required ? ' (required)' : '';
                  markdown += `- \`${param.name}\` (${param.in})${required}: \`${type}\`${param.description ? ` - ${param.description}` : ''}\n`;
                },
              );
              markdown += '\n';
            }
            
            // Request body
            if (operation.requestBody) {
              const requestBody = resolveRef<OpenAPIV3.RequestBodyObject>(operation.requestBody);
              markdown += `**Request Body:**\n\n`;
              
              if (requestBody.description) {
                markdown += `${requestBody.description}\n\n`;
              }
              
              if (requestBody.content) {
                Object.entries(requestBody.content).forEach(([contentType, content]: [string, OpenAPIV3.MediaTypeObject]) => {
                  markdown += `*Content-Type: ${contentType}*\n`;
                  if (content.schema) {
                    markdown += formatSchema(content.schema, data, 1);
                  }
                  markdown += '\n';
                });
              }
            }
            
            // Responses
            if (operation.responses && Object.keys(operation.responses).length > 0) {
              markdown += `**Responses:**\n`;
              Object.entries(operation.responses).forEach(
                ([
                  code,
                  responseRef,
                ]: [
                  string,
                  OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject,
                ]) => {
                  const response =
                    resolveRef<OpenAPIV3.ResponseObject>(responseRef);
                  markdown += `- \`${code}\`: ${response.description || ''}\n`;
                  if (response.content) {
                    Object.entries(response.content).forEach(
                      ([
                        contentType,
                        content,
                      ]: [string, OpenAPIV3.MediaTypeObject]) => {
                        markdown += `  - *${contentType}*: \`${formatSchemaType(
                          content.schema,
                        )}\`\n`;
                      },
                    );
                  }
                },
              );
              markdown += '\n';
            }
            markdown += '---\n\n';
          });
      });
  }
  
  // Add schemas
  if (data.components?.schemas) {
    markdown += `## Schemas\n\n`;
    Object.entries(data.components.schemas).forEach(([name, schema]: [string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject]) => {
      markdown += `### ${name}\n\n`;
      const resolvedSchema = resolveRef<OpenAPIV3.SchemaObject>(schema);
      if (resolvedSchema.description) {
        markdown += `${resolvedSchema.description}\n\n`;
      }
      markdown += formatSchema(schema, data);
      markdown += '\n';
    });
  }
  
  return markdown;
};

const formatSchemaType = (
  schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
): string => {
  if (!schema) return '';
  if ('$ref' in schema) {
    return schema.$ref.split('/').pop() || '';
  }
  if (schema.type === 'array' && schema.items) {
    const itemType = formatSchemaType(schema.items);
    return itemType ? `array<${itemType}>` : 'array';
  }
  return schema.type || '';
};

const formatSchema = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  data: OpenAPIV3.Document,
  indent = 0,
): string => {
    if (!schema) return '';
    
    const indentStr = '  '.repeat(indent);
    let markdown = '';

    const resolveRef = <T extends object>(
      refObj: OpenAPIV3.ReferenceObject | T,
    ): T => {
        if (!refObj || typeof refObj !== 'object' || !('$ref' in refObj))
          return refObj as T;
        const refPath = refObj.$ref.replace('#/components/', '').split('/');
        let current: any = data.components;
        for (const part of refPath) {
            current = current?.[part];
        }
        return (current || refObj) as T;
    };
    
    const currentSchema = resolveRef<OpenAPIV3.SchemaObject>(schema);
    
    if ('$ref' in schema) {
        const refName = schema.$ref.split('/').pop();
        if (schema.$ref.includes('/schemas/')) {
            return `${indentStr}- Refers to Schema: \`${refName}\`\n`;
        }
    }

    if (currentSchema.type === 'object' && currentSchema.properties) {
        markdown += `${indentStr}**Properties:**\n`;
        Object.entries(currentSchema.properties).forEach(([propName, propSchema]: [string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject]) => {
            const required = currentSchema.required?.includes(propName) ? ' (required)' : '';
            const type = formatSchemaType(propSchema);
            markdown += `${indentStr}- \`${propName}\`${required}: \`${type}\``;
            
            const resolvedPropSchema = resolveRef<OpenAPIV3.SchemaObject>(propSchema);

            if (resolvedPropSchema.description) {
                markdown += ` - ${resolvedPropSchema.description}`;
            }
            markdown += '\n';

            const isNestedObject = (items: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject): boolean => {
              const resolvedItems = resolveRef<OpenAPIV3.SchemaObject>(items);
              return resolvedItems.type === 'object';
            };

            if (
                resolvedPropSchema.type === 'object' ||
                (resolvedPropSchema.type === 'array' &&
                  resolvedPropSchema.items &&
                  isNestedObject(resolvedPropSchema.items))
            ) {
                markdown += formatSchema(
                    resolvedPropSchema.type === 'array'
                      ? resolvedPropSchema.items
                      : resolvedPropSchema,
                    data,
                    indent + 1
                );
            }
        });
    } else if (currentSchema.type === 'array' && currentSchema.items) {
        markdown += `${indentStr}**Array of:** \`${formatSchemaType(
          currentSchema.items,
        )}\`\n`;
        const resolvedItems = resolveRef<OpenAPIV3.SchemaObject>(currentSchema.items);
        if (resolvedItems.type === 'object') {
            markdown += formatSchema(currentSchema.items, data, indent + 1);
        }
    } else if (currentSchema.type) {
        markdown += `${indentStr}**Type:** \`${currentSchema.type}\`\n`;
    }
    return markdown;
};