# OpenAPI Condenser

An interactive web-based tool and powerful CLI to process, filter, and condense large OpenAPI specification files into various formats.

## Features

- **Interactive Web UI**: Easily load, configure, and condense OpenAPI specs directly in your browser.
- **CLI Tool**: Automate your workflow with a powerful command-line interface.
- **Flexible Filtering**: Extract specific endpoint metadata by paths, tags, methods, operation IDs, and more.
- **Rich Configuration**: Configure extractions via TypeScript for full control.
- **Multiple Output Formats**: Export to JSON, YAML, XML, and Markdown.
- **Local & Remote Sources**: Works with both local files and public URLs.
- **Deployable on Cloudflare**: Ready to be deployed as a serverless application on Cloudflare Workers.

## Project Structure

- `src/frontend`: Contains the React/Vite frontend application.
- `src/backend`: Contains the ElysiaJS backend server, API logic, and the core condenser engine.
- `src/shared`: Shared types and constants between frontend and backend.
- `dist`: Build output directory for the frontend.
- `wrangler.toml`: Configuration file for Cloudflare Workers deployment.
- `openapi-condenser.config.ts`: Configuration for the CLI tool.

## Getting Started

First, clone the repository and install the dependencies. This project uses [Bun](https://bun.sh/) as the runtime and package manager.

```bash
# Clone the repository
git clone https://github.com/yourusername/openapi-condenser.git
cd openapi-condenser

# Install dependencies
bun install
```

## Usage: Web Application

This project includes a full-stack application with a React frontend and an ElysiaJS backend.

### Local Development

For a full local development experience with live reloading for both the frontend and backend, run:

```bash
# Starts Vite dev server and Elysia server concurrently
bun run dev
```

- The frontend will be available at `http://localhost:5173`.
- The backend API will be running at `http://localhost:8080`.

### Local Production Preview (Cloudflare Simulation)

To test the application in a production-like environment that mirrors the deployed Cloudflare setup, use the `pages:dev` script. This command uses `wrangler` to build the application and serve it locally.

```bash
# Builds the app and starts a local server with wrangler
bun run pages:dev
```

This is the best way to verify that your changes will work once deployed.

## Deployment to Cloudflare

The project is pre-configured for easy deployment to Cloudflare Workers.

1.  **Login to Wrangler**:
    If you haven't already, you'll need to log in to your Cloudflare account.
    ```bash
    bunx wrangler login
    ```

2.  **Deploy**:
    Run the `deploy` script. This will build the frontend, and then deploy both the frontend and the worker backend to Cloudflare.
    ```bash
    bun run deploy
    ```
    
Wrangler will provide you with the URL of your deployed application.

## Usage: CLI Tool

The repository also contains a powerful command-line tool for scriptable conversions.

### Basic CLI Usage

```bash
# Basic usage with a config file
bun run cli

# Specify a different config file
bun run cli --config ./my-config.ts

# Override config with command line arguments
bun run cli --source ./my-openapi.json --format markdown
```

### CLI Configuration File

Create an `openapi-condenser.config.ts` file to define your extraction settings:

```typescript
import type { ExtractorConfig } from './src/shared/types';

const config: ExtractorConfig = {
  source: {
    type: 'file',
    path: './specs/petstore.json',
  },
  output: {
    format: 'markdown',
  },
  filter: {
    paths: {
      include: ['/pet/{petId}'],
    },
    methods: ['get', 'post'],
    includeDeprecated: false,
  },
  transform: {
    removeExamples: true,
    removeDescriptions: true,
  },
};

export default config;
```

## Available Scripts

- `dev`: Starts the local development servers for frontend and backend.
- `start`: Starts only the backend server.
- `build`: Builds the frontend application for production.
- `deploy`: Deploys the application to Cloudflare Workers.
- `pages:dev`: Runs a local server that simulates the Cloudflare environment.
- `cli`: Runs the command-line interface tool.
- `test`: Runs the test suite.

## License

MIT
