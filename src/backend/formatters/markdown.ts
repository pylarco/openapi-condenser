import { OpenAPIV3 } from 'openapi-types';
import { HTTP_METHODS } from '../../shared/constants';

const formatSchemaLink = (schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): string => {
    if ('$ref' in schema) {
        const name = schema.$ref.split('/').pop() || '';
        // Best-effort anchor link. Real markdown renderers might have specific slug logic.
        return `[${name}](#schemas-1)`; 
    }
    if (schema.type === 'array' && schema.items) {
        return `Array<${formatSchemaLink(schema.items)}>`;
    }
    return schema.type ? `\`${schema.type}\`` : '`any`';
};

/**
 * Format data as Markdown
 */
export const formatAsMarkdown = (data: OpenAPIV3.Document): string => {
    let md = '';

    if (data.info) {
        md += `# ${data.info.title}\n\n`;
        if (data.info.version) md += `**Version:** ${data.info.version}\n\n`;
        if (data.info.description) md += `${data.info.description}\n\n`;
    }

    if (data.paths && Object.keys(data.paths).length > 0) {
        md += `## Endpoints\n\n`;
        for (const [path, pathItem] of Object.entries(data.paths)) {
            if (!pathItem) continue;
            
            const validMethods = Object.keys(pathItem).filter(method => 
                HTTP_METHODS.includes(method as any)
            ) as (keyof typeof pathItem)[];

            for (const method of validMethods) {
                const operation = pathItem[method] as OpenAPIV3.OperationObject;
                md += `### \`${method.toUpperCase()}\` \`${path}\`\n\n`;
                if (operation.summary) md += `${operation.summary}\n\n`;
                
                if (operation.requestBody) {
                    const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
                    if (requestBody.content['application/json']?.schema) {
                        md += `**Request Body:** ${formatSchemaLink(requestBody.content['application/json'].schema)}\n\n`;
                    }
                }

                if (operation.responses) {
                    md += `**Responses:**\n\n`;
                    for (const [code, response] of Object.entries(operation.responses)) {
                        const res = response as OpenAPIV3.ResponseObject;
                        let responseLine = `- \`${code}\`: ${res.description}`;
                        if (res.content?.['application/json']?.schema) {
                            responseLine += ` -> ${formatSchemaLink(res.content['application/json'].schema)}`;
                        }
                        md += `${responseLine}\n`;
                    }
                    md += `\n`;
                }

                md += `---\n\n`;
            }
        }
    }

    if (data.components?.schemas && Object.keys(data.components.schemas).length > 0) {
        md += `## Schemas\n\n`;
        for (const [name, schema] of Object.entries(data.components.schemas)) {
            md += `### \`${name}\`\n\n`;
            if ((schema as OpenAPIV3.SchemaObject).description) {
                md += `${(schema as OpenAPIV3.SchemaObject).description}\n\n`;
            }
            md += '```json\n'
            md += JSON.stringify(schema, null, 2);
            md += '\n```\n\n'
        }
    }
    
    return md.trim();
};