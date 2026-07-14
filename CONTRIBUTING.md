# Contributing

Thank you for helping improve One Holy Bible.

## Before opening a change

Open an issue for substantial behavior or data changes so scope, provenance, and expected behavior can be agreed first. Do not submit copyrighted Scripture, commentary, or images unless you can document permission for this repository to distribute them.

## Development workflow

Use Node.js 24 and install the locked dependency graph:

```bash
npm ci
```

Before opening a pull request, run the same gates as CI:

```bash
npm run validate:public-data
npm test
npx tsc --noEmit
npm run build
```

Keep pull requests focused. Add or update tests for behavior changes, explain any data-source or rights implications, and do not commit local paths, private source files, generated image libraries, credentials, or service endpoints.

Generated `public/data` changes must be produced by the checked-in generator and committed together with their source-code changes. The private source inputs named by `npm run generate:public-data` are maintainer-side release inputs and are not part of the public repository.
