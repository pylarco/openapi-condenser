/**
 * Format data as Markdown documentation
 */
export const formatAsMarkdown = (data: any): string => {
  let markdown = '';
  
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
      markdown += `### ${path}\n\n`;
      
      Object.entries(methods).forEach(([method, operation]: [string, any]) => {
        markdown += `#### ${method.toUpperCase()}\n\n`;
        
        if (operation.summary) {
          markdown += `**Summary:** ${operation.summary}\n\n`;
        }
        
        if (operation.description) {
          markdown += `${operation.description}\n\n`;
        }
        
        // Parameters
        if (operation.parameters && operation.parameters.length > 0) {
          markdown += `##### Parameters\n\n`;
          markdown += `| Name | In | Required | Type | Description |\n`;
          markdown += `| ---- | -- | -------- | ---- | ----------- |\n`;
          
          operation.parameters.forEach((param: any) => {
            const type = param.schema ? formatSchemaType(param.schema) : '';
            markdown += `| ${param.name} | ${param.in} | ${param.required ? 'Yes' : 'No'} | ${type} | ${param.description || ''} |\n`;
          });
          
          markdown += '\n';
        }
        
        // Request body
        if (operation.requestBody) {
          markdown += `##### Request Body\n\n`;
          
          if (operation.requestBody.description) {
            markdown += `${operation.requestBody.description}\n\n`;
          }
          
          if (operation.requestBody.content) {
            Object.entries(operation.requestBody.content).forEach(([contentType, content]: [string, any]) => {
              markdown += `**Content Type:** ${contentType}\n\n`;
              
              if (content.schema) {
                markdown += formatSchema(content.schema);
                markdown += '\n';
              }
            });
          }
        }
        
        // Responses
        if (operation.responses && Object.keys(operation.responses).length > 0) {
          markdown += `##### Responses\n\n`;
          
          Object.entries(operation.responses).forEach(([code, response]: [string, any]) => {
            markdown += `###### ${code} - ${response.description || ''}\n\n`;
            
            if (response.content) {
              Object.entries(response.content).forEach(([contentType, content]: [string, any]) => {
                markdown += `**Content Type:** ${contentType}\n\n`;
                
                if (content.schema) {
                  markdown += formatSchema(content.schema);
                  markdown += '\n';
                }
              });
            }
          });
        }
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
      
      markdown += formatSchema(schema);
      markdown += '\n';
    });
  }
  
  return markdown;
};

/**
 * Format schema type for display
 */
const formatSchemaType = (schema: any): string => {
  if (!schema) return '';
  
  if (schema.$ref) {
    return schema.$ref.split('/').pop() || '';
  }
  
  if (schema.type === 'array' && schema.items) {
    return `array[${formatSchemaType(schema.items)}]`;
  }
  
  return schema.type || '';
};

/**
 * Format schema as Markdown
 */
const formatSchema = (schema: any, indent = 0): string => {
  if (!schema) return '';
  
  const indentStr = '  '.repeat(indent);
  let markdown = '';
  
  if (schema.$ref) {
    return `${indentStr}- Reference: ${schema.$ref.split('/').pop()}\n`;
  }
  
  if (schema.type === 'object' && schema.properties) {
    markdown += `${indentStr}**Properties:**\n\n`;
    
    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
      const required = schema.required?.includes(propName) ? '(required)' : '';
      const type = formatSchemaType(propSchema);
      
      markdown += `${indentStr}- **${propName}** ${required}: ${type}`;
      
      if (propSchema.description) {
        markdown += ` - ${propSchema.description}`;
      }
      
      markdown += '\n';
      
      if (propSchema.type === 'object' && propSchema.properties) {
        markdown += formatSchema(propSchema, indent + 1);
      } else if (propSchema.type === 'array' && propSchema.items?.properties) {
        markdown += formatSchema(propSchema.items, indent + 1);
      }
    });
  } else if (schema.type === 'array' && schema.items) {
    markdown += `${indentStr}**Array items:** ${formatSchemaType(schema.items)}\n`;
    
    if (schema.items.type === 'object' && schema.items.properties) {
      markdown += formatSchema(schema.items, indent + 1);
    }
  } else {
    const type = formatSchemaType(schema);
    markdown += `${indentStr}**Type:** ${type}\n`;
  }
  
  return markdown;
}; 