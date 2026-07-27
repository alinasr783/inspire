"use server";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{ message: { content: string } }>;
}

export async function callDeepSeek(messages: DeepSeekMessage[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek API key not configured");

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  return data.choices[0]?.message?.content ?? "";
}

export async function callDeepSeekJSON<T>(messages: DeepSeekMessage[]): Promise<T> {
  const content = await callDeepSeek(messages);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {}
  }
  throw new Error(`Failed to parse DeepSeek JSON response: ${content.slice(0, 200)}`);
}
