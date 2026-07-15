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
npm run validate:public-repository
npm run validate:public-release
npm test
npx tsc --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run build
```

Keep pull requests focused. Add or update tests for behavior changes, explain any data-source or rights implications, and do not commit local paths, private source files, raw/generated image binaries into this code repository, credentials, or service endpoints. Image-card changes must keep the public asset descriptor and external asset repository in sync.

Generated `public/data` changes are prepared by the independent release workflow and committed together with their public runtime changes. Source datasets and release inputs are not part of the public repository.
