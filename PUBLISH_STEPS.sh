#!/bin/bash

# Effect-Regex v0.5.0 - Publication Steps
# This script automates the release process

set -e  # Exit on first error

cd "$(dirname "$0")"

echo "🔍 Verifying repo status..."
git status

echo ""
echo "📝 Step 1: Linting fixes and git commit"
echo "============================================"
git add -A
git commit -m "chore: prepare release v0.5.0

- Fix biome linting errors (Number.parseInt radix, unused variables, parameter order)
- Update ValidationService interface and implementations
- Fix parameter order in testRegex to put required before optional params
- Remove unused temporary test file
- Update .changeset config to public access

All 473 tests passing with 83.5% coverage - ready for npm publish"

echo ""
echo "🏷️  Step 2: Create git tag"
echo "============================================"
git tag -a v0.5.0 -m "Release version 0.5.0 - Initial Public Release

Type-safe regex builder for TypeScript with multi-dialect support.
- AST-based architecture with 40+ standard patterns
- Multi-dialect compilation (JavaScript, RE2, PCRE)  
- MCP server integration (8 tools for AI assistants)
- Comprehensive test suite (473 tests, 83.5% coverage)
- Full TSDoc documentation
- Production-ready with security hardening"

echo ""
echo "🚀 Step 3: Push to GitHub"
echo "============================================"
git push origin main --tags

echo ""
echo "✅ Git preparation complete!"
echo ""
echo "📦 Next steps:"
echo "1. Create GitHub Release at https://github.com/PaulJPhilp/effect-regex/releases"
echo "   - Copy description from CHANGELOG.md (Added section)"
echo ""
echo "2. Navigate to effect-regex/ directory:"
echo "   cd effect-regex"
echo ""
echo "3. Verify npm credentials:"
echo "   npm whoami"
echo ""
echo "4. Publish to npm:"
echo "   pnpm publish"
echo ""
echo "5. Verify package on npm (wait 1-2 minutes for CDN sync):"
echo "   npm view effect-regex"
echo "   npm install -g effect-regex  # Test global install"
echo ""
echo "See RELEASE_PREP_CHECKLIST.md for complete instructions"
