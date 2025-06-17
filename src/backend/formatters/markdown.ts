/**
 * Format data as Markdown documentation
 */
export const formatAsMarkdown = (data: any): string => {
  let markdown = '';
  
  const resolveRef = (refObj: any) => {
    if (!refObj?.$ref) return refObj;

    const refPath = refObj.$ref.replace('#/components/', '').split('/');
    let current = data.components;
    for (const part of refPath) {
      current = current?.[part];
    }
    return current || refObj; // Return original ref if not found
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
    data.servers.forEach((server: any) => {
      markdown += `- ${server.url}${server.description ? ` - ${server.description}` : ''}\n`;
    });
    markdown += '\n';
  }
  
  // Add endpoints
  if (data.paths && Object.keys(data.paths).length > 0) {
    markdown += `## Endpoints\n\n`;
    
    Object.entries(data.paths).forEach(([path, methods]: [string, any]) => {
      Object.entries(methods).forEach(([method, operation]: [string, any]) => {
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
          operation.parameters.forEach((paramRef: any) => {
            const param = resolveRef(paramRef);
            const type = param.schema ? formatSchemaType(param.schema) : 'any';
            const required = param.required ? ' (required)' : '';
            markdown += `- \`${param.name}\` (${param.in})${required}: \`${type}\`${param.description ? ` - ${param.description}` : ''}\n`;
          });
          markdown += '\n';
        }
        
        // Request body
        if (operation.requestBody) {
          const requestBody = resolveRef(operation.requestBody);
          markdown += `**Request Body:**\n\n`;
          
          if (requestBody.description) {
            markdown += `${requestBody.description}\n\n`;
          }
          
          if (requestBody.content) {
            Object.entries(requestBody.content).forEach(([contentType, content]: [string, any]) => {
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
          Object.entries(operation.responses).forEach(([code, responseRef]: [string, any]) => {
            const response = resolveRef(responseRef);
            markdown += `- \`${code}\`: ${response.description || ''}\n`;
            if (response.content) {
              Object.entries(response.content).forEach(([contentType, content]: [string, any]) => {
                 markdown += `  - *${contentType}*: \`${formatSchemaType(content.schema)}\`\n`;
              });
            }
          });
          markdown += '\n';
        }
        markdown += '---\n\n';
      });
    });
  }
  
  // Add schemas
  if (data.components?.schemas) {
    markdown += `## Schemas\n\n`;
    Object.entries(data.components.schemas).forEach(([name, schema]: [string, any]) => {
      markdown += `### ${name}\n\n`;
      if (schema.description) {
        markdown += `${schema.description}\n\n`;
      }
      markdown += formatSchema(schema, data);
      markdown += '\n';
    });
  }
  
  return markdown;
};

const formatSchemaType = (schema: any): string => {
  if (!schema) return '';
  if (schema.$ref) {
    return schema.$ref.split('/').pop() || '';
  }
  if (schema.type === 'array' && schema.items) {
    const itemType = formatSchemaType(schema.items);
    return itemType ? `array<${itemType}>` : 'array';
  }
  return schema.type || '';
};

const formatSchema = (schema: any, data: any, indent = 0): string => {
    if (!schema) return '';
    
    const indentStr = '  '.repeat(indent);
    let markdown = '';

    const resolveRef = (refObj: any) => {
        if (!refObj?.$ref) return refObj;
        const refPath = refObj.$ref.replace('#/components/', '').split('/');
        let current = data.components;
        for (const part of refPath) {
            current = current?.[part];
        }
        return current || refObj;
    };
    
    const currentSchema = schema?.$ref ? resolveRef(schema) : schema;
    
    if (schema.$ref) {
        const refName = schema.$ref.split('/').pop();
        if (schema.$ref.includes('/schemas/')) {
            return `${indentStr}- Refers to Schema: \`${refName}\`\n`;
        }
    }

    if (currentSchema.type === 'object' && currentSchema.properties) {
        markdown += `${indentStr}**Properties:**\n`;
        Object.entries(currentSchema.properties).forEach(([propName, propSchema]: [string, any]) => {
            const required = currentSchema.required?.includes(propName) ? ' (required)' : '';
            const type = formatSchemaType(propSchema);
            markdown += `${indentStr}- \`${propName}\`${required}: \`${type}\``;
            if (propSchema.description) markdown += ` - ${propSchema.description}`;
            markdown += '\n';

            const resolvedProp = resolveRef(propSchema);
            if (resolvedProp.type === 'object' || (resolvedProp.type === 'array' && resolveRef(resolvedProp.items).type === 'object')) {
                markdown += formatSchema(resolvedProp.type === 'array' ? resolvedProp.items : resolvedProp, data, indent + 1);
            }
        });
    } else if (currentSchema.type === 'array' && currentSchema.items) {
        markdown += `${indentStr}**Array of:** \`${formatSchemaType(currentSchema.items)}\`\n`;
        if (resolveRef(currentSchema.items).type === 'object') {
            markdown += formatSchema(currentSchema.items, data, indent + 1);
        }
    } else if (currentSchema.type) {
        markdown += `${indentStr}**Type:** \`${currentSchema.type}\`\n`;
    }
    return markdown;
};