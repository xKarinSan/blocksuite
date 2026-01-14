# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlockSuite is a toolkit for building editors and collaborative applications. It provides:

- A headless framework for collaborative document editing built on Yjs (CRDT)
- Reusable web components for building various editor types
- Two main preset editors: PageEditor (block-based documents) and EdgelessEditor (graphics with canvas rendering)

The project originated from AFFiNE and is designed to support multimodal content editing, complex knowledge management, and collaboration-ready state management.

## Development Commands

### Setup and Development

```bash
yarn install              # Install dependencies (use yarn 4.7.0 as specified in package.json)
yarn dev                  # Start playground dev server at localhost:5173
yarn dev:docs             # Start documentation dev server
yarn build                # Build all packages (TypeScript compilation)
yarn build:packages       # Build only the packages (@blocksuite/affine)
yarn build:playground     # Build playground
```

### Playground Entries

When running `yarn dev`, multiple development entries are available:

- `localhost:5173/starter/?init` - Recommended for local debugging (clean slate)
- `localhost:5173/starter/` - Lists all starter presets
- `localhost:5173` - Full example with IndexedDB persistence and real-time collaboration

### Testing

```bash
yarn test                           # Run all tests in headless mode
yarn test -- --debug                # Run tests in headed mode for debugging
BROWSER=firefox yarn test           # Test with specific browser (firefox|webkit|chromium)
npx playwright install              # Install browser binaries (run once)

# Unit tests (per package)
cd packages/framework/store
yarn test:unit                      # Run vitest unit tests

# Integration tests
cd packages/integration-test
yarn test:unit                      # Run integration tests
yarn test:debug                     # Debug mode with PWDEBUG=1
```

**Testing Collaboration**: To test real-time collaboration locally:

1. Open `localhost:5173/starter/?init&room=hello` in first tab
2. Open `localhost:5173/starter/?room=hello` in second tab
   Changes in one tab will sync to the other via Yjs document streaming.

### Linting and Formatting

```bash
yarn lint:format          # Check formatting with Prettier
yarn format               # Auto-fix formatting with Prettier
```

### Testing Individual Components

- Unit tests are located in `__tests__` directories within packages (e.g., `packages/framework/store/src/__tests__/*.unit.spec.ts`)
- Tests use Vitest for unit tests with pattern `*.unit.spec.ts`
- To run a single test file: `npx vitest path/to/test.unit.spec.ts`

## Architecture

### Package Structure

The monorepo is organized into two main groups: **framework** packages (headless) and **component** packages (UI).

#### Framework Packages (`packages/framework/`)

Core headless libraries that power the editor:

- **`@blocksuite/store`**: Data layer for collaborative document state management. Built on Yjs CRDT, provides real-time collaboration and time-travel capabilities. Entry point for document models, schemas, and reactivity.

- **`@blocksuite/std`**: Framework-agnostic block modeling library. Handles block structure, events, selection, clipboard, commands, and more. Exports: `@blocksuite/std`, `@blocksuite/std/gfx`, `@blocksuite/std/inline`, `@blocksuite/std/effects`.

- **`@blocksuite/global`**: Global utilities, dependency injection, environment detection, and disposable patterns used across all packages.

- **`@blocksuite/sync`**: Synchronization utilities for document streaming and collaboration.

#### Component Packages (`packages/affine/`)

Pre-built UI components and editors:

- **`@blocksuite/affine`**: Main entry point aggregating all affine packages. This is the primary package users import for building with BlockSuite editors.

- **Blocks** (`packages/affine/blocks/`): Individual block implementations (paragraph, list, code, image, database, etc.). Each block has separate `store` (data model) and `view` (rendering) modules.

- **Widgets** (`packages/affine/widgets/`): Interactive UI components attached to blocks (drag-handle, toolbar, slash-menu, etc.).

- **Fragments** (`packages/affine/fragments/`): Auxiliary UI components like doc-title, outline panel, frame panel, adapter panel.

- **GFX** (`packages/affine/gfx/`): Graphics elements for EdgelessEditor (shapes, brush, connectors, mindmap, etc.).

- **Inlines** (`packages/affine/inlines/`): Inline editing components (links, references, mentions, footnotes, LaTeX).

- **`@blocksuite/affine-components`**: Reusable UI components (color-picker, context-menu, toast, etc.).

- **`@blocksuite/affine-shared`**: Shared utilities, commands, services, theme, and types used across affine packages. Includes service integrations like OpenAI for AI-powered features.

- **`@blocksuite/affine-model`**: Block model definitions and schemas.

- **`@blocksuite/data-view`**: Data view components for database/table views.

### Key Architectural Concepts

**Block-Based Architecture**: Documents are composed of blocks (paragraph, list, image, etc.). Each block type has:

- A model/schema (in `store.ts`) defining its data structure
- A view component (in `view.ts`) for rendering
- Optional widgets for interaction

**CRDT-Native Data Flow**: All document state is managed through Yjs CRDT, enabling:

