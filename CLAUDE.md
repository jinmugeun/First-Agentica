# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agentica is a NestJS WebSocket server template that provides AI agent capabilities with automatic TypeScript SDK generation. It's built on Nestia framework for type-safe API development with OpenAI integration and real-time WebSocket communication.

## Core Architecture

### Nestia Framework Integration
- **Automatic SDK Generation**: Uses `@nestia/sdk` to generate TypeScript client SDKs from NestJS controllers
- **Type-Safe APIs**: Runtime type validation with `typia` transforms
- **Auto-Generated Swagger**: Documentation generated from controller annotations
- **WebSocket Support**: Type-safe WebSocket endpoints with `tgrid` library

### AI Agent System
- **Agentica Core**: AI agent orchestration using `@agentica/core` and `@agentica/rpc`
- **OpenAI Integration**: GPT-4o-mini model integration for chat functionality
- **Tool Controllers**: External service integrations (GitHub connector example)
- **Real-time Communication**: WebSocket-based AI interactions

## Development Commands

### Setup and Building
```bash
npm install                    # Install dependencies
npm run prepare               # Setup ts-patch and environment
npm run build                 # Build all components (SDK + main + test)
npm run build:sdk             # Generate TypeScript SDK from controllers
npm run build:swagger         # Generate Swagger documentation
```

### Development Workflow
```bash
npm run start:dev             # Start development server with watch mode
npm run dev                   # Build tests in watch mode
npm run test                  # Run test suite
npm run benchmark             # Run performance benchmarks
```

### Code Quality
```bash
npm run eslint               # Lint source and test files
npm run eslint:fix           # Auto-fix lint issues
npm run prettier             # Format code
```

### Production Deployment
```bash
npm run start                # Start production server
npm run webpack              # Bundle for production
npm run webpack:start        # Start webpack bundled server
```

## Key Configuration

### Nestia Configuration (`nestia.config.ts`)
- **Input Module**: `MyModule` as the main NestJS module
- **Output Directory**: `src/api` for generated SDK files
- **Swagger Output**: `packages/api/swagger.json`
- **Local Server**: Default port 37001

### TypeScript Configuration
- **Transform Plugins**: 
  - `typescript-transform-paths` for path mapping
  - `typia/lib/transform` for runtime type validation
  - `@nestia/core/lib/transform` for NestJS decorators
  - `@nestia/sdk/lib/transform` for SDK generation
- **Strict Mode**: Enabled with additional safety checks
- **Decorators**: Experimental decorators enabled for NestJS

## Controller Patterns

### WebSocket Controllers (`ChatController`)
- Use `@WebSocketRoute()` decorator for WebSocket endpoints
- Accept `WebSocketAcceptor` with type parameters for RPC services
- Initialize Agentica agents with model configuration and tool controllers
- Integrate external services via controller configuration

### REST Controllers (`BbsArticlesController`)
- Use `@core.TypedRoute.*()` decorators for type-safe endpoints
- Parameters validated with `@core.TypedParam()` and `@core.TypedBody()`
- Return types automatically generate TypeScript interfaces
- Provider pattern for business logic separation

## Testing

### Test Structure
- **Test Directory**: `test/` with TypeScript configuration
- **Feature Tests**: API endpoint testing in `test/features/api/`
- **Benchmark Tests**: Performance testing in `test/benchmark/`
- **Test Automation**: Automated test suite execution

### Running Tests
```bash
npm run test                  # Run all tests
npm run test:webpack          # Test webpack bundle
npm run benchmark            # Performance benchmarks
```

## Environment Setup

Required environment variables:
```bash
OPENAI_API_KEY=your_openai_key    # Required for AI functionality
```

## Key Dependencies

- **@nestia/core**: Type-safe NestJS framework
- **@agentica/core**: AI agent orchestration
- **typia**: Runtime type validation
- **tgrid**: WebSocket communication
- **openai**: OpenAI API client
- **@wrtnlabs/connector-github**: External service integration example