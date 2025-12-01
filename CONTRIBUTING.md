# Contributing to rolldown-mdx

Howdy! 👋 Thanks for your interest in contributing!

For bigger changes, consider opening an issue first so we can discuss the approach.

## Setup

```bash
git clone https://github.com/thejackshelton/rolldown-mdx.git
cd rolldown-mdx
pnpm install
pnpm build
```

## Development

```bash
pnpm dev      # watch mode for the mdx package
pnpm build    # production build
```

## Testing

### Unit Tests

Core bundler functionality is tested with Vitest:

```bash
pnpm test.unit
```

Covers the public API: input validation, frontmatter extraction, virtual file resolution, framework configuration, and MDX plugin customization.

### Browser Tests

MDX components are rendered in a real Chromium browser using [Vitest Browser Mode](https://vitest.dev/guide/browser/) with Playwright:

```bash
pnpm test.browser
```

The browser test setup is framework-agnostic. See `tests/react/` and `tests/qwik/` for examples of how to add tests for other frameworks.

### All Tests

```bash
pnpm test
```

Runs unit tests with coverage, then browser tests.

## Project Structure

```
rolldown-mdx/
├── mdx/                  # Main package (published to npm)
│   └── src/
│       ├── index.ts      # bundleMDX entry point
│       ├── jsx.ts        # createMDXComponent runtime
│       ├── framework-config.ts
│       ├── storage.ts    # Multi-runtime file reading
│       ├── plugins/      # Rolldown plugins
│       └── integrations/ # Framework-specific integrations
├── tests/                # Browser integration tests
│   ├── test.tsx          # Test suite
│   ├── react/            # React fixtures
│   └── qwik/             # Qwik fixtures
└── package.json          # Monorepo root
```

## Code Style

This project uses [Biome](https://biomejs.dev/) for formatting and linting:

```bash
pnpm lint     # fix lint issues
pnpm format   # format code
pnpm check    # CI check (no fixes)
```

## Pull Requests

1. Fork the repo and create your branch from `main`
2. Add tests for any new functionality
3. Ensure `pnpm test` passes
4. Run `pnpm check` before committing

Cheers! 🤠