- Built-in real-time collaboration without plugins
- Time-travel/undo-redo capabilities
- Reliable state synchronization across multiple editors

**Command System**: Complex editing operations are implemented as commands (similar to React hooks but for document editing). Commands provide type-safe, composable editing logic.

**Web Components**: All BlockSuite components are native web components (using Lit), making them framework-agnostic and easy to integrate with React, Vue, or vanilla JS.

**Separation of Store and View**: Each block/widget/inline component typically has:

- `store.ts` or `store/` - Data models and business logic
- `view.ts` or `view/` - Rendering and UI components
  This separation enables headless usage and easier testing.

### TypeScript Build System

- Uses TypeScript project references (`tsconfig.json` references field)
- Each package has its own `tsconfig.json` and builds independently
- `yarn build` compiles all packages in dependency order
- Individual packages export source TypeScript files (`.ts`) not compiled JS - consuming projects handle compilation

### Workspace Configuration

- **Package Manager**: Yarn 4.7.0 (Berry) with `node-modules` linker
- **Node Version**: Requires >=18.19.0 <23.0.0
- **Monorepo**: Uses Yarn workspaces (`packages/**/*`)
- All inter-package dependencies use `workspace:*` protocol

## Code Organization Patterns

When working with blocks/widgets/fragments:

1. Check if similar functionality exists in other blocks
2. Store code goes in `store.ts` or `store/` directory
3. View code goes in `view.ts` or `view/` directory
4. Shared utilities belong in `@blocksuite/affine-shared`
5. Framework-level utilities go in `@blocksuite/std` or `@blocksuite/global`

When adding new blocks:

1. Create both store and view modules
2. Register the block schema in the appropriate schema collection
3. Add to `@blocksuite/affine/all` package exports
4. Follow existing block patterns for consistency

## AI Service Integration

BlockSuite includes an OpenAI service integration for AI-powered features like video summarization. The service is implemented as an extension using the dependency injection system.

### Architecture

**Service Location**: `packages/affine/shared/src/services/ai-service/`

- **`openai-service.ts`**: Core service implementation with OpenAI API integration
- **`index.ts`**: Public exports for the service

### Key Components

**OpenAIService Interface**: Provides methods for AI operations:

- `configure(config)`: Set API key, model, and endpoint
- `getConfig()`: Retrieve current configuration
- `isConfigured()`: Check if service is ready to use
- `summarizeVideo(url, metadata)`: Generate video summaries using GPT models

**OpenAIProvider**: Dependency injection identifier for accessing the service in blocks/widgets.

**OpenAIExtension()**: Extension factory function that registers the service with the DI container.

### Configuration

Default settings:

- **Model**: `gpt-4-turbo` (configurable)
- **Endpoint**: `https://api.openai.com/v1/chat/completions` (configurable)
- **Temperature**: 0.7
- **Max Tokens**: 500

### Usage Example

```typescript
// In a block or widget with access to std
const openAI = ctx.std.getOptional(OpenAIProvider);

if (!openAI?.isConfigured()) {
  // Prompt user for API key
  openAI?.configure({ apiKey: 'sk-...' });
}

// Use the service
const summary = await openAI.summarizeVideo(videoUrl, {
  title: 'Video Title',
  description: 'Video description',
});
```

### Integration Points

**Video Summarization**: Implemented in `packages/affine/blocks/embed/src/utils/video-summarize.ts`

- Prompts for API key if not configured
- Shows loading notifications during processing
- Inserts generated summary as a paragraph block below the video
- Handles errors with user-friendly notifications

**Extension Registration**: Add to editor specs in `extensions.ts`:

```typescript
import { OpenAIExtension } from '@blocksuite/affine/shared/services';

const extensions = [
  OpenAIExtension(),
  // ... other extensions
];
```

### Adding New AI Features

When adding new AI-powered features:

1. Use `ctx.std.getOptional(OpenAIProvider)` to access the service
2. Check `isConfigured()` before making API calls
3. Provide clear user feedback (loading states, errors, success messages)
4. Use the NotificationProvider for user notifications
5. Handle API errors gracefully with try-catch blocks
6. Consider rate limiting and cost implications

### Security Considerations

- API keys are stored in memory only (not persisted)
- Users must provide their own OpenAI API keys
- No BlockSuite-provided keys or proxies
- All API calls go directly to OpenAI's endpoints from the client

## Common Gotchas

- **Multiple Store Imports**: Importing `@blocksuite/store` multiple times breaks constructor checks and causes issues. The codebase has a check for this.
- **Web Components HMR**: Use `WC_HMR=1 yarn dev` to enable web components hot module replacement during development.
- **Test Isolation**: Unit tests have strict console.log checks that throw errors on unexpected logs. Tests timeout at 500ms by default.
- **Source Exports**: Packages export TypeScript source files, not compiled JS. Consuming applications need proper TypeScript/bundler configuration.
