# rolldown-mdx

[![npm][npm-badge]][npm]
[![CI][build-badge]][build]
[![license][license-badge]][license]

The **framework-agnostic**, **runtime-agnostic** MDX bundler powered by [rolldown](https://github.com/rolldown/rolldown).

[npm-badge]: https://img.shields.io/npm/v/rolldown-mdx?logo=npm&color=a855f7
[npm]: https://www.npmjs.com/package/rolldown-mdx
[build-badge]: https://img.shields.io/github/actions/workflow/status/thejackshelton/rolldown-mdx/unit-test.yml?branch=main&logo=github&label=CI
[build]: https://github.com/thejackshelton/rolldown-mdx/actions
[license-badge]: https://img.shields.io/github/license/thejackshelton/rolldown-mdx?color=blue
[license]: https://github.com/thejackshelton/rolldown-mdx/blob/main/LICENSE

> Bundle MDX anywhere: Node.js, Deno, Bun, Cloudflare Workers, Vercel Edge, or the browser. Works with Qwik, React, Solid, Vue, Hono, Brisa, or any JSX-based framework.

## Why rolldown-mdx?

- **Lightning Fast** - Performance comparable to esbuild through rolldown's Rust core
- **Zero Lock-in** - Built on [unstorage](https://github.com/unjs/unstorage) and UnJS primitives for true portability
- **Easy Migration** - API compatible with [mdx-bundler](https://github.com/kentcdodds/mdx-bundler) — swap `esbuildOptions` for `rolldown` and you're done
- **Extensible Pipeline** - Leverage rolldown's plugin API for complete control over transformations
- **Framework Optimizations** - Hook directly into your framework's compiler during bundling (Qwik, Solid, etc.)
- **Full MDX Ecosystem** - Compatible with all your favorite remark and rehype plugins

## Installation

```bash
npm install rolldown-mdx
```

## Quick Start

```js
import { bundleMDX, createMDXComponent } from 'rolldown-mdx';
import * as React from 'react';

// Bundle MDX content
const result = await bundleMDX({
  source: `
    # Hello, World!
    
    This is **MDX** content.
    
    <MyComponent prop="value" />
  `,
  framework: 'react'
});

// Create a component in one line
const Component = createMDXComponent(result, React);

// Render it
<Component />
```

## Features

### Simplified Framework Integration

Just specify your framework and let rolldown-mdx handle all the configuration:

```js
import { bundleMDX } from 'rolldown-mdx';

// Qwik
const result = await bundleMDX({
  source: mdxSource,
  framework: 'qwik'
});

// React
const result = await bundleMDX({
  source: mdxSource,
  framework: 'react'
});

// Also works with: preact, solid, vue, hono, brisa
```

You can also use a custom JSX configuration if needed:

```js
const result = await bundleMDX({
  source: mdxSource,
  jsxConfig: {
    jsxLib: { package: 'custom-jsx-lib', varName: 'CustomJSX' },
    jsxRuntime: { package: 'custom-jsx-lib/jsx-runtime', varName: 'jsx_runtime' }
  }
});

const Component = createMDXComponent(result, CustomJSX);
```

### Easy Component Creation

Create MDX components for your framework with minimal code:

```js
import { createMDXComponent } from 'rolldown-mdx';
import * as React from 'react';

const Component = createMDXComponent(result, React);

// rolldown-mdx will attempt to auto-detect the framework from the import
```

### Typed for Your Framework

rolldown-mdx exports are deliberately generic, allowing you to provide your own framework-specific types and get precise TypeScript inference:

```ts
import { createMDXComponent } from 'rolldown-mdx';
import * as Qwik from '@builder.io/qwik';

// Qwik example
const Component = createMDXComponent<Qwik.PropsOf<"div">, Qwik.JSXOutput>(
  result,
  Qwik
);

// React example
const ReactComponent = createMDXComponent<React.ComponentProps<'div'>, React.ReactNode>(
  result, 
  React
);
```

This flexible typing system means you get proper type checking and autocomplete that matches your specific framework.

### Powerful Plugin Ecosystem

Easily extend your MDX processing pipeline with remark and rehype plugins:

```js
const result = await bundleMDX({
  source: mdxSource,
  framework: 'react',
  mdx: (options) => {

    options.remarkPlugins = [
      ...(options.remarkPlugins ?? []),
      remarkGfm,
      [remarkCodeHike, { theme: 'github-dark' }]
    ]

    options.rehypePlugins = [
      ...(options.rehypePlugins ?? []),
      rehypePrism
    ]

    return options
  }
});
```

### Extensible Plugin System

Add framework compilers, custom transformations, or any Rollup-compatible plugin:

```js
import { myCustomPlugin } from 'my-plugin';

const result = await bundleMDX({
  source: mdxSource,
  framework: 'react',
  rolldown: {
    plugins: [myCustomPlugin()], // compilers, transforms, or any Rollup plugin
  }
});
```

### File Option

Read MDX directly from disk with automatic import resolution:

```js
// Relative imports in the MDX file resolve from its directory
const result = await bundleMDX({
  file: 'content/posts/hello-world.mdx',
  framework: 'react'
});
```

This is equivalent to manually reading the file and setting `cwd`:

```js
// The verbose way (file option does this for you)
const result = await bundleMDX({
  source: fs.readFileSync('content/posts/hello-world.mdx', 'utf-8'),
  cwd: path.resolve('content/posts'),
  framework: 'react'
});
```

### Multi-Runtime Support

No native dependencies — bundle on Node.js, Deno, or Bun:

| Runtime | `bundleMDX()` | `createMDXComponent()` |
|---------|---------------|------------------------|
| **Node.js** | ✅ | ✅ |
| **Deno** | ✅ | ✅ |
| **Bun** | ✅ | ✅ |
| **Cloudflare Workers** | — | ✅ |
| **Vercel Edge** | — | ✅ |
| **Browser** | — | ✅ |

Bundle wherever you want, render the result anywhere.

## License

MIT
