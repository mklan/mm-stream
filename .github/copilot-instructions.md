# Copilot Instructions for mm-stream

## Project Overview

mm-stream is a REST API for exploring and streaming media files (primarily tested with FLAC and MP3 formats). It's a Node.js application built with Express.js that provides endpoints for listing directory contents and streaming audio files.

## Technology Stack

- **Runtime**: Node.js 18.x
- **Framework**: Express.js
- **Package Manager**: npm or yarn
- **Containerization**: Docker with Alpine-based images

## Project Structure

```
mm-stream/
├── src/
│   ├── index.js              # Main application entry point
│   ├── middlewares/          # Express middleware functions
│   │   └── validateRootPath.js
│   └── services/             # Business logic and utilities
│       ├── directory-service.js
│       └── server-config.js
├── demo/                     # Demo assets
├── Dockerfile               # Docker image configuration
├── docker-compose.yml       # Docker Compose setup
└── package.json
```

## Development Guidelines

### Running the Application

1. Set required environment variables:
   - `MM_PORT` - Port number (default: 3000)
   - `MM_FOLDER` - Path to the media folder
   - `MM_HOST` - External host address for generating links

2. Start the application:
   ```bash
   yarn start    # or npm start
   yarn dev      # for development with nodemon
   ```

### Code Style

- Use CommonJS modules (`require`/`module.exports`)
- Use `const` for imports and variables that don't change
- Prefer async/await over callbacks for asynchronous operations
- Keep middleware functions in `src/middlewares/`
- Keep business logic and services in `src/services/`

### API Endpoints

- `GET /list?path=<relative_path>` - List directory contents
- `GET /stream?path=<relative_path>` - Stream a media file

### Security Considerations

- Always validate that requested paths stay within the configured media root folder
- Use the `validateRootPath` middleware for path validation
- Be cautious with path traversal attacks

### Docker Usage

- Build: `docker build -t mm-stream .`
- Run with Docker Compose: `docker compose up -d`
- The container uses Node.js 18 Alpine image for minimal footprint

### Testing Changes

When making changes:
1. Ensure the application starts without errors
2. Test the `/list` endpoint with various paths
3. Test the `/stream` endpoint with actual media files
4. Verify path validation prevents directory traversal

### Dependencies

Key dependencies and their purposes:
- `express` - Web framework
- `cors` - CORS middleware
- `mediaserver` - Media file streaming
- `music-metadata` - Audio file metadata parsing
- `node-cache` - In-memory caching for directory listings
- `dotenv` - Environment variable configuration
- `async` - Utility library for asynchronous operations
- `ip` - IP address utilities for host detection
- `pm2` - Process manager for production deployment
