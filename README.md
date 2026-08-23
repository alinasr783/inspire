This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## خادم الاتصال بالذكاء الاصطناعي | MCP Server

هذا المشروع يوفر خادم (MCP - Model Context Protocol) يتيح لتطبيقات الذكاء الاصطناعي البحث في بيانات النظام وإدارتها بالكامل (العقارات والعملاء).

### نقطة الواجهة | Endpoint

```
POST /api/mcp
```

تعمل النقطة عبر (Streamable HTTP) بنمط الاستجابات JSON، وهي متوافقة مع بيئة النشر السحابي (بدون جلسات دائمة).

### الأدوات المتاحة | Available Tools

**العقارات (5 أدوات):**

| الأداة | الوصف |
|---|---|
| `search_units` | البحث في العقارات وإرجاع **قائمة** بالمطابقات (حتى 500 سجل) مع كل فلترز شاشة العقارات: بحث نصي عام، الاسم، الهاتف، الكمبوند، المنطقة، رقم العمارة، التشطيب، البيع/الإيجار، النوع، الموظف المسؤول، المنشئ، نطاق المبلغ النقدي، نطاق المتبقي، تاريخ آخر تواصل، الهواتف المكررة، الحقول المخصصة، الترتيب، ترقيم الصفحات، مع إرجاع العدد الكلي للمطابقات |
| `get_unit` | جلب تفاصيل عقار محدد بالكامل |
| `create_unit` | إنشاء عقار جديد |
| `update_unit` | تعديل عقار (تعديل جزئي) |
| `delete_unit` | حذف عقار |

**العملاء (5 أدوات):**

| الأداة | الوصف |
|---|---|
| `search_clients` | البحث في العملاء (الأفراد افتراضيًا) وإرجاع **قائمة** بالمطابقات (حتى 500 سجل) مع كل فلترز شاشة العملاء: بحث نصي عام، الاسم، الهاتف، الهاتف البديل، طريقة الدفع، المنطقة المفضلة، النوع، الغرف، المطور المفضل، المصدر، الموظف المسؤول، المنشئ، نطاق الميزانية، تاريخ آخر تواصل، معدل الجدية، العملاء من الشركات، الحقول المخصصة، الترتيب، ترقيم الصفحات، مع إرجاع العدد الكلي للمطابقات |
| `get_client` | جلب تفاصيل عميل محدد بالكامل |
| `create_client` | إنشاء عميل جديد |
| `update_client` | تعديل عميل |
| `delete_client` | حذف عميل |

**ملاحظات البحث | Search Notes:**
- كل الحقول الرقمية تقبل الأرقام كنصوص أو أرقام (مثل `"1500000"` أو `1500000`) — يعمل البحث بشكل صحيح مع أي منهما.
- قيم القوائم المطابقة التامة: التشطيب (`راو، نصف تشطيب، تشطيب كامل، تحت الإنشاء`)، البيع/الإيجار (`بيع، إيجار`)، طرق الدفع (`كاش، تقسيط`)، المصادر (`Road، Facebook، Instagram، TikTok، معرض، فيس، انستجرام، تيك توك`).

### متغيرات البيئة | Environment Variables

| المتغير | الوصف |
|---|---|
| `MCP_DEFAULT_USER_ID` | معرّف حساب الخدمة المستخدم كقيمة `created_by` عند إنشاء السجلات عبر الخادم (مطلوب) |

### الربط مع تطبيقات الذكاء الاصطناعي | Connecting AI Applications

**كلود لسطح المكتب (Claude Desktop):** أضف إلى ملف الإعداد الخاص بالتطبيق:

```json
{
  "mcpServers": {
    "inspire-crm": {
      "type": "http",
      "url": "https://<your-domain>/api/mcp"
    }
  }
}
```

**عدم طلب الإذن قبل كل عملية (Auto-approve):** ليعمل الذكاء الاصطناعي دون أن يسألك قبل كل استدعاء أداة، أضف قائمة الموافقة الدائمة في إعدادات العميل:

```json
{
  "mcpServers": {
    "inspire-crm": {
      "type": "http",
      "url": "https://<your-domain>/api/mcp",
      "permissions": {
        "tools": {
          "alwaysAllow": [
            "search_units",
            "get_unit",
            "create_unit",
            "update_unit",
            "delete_unit",
            "search_clients",
            "get_client",
            "create_client",
            "update_client",
            "delete_client"
          ]
        }
      }
    }
  }
}
```

ملف `.mcp.json` في جذر المشروع يحتوي هذا الإعداد جاهزًا (محليًا و للإنتاج على `https://inspire.alinasr.com/api/mcp`). في كلود لسطح المكتب، يمكن استخدام الإعداد في ملف `claude_desktop_config.json` أو تمكين الموافقة التلقائية من إعدادات التطبيق.

**أي تطبيق آخر:** وجّهه إلى `https://<your-domain>/api/mcp` ببروتوكول الاتصال القياسي (JSON-RPC 2.0).

### هيكل الكود | Code Structure

```
src/app/api/mcp/route.ts            ← نقطة الواجهة (GET/POST/DELETE)
src/lib/mcp/server.ts               ← إنشاء الخادم وتسجيل الأدوات
src/lib/mcp/descriptions.ts         ← الأوصاف الثنائية (عربي/إنجليزي)
src/lib/mcp/schemas.ts              ← مخططات التحقق من المدخلات
src/lib/mcp/tools/units-tools.ts    ← أدوات العقارات
src/lib/mcp/tools/clients-tools.ts  ← أدوات العملاء
src/lib/mcp/data/units.ts           ← طبقة الوصول لبيانات العقارات
src/lib/mcp/data/clients.ts         ← طبقة الوصول لبيانات العملاء
```

### الاختبار | Testing

```bash
npm run test -- src/__tests__/mcp-data.test.ts
```

### ملاحظة أمنية | Security Note

المرحلة الحالية تعمل بدون مصادقة على نقطة الواجهة. يُنصح بإضافة حماية (رمز وصول سري) قبل الإتاحة العامة الكاملة.
