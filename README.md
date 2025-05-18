# rolldown-mdx

The framework-agnostic MDX bundler powered by [rolldown](https://github.com/rolldown/rolldown).

## Why rolldown-mdx?

**rolldown-mdx** is the ultimate solution for bundling MDX content in modern JavaScript applications:

- **Framework Agnostic** - Works with React, Qwik, Solid, Vue, or any JSX-based framework - just provide the runtime
- **Lightning Fast** - Achieves performance comparable to esbuild and mdx-bundler through rolldown's Rust core
- **Extensible Pipeline** - Leverage rolldown's powerful plugin API for complete control over the transformation process
- **Framework Optimizations** - Hook directly into your framework's compiler during bundling (Qwik, Solid, etc.)
- **Full MDX Ecosystem** - Compatible with all your favorite MDX plugins and transformations

## Features

### Any JSX Framework, Zero Lock-in

Unlike solutions that tie you to a specific framework, rolldown-mdx works with any JSX runtime. Simply specify your framework's JSX configuration:

```js
import { bundleMDX } from 'rolldown-mdx';

// React
const result = await bundleMDX({
  source: mdxSource,
  jsxConfig: {
    jsxLib: { package: 'react' },
    jsxRuntime: { package: 'react/jsx-runtime' }
  }
});

// Qwik
const result = await bundleMDX({
  source: mdxSource,
  jsxConfig: {
    jsxLib: { package: '@builder.io/qwik' },
    jsxRuntime: { package: '@builder.io/qwik/jsx-runtime' }
  }
});
```

### Typed for Your Framework

rolldown-mdx exports are deliberately generic, allowing you to provide your own framework-specific types and get precise TypeScript inference:

```ts
import { getMDXComponent } from 'rolldown-mdx';
import * as Qwik from '@builder.io/qwik';

// Framework-specific type safety
const Component = getMDXComponent<Record<string, unknown>, Qwik.JSXOutput>(
  result.code,
  scope
);

// React example
const ReactComponent = getMDXComponent<React.ComponentProps<'div'>, React.ReactNode>(
  result.code, 
  scope
);
```

This flexible typing system means you get proper type checking and autocomplete that matches your specific framework.

### Powerful Plugin Ecosystem

Easily extend your MDX processing pipeline with remark and rehype plugins:

```js
const result = await bundleMDX({
  source: mdxSource,
  mdxOptions: (options) => {
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
  // not added yet, but will be soon
  rolldown: {
    plugins: [qwikRollup()],
  },
  jsxConfig: { jsxLib: { package: '@builder.io/qwik' } }
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
import { bundleMDX } from 'rolldown-mdx';

const result = await bundleMDX({
  source: `
    # Hello, World!
    
    This is **MDX** content.
    
    <MyComponent prop="value" />
  `,
  // Configure for your framework
  jsxConfig: {
    jsxLib: { package: 'react' },
  },
});

console.log(result.code);
console.log(result.frontmatter);
```

## License

MIT
