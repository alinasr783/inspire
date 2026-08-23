export function getDefaultUserId(): string {
  const id = process.env.MCP_DEFAULT_USER_ID;
  if (!id) {
    throw new Error(
      "متغير البيئة MCP_DEFAULT_USER_ID غير مضبوط | Environment variable MCP_DEFAULT_USER_ID is not set"
    );
  }
  return id;
}

export function toText(content: unknown): string {
  return JSON.stringify(content, null, 2);
}

export function toError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message;
}

export function successResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: toText({ success: true, data }),
      },
    ],
  };
}

export function errorResult(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: toText({ success: false, error: toError(error) }),
      },
    ],
    isError: true,
  };
}
