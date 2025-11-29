# Manual Release Steps for effect-regex v0.5.0

All linting errors have been fixed. Follow these steps to publish:

---

## ✅ Step 1: Git Commit & Tag

Run from: `/Users/paul/Projects/Published/effect-regex`

```bash
git add -A
```

```bash
git commit -m "chore: prepare release v0.5.0

- Fix biome linting errors (Number.parseInt radix, unused variables, parameter order)
- Update ValidationService interface and implementations
- Fix parameter order in testRegex to put required before optional
- Remove unused temporary test file
- Update .changeset config to public access

All 473 tests passing with 83.5% coverage - ready for npm publish"
```

```bash
git tag -a v0.5.0 -m "Release version 0.5.0 - Initial Public Release

Type-safe regex builder for TypeScript with multi-dialect support.
- AST-based architecture with 40+ standard patterns
- Multi-dialect compilation (JavaScript, RE2, PCRE)
- MCP server integration (8 tools for AI assistants)
- Comprehensive test suite (473 tests, 83.5% coverage)
- Full TSDoc documentation
- Production-ready with security hardening"
```

```bash
git push origin main --tags
```

---

## ✅ Step 2: Create GitHub Release

1. Go to: https://github.com/PaulJPhilp/effect-regex/releases
2. Click **"Create a new release"**
3. Select tag: **v0.5.0**
4. Title: **effect-regex v0.5.0 - Initial Public Release**
5. Description: Copy from `effect-regex/CHANGELOG.md` (the "## [0.5.0]" section)
6. Click **"Publish release"**

---

## ✅ Step 3: Prepare for npm Publish

Run from: `/Users/paul/Projects/Published/effect-regex/effect-regex`

```bash
cd effect-regex
```

### Verify build artifacts exist:
```bash
ls -la dist/
```

Should show:
- `dist/bin.cjs` (CLI)
- `dist/server.cjs` (MCP server)
- `dist/package.json`

### Dry run to check what will be published:
```bash
bun pack --dry-run
```

---

## ✅ Step 4: npm Authentication

Verify you're logged in:
```bash
npm whoami
```

If not logged in:
```bash
npm login
```

---

## ✅ Step 5: Publish to npm

```bash
bun publish
```

You should see:
```
✓ Published effect-regex@0.5.0
```

---

## ✅ Step 6: Post-Publish Verification

Wait 1-2 minutes for npm CDN to sync, then:

```bash
# Check npm registry
npm view effect-regex

# Should show v0.5.0 as latest

# Test installation
npm install effect-regex

# Verify in a test directory
mkdir /tmp/test-effect-regex
cd /tmp/test-effect-regex
npm init -y
npm install effect-regex
node -e "console.log(require('effect-regex/package.json').version)"
```

---

## ✅ Step 7: Post-Release Activities

- [ ] Verify on npm: https://www.npmjs.com/package/effect-regex
- [ ] Update GitHub repo description to mention npm package
- [ ] Add npm badge to README if desired:
  ```
  [![npm version](https://badge.fury.io/js/effect-regex.svg)](https://badge.fury.io/js/effect-regex)
  ```
- [ ] Share announcement on:
  - Twitter/X
  - Discord (Effect community, TypeScript communities)
  - Dev.to or Medium
  - LinkedIn

---

## 📋 All Fixed Issues

The following linting errors were resolved:

1. ✅ `Number.parseInt` - Added radix parameter (10)
2. ✅ Unused variables - Prefixed with underscore or removed
3. ✅ Parameter ordering - Moved optional params to the end
4. ✅ Unused imports - Removed `format` and `dialect` where unused
5. ✅ Control characters in regex - Changed `\x00-\x1F` to `\u0000-\u001F`
6. ✅ Assignment in expression - Added biome-ignore comment
7. ✅ Async functions without await - Removed `async` keyword
8. ✅ Uninitialized variables - Added type annotations
9. ✅ Empty blocks - Added comment or removed
10. ✅ Temporary test file - Replaced with comment

---

## ⚠️ If Something Goes Wrong

### Undo the last commit:
```bash
git reset --soft HEAD~1
```

### Delete the tag:
```bash
git tag -d v0.5.0
git push origin :v0.5.0
```

### Unpublish from npm (if needed):
```bash
npm unpublish effect-regex@0.5.0
# (Note: Can only be done within 24 hours of publish)
```

---

## 📞 Support

- **Full Instructions:** See `RELEASE_PREP_CHECKLIST.md`
- **Status Summary:** See `RELEASE_SUMMARY.md`
- **Repository:** https://github.com/PaulJPhilp/effect-regex
- **Issues:** https://github.com/PaulJPhilp/effect-regex/issues

---

**You're ready to publish!** 🚀
