import { executeTool, TOOL_DEFS, type ToolExecutionResult } from "@/lib/assistant/tool-defs";

type ApiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ApiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ApiToolCall[];
  tool_call_id?: string;
};

export type ChatHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantAction = {
  tool: string;
  args: unknown;
  ok: boolean;
  summary: string;
};

const MAX_ITERATIONS = 10;

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي مدمج داخل نظام إدارة العلاقات "إنسباير" (Inspire CRM). لديك وصول مباشر كامل إلى بيانات النظام عبر أدوات يمكنك استدعاؤها بنفسك.

## قدراتك
- البحث في العقارات والعملاء بكل الفلاتر المتاحة (السعر، المنطقة، نوع الوحدة، التشطيب، المصدر، الميزانية، معدل الجدية، وغيرها).
- جلب تفاصيل كاملة لأي عقار أو عميل.
- إنشاء عقارات وعملاء جدد.
- تعديل بيانات أي عقار أو عميل.
- حذف العقارات والعملاء.

## قواعد مهمة
- عند طلب المستخدم للبحث أو جلب أو إنشاء أو تعديل أو حذف: نفذ العملية مباشرة عبر الأدوات. لا تقل أبدًا أنك لا تستطيع الوصول للبيانات — أنت قادر على ذلك.
- لا تسأل المستخدم للإذن قبل تنفيذ العمليات؛ نفذها مباشرة ثم أخبره بما فعلته.
- رد دائمًا باللغة العربية.
- بعد تنفيذ الأدوات، لخّص النتيجة للمستخدم بلغة واضحة ومفيدة.
- عند عرض النتائج، اعرض أهم المعلومات فقط: الاسم، الهاتف، الكمبوند/المنطقة، نوع الوحدة، السعر النقدي والمتبقي (للعقارات)، الميزانية والمنطقة المفضلة ومعدل الجدية (للعملاء).
- إذا كانت نتائج البحث كثيرة، اعرض أهمها واذكر العدد الكلي المتاح.
- عند إنشاء أو تعديل أو حذف، أكد للمستخدم ما تم تنفيذه بنجاح.

## ملاحظة
إذا طلب المستخدم البحث عن "عقار متاح" أو "عقارات متاحة" فالمقصود هو كل العقارات المسجلة في النظام.`;

export async function runAssistantChat(
  userMessage: string,
  history: ChatHistoryEntry[]
): Promise<{ reply: string; actions: AssistantAction[] }> {
  const messages: ApiMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const h of history) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: "user", content: userMessage });

  const tools = TOOL_DEFS.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const actions: AssistantAction[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await callDeepSeek(messages, tools);
    const message = response.choices[0]?.message;
    if (!message) throw new Error("DeepSeek returned no message");

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { reply: message.content ?? "", actions };
    }

    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        const parsedArgs: unknown = JSON.parse(call.function.arguments || "{}");
        args =
          typeof parsedArgs === "object" && parsedArgs !== null
            ? (parsedArgs as Record<string, unknown>)
            : {};
      } catch {
        args = {};
      }
      const result = await executeTool(call.function.name, args);
      actions.push({
        tool: call.function.name,
        args,
        ok: result.ok,
        summary: summarizeAction(call.function.name, args, result),
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    reply: "انتهى عدد العمليات المسموح به في هذا الطلب. أعد المحاولة بسؤال أكثر تحديدًا. | Max operations reached, please retry with a more specific request.",
    actions,
  };
}

async function callDeepSeek(
  messages: ApiMessage[],
  tools: { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } }[]
) {
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
      tools,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${text.slice(0, 300)}`);
  }

  return (await response.json()) as {
    choices: Array<{ message: ApiMessage }>;
  };
}

function summarizeAction(
  tool: string,
  args: Record<string, unknown>,
  result: ToolExecutionResult
): string {
  const name = String(args.customer_name ?? args.id ?? "");
  if (!result.ok) return `${tool} فشل | ${result.error}`;
  switch (tool) {
    case "search_units": {
      const data = result.data as { rows?: unknown[]; total?: number } | undefined;
      return `البحث عن عقارات: ${data?.rows?.length ?? 0} نتيجة (إجمالي ${data?.total ?? 0})`;
    }
    case "search_clients": {
      const data = result.data as { rows?: unknown[]; total?: number } | undefined;
      return `البحث عن عملاء: ${data?.rows?.length ?? 0} نتيجة (إجمالي ${data?.total ?? 0})`;
    }
    case "get_unit":
      return `جلب تفاصيل عقار ${name}`;
    case "get_client":
      return `جلب تفاصيل عميل ${name}`;
    case "create_unit":
      return `إنشاء عقار جديد: ${name}`;
    case "create_client":
      return `إنشاء عميل جديد: ${name}`;
    case "update_unit":
      return `تعديل عقار: ${name}`;
    case "update_client":
      return `تعديل عميل: ${name}`;
    case "delete_unit":
      return `حذف عقار: ${name}`;
    case "delete_client":
      return `حذف عميل: ${name}`;
    default:
      return `تنفيذ ${tool}`;
  }
}
