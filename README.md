# rolldown-mdx

The **framework-agnostic**, **runtime-agnostic** MDX bundler powered by [rolldown](https://github.com/rolldown/rolldown).

> Bundle MDX anywhere: Node.js, Deno, Bun, Cloudflare Workers, Vercel Edge, or the browser.

## Why rolldown-mdx?

**rolldown-mdx** is the ultimate solution for bundling MDX content in modern JavaScript applications:

- **Runtime Agnostic** - Runs everywhere: Node.js, Deno, Bun, and edge runtimes. No Node.js-specific APIs holding you back.
- **Framework Agnostic** - Works with Qwik, Vue, React, Solid, Hono, Brisa, or any JSX-based framework.
- **Lightning Fast** - Achieves performance comparable to esbuild and mdx-bundler through rolldown's Rust core
- **Zero Node.js Lock-in** - Built on [unstorage](https://github.com/unjs/unstorage) and other UnJS primitives for true portability
- **Extensible Pipeline** - Leverage rolldown's powerful plugin API for complete control over the transformation process
- **Framework Optimizations** - Hook directly into your framework's compiler during bundling (Qwik, Solid, etc.)
- **Full MDX Ecosystem** - Compatible with all your favorite MDX plugins and transformations

## Inspiration

This project stands on the shoulders of giants:

- **[mdx-bundler](https://github.com/kentcdodds/mdx-bundler)** - Kent C. Dodds' excellent MDX bundler provided the intuitive API design we loved. However, esbuild's limited plugin ecosystem and WASM constraints made it difficult to integrate framework-specific compilers (like Qwik's optimizer) and run in all JavaScript runtimes.

- **[unstorage](https://github.com/unjs/unstorage)** and the **[UnJS](https://github.com/unjs)** ecosystem - The philosophy of building runtime-agnostic JavaScript tools directly influenced our approach. We use UnJS primitives like [pathe](https://github.com/unjs/pathe) for cross-platform path handling.

- **[Rolldown](https://github.com/rolldown/rolldown)** - The Rust-powered bundler that makes this all possible.

## Why Rolldown?

[Rolldown](https://rolldown.rs) is a Rust-based JavaScript bundler designed to serve as the future bundler for Vite. Here's why it's perfect for MDX bundling:

- **Performance** - Written in Rust, Rolldown matches esbuild's speed while being 10-30x faster than Rollup. Its WASM build is also significantly faster than esbuild's (due to Go's sub-optimal WASM compilation).

- **Ecosystem Compatibility** - Rolldown supports the same plugin API as Rollup/Vite, giving us access to the entire Vite plugin ecosystem. This means framework compilers like `@builder.io/qwik/optimizer` work out of the box.

- **Better Chunking Control** - Rolldown provides fine-grained control over code splitting and chunk generation that esbuild doesn't offer, which is essential for framework-specific optimizations.

- **Universal Runtime Support** - Rolldown's architecture enables true cross-runtime compatibility without the Node.js-specific limitations we hit with esbuild.

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

// Also works with: preact, solid, vue, hono
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

// createMDXComponent will still work correctly
const Component = createMDXComponent(result, CustomJSX);
```

### Intelligent Component Creation

Create MDX components for your framework with minimal code:

```js
import { createMDXComponent } from 'rolldown-mdx';
import * as React from 'react';

// Easy component creation - just pass the result and your framework's module
const Component = createMDXComponent(result, React);

// Framework is detected from the bundler result!
```

### Typed for Your Framework

rolldown-mdx exports are deliberately generic, allowing you to provide your own framework-specific types and get precise TypeScript inference:

```ts
import { createMDXComponent } from 'rolldown-mdx';
import * as Qwik from '@builder.io/qwik';

// Framework-specific type safety
const Component = createMDXComponent<Record<string, unknown>, Qwik.JSXOutput>(
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

### Framework Compiler Integration

Leverage your framework's compiler optimizations directly in the MDX bundling process:

```js
import { qwikRollup } from '@builder.io/qwik/optimizer';

const result = await bundleMDX({
  source: mdxSource,
  framework: 'qwik',
  rolldown: {
    plugins: [qwikRollup()],
  }
});
```

### Built for Performance

rolldown-mdx is built on rolldown's Rust-based architecture, providing:

- Near-native parsing speeds
- Efficient AST transformations
- Optimized code generation

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

### Runtime Agnostic

Unlike other MDX bundlers that are locked to Node.js, rolldown-mdx runs **everywhere**:

| Runtime | `source` option | `file` option |
|---------|-----------------|---------------|
| **Node.js** | ✅ | ✅ |
| **Deno** | ✅ | ✅ |
| **Bun** | ✅ | ✅ |
| **Cloudflare Workers** | ✅ | — |
| **Vercel Edge** | ✅ | — |
| **Browser** | ✅ | — |

The `source` option works universally. The `file` option (reading from disk) works in runtimes with filesystem access.

#### Edge Runtimes (Cloudflare Workers, Vercel Edge, etc.)

```js
export default {
  async fetch(request, env) {
    // Example Fetch MDX from KV, R2, or anywhere
    const mdxContent = await env.MY_KV.get('posts/hello.mdx');
    
    const result = await bundleMDX({
      source: mdxContent,
      framework: 'qwik'
    });
    
    return new Response(result.code);
  }
}
```

## License

MIT
