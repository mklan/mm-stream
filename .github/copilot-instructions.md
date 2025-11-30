# Copilot Instructions for mm-stream

## Project Overview

mm-stream is a REST API for exploring and streaming media files (primarily tested with FLAC, MP3, and OGG formats). It's a TypeScript application built with Express.js that provides endpoints for listing directory contents and streaming audio files.

## Technology Stack

- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18.x
- **Framework**: Express.js
- **Package Manager**: npm
- **Containerization**: Docker with multi-stage Alpine builds

## Project Structure

```
mm-stream/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── middlewares/          # Express middleware functions
│   │   └── validateRootPath.ts
│   ├── services/             # Business logic and utilities
│   │   ├── directory-service.ts
│   │   └── server-config.ts
│   └── types/                # TypeScript type declarations
│       └── mediaserver.d.ts
├── dist/                     # Compiled JavaScript output
├── demo/                     # Demo assets
├── tsconfig.json            # TypeScript configuration
├── Dockerfile               # Multi-stage Docker image
├── docker-compose.yml       # Docker Compose setup
└── package.json
```

## Development Guidelines

### Building and Running

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set required environment variables:

   - `MM_PORT` - Port number (default: 3000)
   - `MM_FOLDER` - Path to the media folder (default: ./media)
   - `MM_HOST` - External host address for generating links

3. Development mode (with hot reload):

   ```bash
   npm run dev
   ```

4. Production build and run:
   ```bash
   npm run build
   npm start
   ```

### Code Style

- Use ES modules with TypeScript (`import`/`export`)
- Use strict TypeScript (`strict: true` in tsconfig)
- Define explicit types for function parameters and return values
- Use interfaces for complex data structures (e.g., `ContentEntry`)
- Keep middleware functions in `src/middlewares/`
- Keep business logic and services in `src/services/`
- Place custom type declarations in `src/types/`
- Prefer async/await with Promise.all for parallel operations

### TypeScript Configuration

- Target: ES2022
- Module: CommonJS output (for Node.js compatibility)
- Source code uses ES module syntax (`import`/`export`), compiled to CommonJS
- Strict mode enabled
- Source maps and declarations generated
- Output directory: `./dist`

### API Endpoints

- `GET /list?path=<relative_path>` - List directory contents with metadata
- `GET /stream?path=<relative_path>` - Stream a media file

### Security Considerations

- Always validate that requested paths stay within the configured media root folder
- Use the `validateRootPath` middleware for path validation
- Be cautious with path traversal attacks
- Cast query parameters with explicit types (e.g., `req.query.path as string`)

### Docker Usage

The Dockerfile uses multi-stage builds for optimal image size:

- Build: `docker build -t mm-stream .`
- Run with Docker Compose: `docker compose up -d`
- The container uses Node.js 18 Alpine image for minimal footprint

### Testing and Validation Workflow

**ALWAYS follow this workflow after making any code changes:**

1. Run `npm test` to execute the test suite
2. Run `npm run build` to ensure TypeScript compiles without errors
3. If tests or build fail:
   - Analyze the error messages
   - Fix the issues
   - Re-run tests and build until they pass
4. Ensure the application starts without errors
5. Test the `/list` endpoint with various paths
6. Test the `/stream` endpoint with actual media files
7. Verify path validation prevents directory traversal

**When implementing new features:**

- Always write tests for new functionality
- Follow the existing test patterns in `*.test.ts` files
- Test both success and error cases
- Ensure tests are passing before considering the feature complete

### Dependencies

Runtime dependencies:

- `express` - Web framework
- `cors` - CORS middleware
- `mediaserver` - Media file streaming
- `music-metadata` - Audio file metadata parsing
- `node-cache` - In-memory caching for directory listings
- `dotenv` - Environment variable configuration
- `ip` - IP address utilities for host detection

Dev dependencies:

- `typescript` - TypeScript compiler
- `ts-node-dev` - Development server with hot reload
- `@types/*` - TypeScript type definitions for dependencies
