# rolldown-mdx

The framework-agnostic MDX bundler powered by [rolldown](https://github.com/rolldown/rolldown).

## Why rolldown-mdx?

**rolldown-mdx** is the ultimate solution for bundling MDX content in modern JavaScript applications:

- **Framework Agnostic** - Works with Qwik, Vue, React, Preact, Hono, Brisa, or any JSX-based framework - just provide `framework` option or custom JSX configuration.
- **Auto-Detect Frameworks** - Automatically configures for your framework with a single line of code
- **Lightning Fast** - Achieves performance comparable to esbuild and mdx-bundler through rolldown's Rust core
- **Extensible Pipeline** - Leverage rolldown's powerful plugin API for complete control over the transformation process
- **Framework Optimizations** - Hook directly into your framework's compiler during bundling (Qwik, Solid, etc.)
- **Full MDX Ecosystem** - Compatible with all your favorite MDX plugins and transformations

## Features

### Simplified Framework Integration

Just specify your framework and let rolldown-mdx handle all the configuration:

```js
import { bundleMDX } from 'rolldown-mdx';

// React
const result = await bundleMDX({
  source: mdxSource,
  framework: 'react'
});

// Qwik
const result = await bundleMDX({
  source: mdxSource,
  framework: 'qwik'
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

// Easy component creation - just pass the result and framework
const Component = createMDXComponent(result, React);

// Framework is auto-detected from the import!
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

## License

MIT
