import { GLMMessage, GLMRequest } from "./types";

const GLM_API_URL = "https://api.z.ai/api/paas/v4/chat/completions";

interface GLMClientOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  thinking?: boolean;
}

interface GLMStreamChunk {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class GLMClient {
  private apiKey: string;
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GLM API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Call GLM-4.6 API with retry logic and exponential backoff
   */
  async call(
    messages: GLMMessage[],
    options: GLMClientOptions = {}
  ): Promise<string> {
    const {
      stream = false,
      temperature = 0.7,
      maxTokens,
      thinking = true,
    } = options;

    const requestBody: any = {
      model: "glm-4.6",
      messages,
      temperature,
      stream,
    };

    if (maxTokens) {
      requestBody.max_tokens = maxTokens;
    }

    if (thinking) {
      requestBody.thinking = { type: "enabled" };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(GLM_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();

          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const delay = retryAfter
              ? parseInt(retryAfter) * 1000
              : this.retryDelay * Math.pow(2, attempt);

            await this.sleep(delay);
            continue;
          }

          // Handle server errors
          if (response.status >= 500) {
            await this.sleep(this.retryDelay * Math.pow(2, attempt));
            continue;
          }

          throw new Error(
            `GLM API error (${response.status}): ${errorText}`
          );
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors
        if (error instanceof Error && error.message.includes("400")) {
          throw error;
        }

        if (attempt < this.retryAttempts - 1) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error("Failed to call GLM API after retries");
  }

  /**
   * Call GLM-4.6 API with streaming support
   */
  async *stream(
    messages: GLMMessage[],
    options: GLMClientOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const {
      temperature = 0.7,
      maxTokens,
      thinking = true,
    } = options;

    const requestBody: any = {
      model: "glm-4.6",
      messages,
      temperature,
      stream: true,
    };

    if (maxTokens) {
      requestBody.max_tokens = maxTokens;
    }

    if (thinking) {
      requestBody.thinking = { type: "enabled" };
    }

    const response = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GLM API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "" || line.trim() === "data: [DONE]") continue;

          if (line.startsWith("data: ")) {
            try {
              const data: GLMStreamChunk = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", line, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Get GLM client instance (server-side only)
 */
export function getGLMClient(): GLMClient {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error("ZAI_API_KEY environment variable is not set");
  }
  return new GLMClient(apiKey);
}
