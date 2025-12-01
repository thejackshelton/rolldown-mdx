# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities via [GitHub Security Advisories](https://github.com/thejackshelton/rolldown-mdx/security/advisories/new) rather than public issues.

## Security Considerations

`createMDXComponent` uses `new Function()` to evaluate bundled code. Only bundle MDX content you trust—never bundle untrusted user input.

