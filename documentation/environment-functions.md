---
title: Environment functions
href: /documentation/environment-functions
description: Learn more about environment functions.
---

# {% $frontmatter.title %}

**The config can make use of environment functions, denoted by a prefixed `$`, to call read from the filesystem, import external code, and more.**

### Why do environment functions exist?

Inlang's config is executed in a variety of environments such as the browser, [NodeJS](https://nodejs.org/en/), or [Electron](https://www.electronjs.org/). Unfortunately, functions such as `import()` behave differently from environment to environment. Environment functions assure consistent behaviour across different environments.

### What environment functions are available?

_Always up-to-date implementation can be found [here](https://github.com/inlang/inlang/tree/main/source-code/core/src/config/environment-functions)_

`$fs`: **node:fs/promises**

Reflects the `node:fs/promises`

`$import` **dynamic import()**

Importing an ES module either from a local path in a git repository or from a url. Note that the imported module must not have imports itself. If dependencies are required for a module, the module needs to be bundled into one single file with [Rollup](https://rollupjs.org/guide/en/) for example.

```ts
$import("https://cdn.jsdelivr.net/gh/inlang/ecosystem/plugin.js");
```

{% Callout variant="warning" %}

Importing external code via `$import` is a security risk.

The config and imported code is not sandboxed yet. Only `$import` external code that you trust (similar to NPM packages). See [#129](https://github.com/inlang/inlang/pull/129) for more information.

{% /Callout %}