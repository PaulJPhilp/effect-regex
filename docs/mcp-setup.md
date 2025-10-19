# MCP Server Setup Guide: effect-regex

This guide explains how to set up and use the effect-regex Model Context Protocol (MCP) server with AI assistants like Claude Desktop and Cline.

## What is MCP?

The Model Context Protocol (MCP) is a standard protocol that allows AI assistants to access external tools and services. The effect-regex MCP server exposes 7 powerful regex tools that AI assistants can use to build, test, lint, explain, and propose regex patterns.

## Available Tools

The effect-regex MCP server provides the following tools:

1. **build_regex** - Build regex patterns from:
   - Standard library patterns
   - CommandSpec (CLI command definitions)
   - AST (future)

2. **test_regex** - Test regex patterns against test cases with timeout protection

3. **lint_regex** - Lint patterns for safety, performance, and dialect compatibility

4. **convert_regex** - Convert patterns between dialects (JS, RE2, PCRE)

5. **explain_regex** - Generate human-readable explanations of pattern structure

6. **library_list** - List all patterns in the standard library with filtering

7. **propose_pattern** - AI-assisted pattern generation from examples (propose → test → refine loop)

## Prerequisites

1. **Node.js** 22+ installed
2. **pnpm** 10.14+ installed
3. **effect-regex** built and available

## Installation

### 1. Build the MCP Server

```bash
cd effect-regex
pnpm install
pnpm build:mcp
```

This creates `dist/server.cjs` which is the MCP server entry point.

### 2. Verify the Build

```bash
# Check that the server file exists
ls -lh dist/server.cjs

# Should show: dist/server.cjs (approximately 600-700 KB)
```

## Configuration

### Claude Desktop

Claude Desktop uses a JSON configuration file to register MCP servers.

#### Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Configuration

Create or edit the configuration file:

```json
{
  "mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": [
        "/absolute/path/to/effect-regex/effect-regex/dist/server.cjs"
      ],
      "env": {}
    }
  }
}
```

**Important**: Replace `/absolute/path/to/effect-regex` with the actual absolute path to your project directory.

#### Example (macOS)

```json
{
  "mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": [
        "/Users/paul/Projects/effect-regex/effect-regex/dist/server.cjs"
      ],
      "env": {}
    }
  }
}
```

#### Verify Installation

1. Restart Claude Desktop
2. Open a new conversation
3. Look for the tools icon (🔨) in the input area
4. Click it to see available tools
5. You should see 7 effect-regex tools listed

### Cline (VS Code Extension)

Cline uses MCP servers via the VS Code settings.

#### Configuration

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "Cline MCP"
3. Edit `settings.json` directly (click "Edit in settings.json")

```json
{
  "cline.mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": [
        "/absolute/path/to/effect-regex/effect-regex/dist/server.cjs"
      ],
      "env": {}
    }
  }
}
```

#### Verify Installation

1. Restart VS Code
2. Open Cline extension panel
3. Check the MCP servers status
4. effect-regex should show as "Connected" with 7 tools

## AI-Powered Pattern Generation (Optional)

The `propose_pattern` tool can use AI (via Anthropic Claude API) to generate regex patterns from examples. This is an optional feature that provides more intelligent pattern proposals.

### Enabling LLM Integration

To enable AI-powered pattern generation, you need to provide an Anthropic API key.

#### Getting an API Key

