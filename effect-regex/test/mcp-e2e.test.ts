import { describe, it, expect } from "@effect/vitest";
import { spawn } from "child_process";
import { Readable, Writable } from "stream";

// MCP protocol message types
interface MCPMessage {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: any;
}

class MCPClient {
  private process: any;
  private messageId = 1;
  private responsePromises = new Map<number, { resolve: Function; reject: Function }>();

  constructor() {
    this.process = spawn("node", ["dist/server.cjs"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.cwd()
    });

    // Set up response handling
    let buffer = "";
    this.process.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response: MCPResponse = JSON.parse(line);
            const promise = this.responsePromises.get(response.id);
            if (promise) {
              this.responsePromises.delete(response.id);
              if (response.error) {
                promise.reject(response.error);
              } else {
                promise.resolve(response.result);
              }
            }
          } catch (error) {
            console.error("Failed to parse MCP response:", line, error);
          }
        }
      }
    });

    this.process.stderr.on("data", (data: Buffer) => {
      console.log("MCP Server stderr:", data.toString());
    });
  }

  async sendMessage(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      const message: MCPMessage = {
        jsonrpc: "2.0",
        id,
        method,
        params
      };

      this.responsePromises.set(id, { resolve, reject });

      const jsonMessage = JSON.stringify(message) + "\n";
      this.process.stdin.write(jsonMessage);

      // Timeout after 5 seconds
      setTimeout(() => {
        this.responsePromises.delete(id);
        reject(new Error("MCP request timeout"));
      }, 5000);
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.process.kill();
      this.process.on("close", () => resolve());
    });
  }
}

describe("MCP Server E2E", () => {
  let client: MCPClient;

  beforeEach(() => {
    client = new MCPClient();
  });

  afterEach(async () => {
    await client.close();
  });

  it("should list available tools", async () => {
    const result = await client.sendMessage("tools/list");

    expect(result).toHaveProperty("tools");
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBeGreaterThan(0);

    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).toContain("build_regex");
    expect(toolNames).toContain("test_regex");
    expect(toolNames).toContain("lint_regex");
  });

  it("should build a standard library pattern", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "build_regex",
      arguments: {
        input: {
          type: "std",
          name: "quotedString"
        },
        dialect: "js"
      }
    });

    expect(result).toHaveProperty("content");
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty("type", "text");

    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("pattern");
    expect(response).toHaveProperty("notes");
    expect(response).toHaveProperty("captureMap");
  });

  it("should test a regex pattern", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "test_regex",
      arguments: {
        pattern: "[a-z]+",
        dialect: "js",
        cases: [
          { input: "hello", shouldMatch: true },
          { input: "123", shouldMatch: false }
        ],
        timeoutMs: 100
      }
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("total", 2);
    expect(response).toHaveProperty("passed");
    expect(response).toHaveProperty("failed");
    expect(response).toHaveProperty("failures");
  });

  it("should lint a regex pattern", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "lint_regex",
      arguments: {
        pattern: "[a-z]+",
        dialect: "js"
      }
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("valid");
    expect(response).toHaveProperty("issues");
  });

  it("should list library patterns", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "library_list",
      arguments: {}
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("total");
    expect(response).toHaveProperty("patterns");
    expect(Array.isArray(response.patterns)).toBe(true);
  });

  it("should handle invalid tool calls", async () => {
    await expect(
      client.sendMessage("tools/call", {
        name: "nonexistent_tool",
        arguments: {}
      })
    ).rejects.toThrow();
  });

  it("should validate input parameters", async () => {
    // Test with oversized input
    const largePattern = "x".repeat(25000);

    await expect(
      client.sendMessage("tools/call", {
        name: "build_regex",
        arguments: {
          input: {
            type: "std",
            name: largePattern // Invalid name, too long
          }
        }
      })
    ).rejects.toThrow();
  });

  it("should explain standard library patterns", async () => {
    // First, build a pattern to get the regex string
    const buildResult = await client.sendMessage("tools/call", {
      name: "build_regex",
      arguments: {
        input: {
          type: "std",
          name: "integer"
        },
        dialect: "js"
      }
    });

    const buildResponse = JSON.parse(buildResult.content[0].text);

    // Now explain it
    const explainResult = await client.sendMessage("tools/call", {
      name: "explain_regex",
      arguments: {
        pattern: buildResponse.pattern,
        format: "tree",
        dialect: "js"
      }
    });

    expect(explainResult).toHaveProperty("content");
    const explainResponse = JSON.parse(explainResult.content[0].text);
    expect(explainResponse).toHaveProperty("pattern");
    expect(explainResponse).toHaveProperty("explanation");
  });

  it("should propose patterns from examples", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "propose_pattern",
      arguments: {
        positiveExamples: ["hello", "world", "test"],
        negativeExamples: ["123", "456"],
        maxIterations: 2,
        dialect: "js"
      }
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("success");
    expect(response).toHaveProperty("pattern");
    expect(response).toHaveProperty("iterations");
    expect(response).toHaveProperty("testResults");
    expect(response).toHaveProperty("history");
    expect(Array.isArray(response.history)).toBe(true);
  });

  it("should filter library patterns by search", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "library_list",
      arguments: {
        filter: {
          search: "quoted"
        }
      }
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("patterns");
    expect(response.patterns.length).toBeGreaterThan(0);
    expect(response.patterns.some((p: any) => p.name.includes("quoted") || p.description.includes("quoted"))).toBe(true);
  });

  it("should convert regex between dialects", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "convert_regex",
      arguments: {
        pattern: "[a-z]+",
        fromDialect: "js",
        toDialect: "re2",
        allowDowngrades: true
      }
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("pattern");
    expect(response).toHaveProperty("fromDialect", "js");
    expect(response).toHaveProperty("toDialect", "re2");
    expect(response).toHaveProperty("success");
    expect(response).toHaveProperty("notes");
  });

  it("should build patterns from CommandSpec", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "build_regex",
      arguments: {
        input: {
          type: "command",
          spec: {
            name: "git",
            subcommands: ["commit", "push"],
            flags: [
              { name: "verbose", short: "v" },
              { name: "all", short: "a" }
            ],
            options: [
              { key: "message", short: "m", valuePattern: "[^\\s]+", required: true }
            ]
          }
        },
        dialect: "js"
      }
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("pattern");
    expect(response).toHaveProperty("captureMap");
    expect(response.captureMap).toHaveProperty("subcommand");
  });

  it("should handle test cases with timeouts", async () => {
    // Pattern that could cause catastrophic backtracking
    const evilPattern = "(a+)+b";

    const result = await client.sendMessage("tools/call", {
      name: "test_regex",
      arguments: {
        pattern: evilPattern,
        dialect: "js",
        cases: [
          { input: "aaaaaaaaaaaaaaaaaaaaaa", shouldMatch: false }
        ],
        timeoutMs: 50
      }
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("warnings");
    // Should have timeout warning
  });

  it("should detect invalid regex patterns in lint", async () => {
    const result = await client.sendMessage("tools/call", {
      name: "lint_regex",
      arguments: {
        pattern: "[invalid(regex",
        dialect: "js"
      }
    });

    expect(result).toHaveProperty("content");
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty("valid", false);
    expect(response).toHaveProperty("issues");
    expect(Array.isArray(response.issues)).toBe(true);
    expect(response.issues.length).toBeGreaterThan(0);
    expect(response.issues[0]).toHaveProperty("severity", "error");
  });
});