1. Sign up for an account at [Anthropic Console](https://console.anthropic.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `sk-ant-...`)

#### Configuration with API Key

**Claude Desktop:**

```json
{
  "mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": [
        "/absolute/path/to/effect-regex/effect-regex/dist/server.cjs"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

**Cline (VS Code):**

```json
{
  "cline.mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": [
        "/absolute/path/to/effect-regex/effect-regex/dist/server.cjs"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

**Important Security Notes**:
- Never commit API keys to version control
- Store keys in environment variables or secure credential managers
- Consider using `.env` files with proper `.gitignore` configuration
- Monitor API usage and costs at [Anthropic Console](https://console.anthropic.com/)

### How It Works

When an API key is configured:

1. **propose_pattern** first attempts to use Claude to generate patterns
2. Prompts include RegexBuilder API documentation and your examples
3. LLM response is validated and safely evaluated
4. If LLM generation fails, automatically falls back to heuristic generation
5. No API key required for basic heuristic-based pattern generation

### LLM vs Heuristic Generation

| Feature | LLM (with API key) | Heuristic (default) |
|---------|-------------------|---------------------|
| **Accuracy** | High - understands context | Medium - pattern matching |
| **Confidence** | 0.85+ | 0.7 |
| **Cost** | API usage fees | Free |
| **Speed** | 2-5 seconds | Instant |
| **Examples needed** | 2-3 positive | 3+ recommended |
| **Context understanding** | Yes | Limited |
| **Fallback** | Automatic to heuristic | N/A |

### Example: AI-Powered Email Pattern

**With API key:**
```json
{
  "name": "propose_pattern",
  "arguments": {
    "positiveExamples": ["user@example.com", "test@test.org"],
    "negativeExamples": ["@example.com", "not-email"],
    "context": "email addresses for contact forms"
  }
}
```

Response includes:
- More precise character class for email local part
- Proper TLD validation (2+ characters)
- Better handling of subdomains
- Higher confidence score (0.85+)
- Detailed reasoning about pattern choices

**Without API key:**
```json
// Same call works, but uses heuristic generation
// - Simpler pattern
// - Lower confidence (0.7)
// - Basic pattern matching
```

### Cost Considerations

- **Model**: claude-3-5-sonnet-20241022
- **Typical usage**: ~500-1000 tokens per pattern generation
- **Cost**: ~$0.003-0.015 per pattern (as of Feb 2025)
- **Retry logic**: Up to 3 attempts with exponential backoff
- **Rate limits**: Automatic handling with delays

### Troubleshooting LLM Integration

**API Key Not Working:**
1. Check key format: should start with `sk-ant-`
2. Verify key is active in Anthropic Console
3. Check for copy/paste errors (no spaces)
4. Restart AI assistant after adding key

**LLM Calls Timing Out:**
1. Check internet connectivity
2. Verify Anthropic API status
3. Consider rate limiting (wait between calls)
4. Falls back to heuristics automatically

**Unexpected Costs:**
1. Monitor usage in Anthropic Console
2. Set spending limits
3. Use heuristics for development/testing
4. Enable LLM only for production pattern generation

**Pattern Quality Issues:**
1. Provide more examples (3-5 positive, 2-3 negative)
2. Add context description
3. Review and refine generated patterns
4. Use test_regex to validate results

## Usage Examples

### 1. Building Standard Library Patterns

**Prompt to AI Assistant:**
> "Use the build_regex tool to get the quotedString pattern from the standard library"

**Tool Call:**
```json
{
  "name": "build_regex",
  "arguments": {
    "input": {
      "type": "std",
      "name": "quotedString"
    },
    "dialect": "js"
  }
}
```

**Response:**
```json
{
  "pattern": "[\"'][\"'\\\\]*[\"']",
  "notes": [],
  "captureMap": {
    "quoted": 1
  }
}
```

### 2. Testing a Pattern

**Prompt to AI Assistant:**
> "Test the regex `[a-z]+` against these cases: 'hello' should match, '123' should not match"

**Tool Call:**
```json
{
  "name": "test_regex",
  "arguments": {
    "pattern": "[a-z]+",
    "dialect": "js",
    "cases": [
      { "input": "hello", "shouldMatch": true },
      { "input": "123", "shouldMatch": false }
    ],
    "timeoutMs": 100
  }
}
```

**Response:**
```json
{
  "total": 2,
  "passed": 2,
  "failed": 0,
  "warnings": [],
  "failures": []
}
```

### 3. Linting a Pattern

**Prompt to AI Assistant:**
> "Check if this regex is safe: `(a+)+b`"

**Tool Call:**
```json
{
  "name": "lint_regex",
  "arguments": {
    "pattern": "(a+)+b",
    "dialect": "js"
  }
}
```

**Response:**
```json
{
  "valid": true,
  "issues": [
    {
      "code": "NESTED_QUANTIFIERS",
      "severity": "warning",
      "message": "Nested quantifiers can cause catastrophic backtracking"
    }
  ]
}
```

### 4. Explaining a Pattern

**Prompt to AI Assistant:**
> "Explain what this pattern does: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$`"

**Tool Call:**
```json
{
  "name": "explain_regex",
  "arguments": {
    "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    "format": "tree",
    "dialect": "js"
  }
}
```

### 5. Proposing a Pattern from Examples

**Prompt to AI Assistant:**
> "Create a regex that matches valid email addresses. Here are examples: user@example.com, test.user@subdomain.example.org"

**Tool Call:**
```json
{
  "name": "propose_pattern",
  "arguments": {
    "positiveExamples": [
      "user@example.com",
      "test.user@subdomain.example.org",
      "name+tag@company.co.uk"
    ],
    "negativeExamples": [
      "@example.com",
      "user@",
      "not-an-email",
      "user @example.com"
    ],
    "maxIterations": 3,
    "dialect": "js"
  }
}
```

**Response:**
```json
{
  "success": true,
  "pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  "iterations": 2,
  "testResults": {
    "passed": 7,
    "failed": 0,
    "warnings": []
  },
  "history": [
    {
      "iteration": 1,
      "reasoning": "Detected @ symbol in examples, proposing email pattern",
      "confidence": 0.7,
      "pattern": "\\w+@\\w+\\.\\w+"
    },
    {
      "iteration": 2,
      "reasoning": "Added support for dots, hyphens, and subdomains",
      "confidence": 0.85,
      "pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
    }
  ]
}
```

### 6. Listing Standard Library Patterns

**Prompt to AI Assistant:**
> "Show me all patterns related to numbers"

**Tool Call:**
```json
{
  "name": "library_list",
  "arguments": {
    "filter": {
      "search": "number"
    }
  }
}
```

**Response:**
```json
{
  "total": 3,
  "patterns": [
    {
      "name": "integer",
      "description": "Matches integer numbers (positive/negative)",
      "examples": ["42", "-123", "+0"],
      "dialect": "universal"
    },
    {
      "name": "float",
      "description": "Matches floating point numbers",
      "examples": ["3.14", "-0.5", "1.23e-4"],
      "dialect": "universal"
    }
  ],
  "filters": {
    "search": "number"
  }
}
```

### 7. Building CLI Command Patterns

**Prompt to AI Assistant:**
> "Create a regex to match git commit commands with -m flag"

**Tool Call:**
```json
{
  "name": "build_regex",
  "arguments": {
    "input": {
      "type": "command",
      "spec": {
        "name": "git",
        "subcommands": ["commit"],
        "options": [
          {
            "key": "message",
            "short": "m",
            "valuePattern": "[^\\s]+",
            "required": true
          }
        ]
      }
    },
    "dialect": "js"
  }
}
```

**Response:**
```json
{
  "pattern": "\\bgit\\s+(commit)\\s+(?:--message|-m)=([^\\s]+)\\b",
  "captureMap": {
    "subcommand": 1,
    "opt_message_value": 2
  },
  "notes": [
    "Strict argument ordering enforced"
  ]
}
```

## Troubleshooting

### Server Not Starting

**Symptom**: Claude Desktop or Cline shows "effect-regex: Disconnected"

**Solutions**:

1. **Check Node.js version**:
   ```bash
   node --version  # Should be 22.x or higher
   ```

2. **Verify server file exists**:
   ```bash
   ls -lh /path/to/effect-regex/effect-regex/dist/server.cjs
   ```

3. **Test server manually**:
   ```bash
   node /path/to/effect-regex/effect-regex/dist/server.cjs
   ```
   Should output: `Effect Regex MCP server running on stdio`

4. **Check configuration path**:
   - Ensure path is absolute (not relative)
   - No spaces or special characters (use quotes if needed)

5. **Restart the AI assistant**:
   - Claude Desktop: Quit and reopen
   - Cline: Reload VS Code window

### Tools Not Appearing

**Symptom**: Server connected but no tools visible

**Solutions**:

1. **Check MCP protocol version**:
   - Server uses MCP SDK v0.5.0
   - Ensure AI assistant supports this version

2. **Verify tools list**:
   ```bash
   # Run MCP inspector (if available)
   npx @modelcontextprotocol/inspector node dist/server.cjs
   ```

3. **Check logs**:
   - Claude Desktop: Check Console.app (macOS) for errors
   - Cline: Check VS Code Output panel → Cline

### Timeout Errors

**Symptom**: Tool calls timeout or hang

**Solutions**:

1. **Pattern complexity**: Simplify regex patterns or use RE2 dialect
2. **Test case count**: Reduce number of test cases (max 50)
3. **Timeout setting**: Increase timeoutMs in test_regex calls

### Invalid Pattern Errors

**Symptom**: "Invalid regex pattern" errors

**Solutions**:

1. **Escape special characters**: Use `\\` for backslashes in JSON
2. **Validate manually**:
   ```bash
   node -e "new RegExp('your-pattern')"
   ```

3. **Check dialect compatibility**: Some patterns work in JS but not RE2

## Development & Debugging

### Running Server in Development Mode

```bash
cd effect-regex
pnpm mcp:dev
```

This runs the server via `tsx` for hot reloading during development.

### Debugging MCP Calls

Enable verbose logging by setting environment variable:

```json
{
  "mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": [
        "/path/to/effect-regex/effect-regex/dist/server.cjs"
      ],
      "env": {
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

### Testing MCP Server

Run integration tests:

```bash
cd effect-regex
pnpm build:mcp  # Build first
pnpm test       # Run all tests including MCP e2e
```

## Security Considerations

### Input Validation

The MCP server enforces limits:

- **Max pattern length**: 20,000 characters
- **Max test cases**: 50 per request
- **Max groups**: 200 per pattern
- **Timeout protection**: Default 100ms per test case

### Untrusted Input

For untrusted user input:

1. **Use RE2 dialect**: Safer, no backtracking
2. **Enable timeouts**: Always set timeoutMs in test_regex
3. **Lint first**: Use lint_regex to catch issues

### Network Isolation

The MCP server runs locally and does not:

- Make network requests
- Access file system (beyond stdio)
- Execute arbitrary code

## Performance Tips

1. **Cache patterns**: Build patterns once, reuse them
2. **Limit test cases**: Use representative samples, not exhaustive
3. **Use standard library**: Pre-vetted, optimized patterns
4. **RE2 for production**: Guaranteed linear time complexity

## Standard Library Reference

The server includes 13 vetted patterns:

**Tier 1 (CLI-focused)**:
- quotedString
- keyValue
- pathSegment
- filePathBasic
- csvList
- integer

**Tier 2 (Advanced)**:
- uuidV4
- semverStrict

**Tier 3 (Utility)**:
- ipv4
- ipv6Compressed
- float
- isoDate
- isoDateTime

Use `library_list` tool to see all patterns with examples.

## Support & Resources

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: See `/memory/docs/` for architecture and technical details
- **Examples**: See `/test/corpora/` for test cases

## Version Information

- **MCP Protocol**: 2.0
- **SDK Version**: @modelcontextprotocol/sdk@0.5.0
- **effect-regex**: 0.1.0
- **Effect**: 3.17.7+

## Changelog

### v0.1.0 (2025-02-01)

- Initial MCP server implementation
- 7 tools: build_regex, test_regex, lint_regex, convert_regex, explain_regex, library_list, propose_pattern
- Standard library with 13 patterns (3 tiers)
- Timeout protection for catastrophic backtracking
- Multi-dialect support (JS, RE2, PCRE)
- CommandSpec builder for CLI parsing
- AI-assisted pattern proposal loop
