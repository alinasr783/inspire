export const DESC = {
  serverName: "خادم إدارة علاقات العملاء | Inspire CRM Server",
  serverInstructions:
    "هذا الخادم يتيح لتطبيقات الذكاء الاصطناعي البحث في عقارات وعملاء نظام إدارة العلاقات وإدارتهم بالكامل. " +
    "This server lets AI applications search and fully manage the CRM's properties and clients.",

  searchUnits:
    "البحث عن عقارات مسجلة في النظام بمرشحات متعددة مع ترقيم الصفحات. | " +
    "Search registered properties (units) with multiple filters and pagination.",
  getUnit:
    "جلب تفاصيل عقار محدد بالكامل باستخدام معرّفه، بما فيها الحقول المخصصة. | " +
    "Fetch full details of a specific property by its id, including custom fields.",
  createUnit:
    "إنشاء عقار جديد في النظام. | Create a new property in the system.",
  updateUnit:
    "تعديل بيانات عقار موجود (تعديل جزئي: تُرسل الحقول المطلوب تغييرها فقط). | " +
    "Update an existing property (partial update: only send fields to change).",
  deleteUnit:
    "حذف عقار نهائيًا من النظام. | Permanently delete a property from the system.",
  searchClients:
    "البحث عن عملاء (الأفراد افتراضيًا) بمرشحات متعددة مع ترقيم الصفحات. | " +
    "Search clients (individuals by default) with multiple filters and pagination.",
  getClient:
    "جلب تفاصيل عميل محدد بالكامل باستخدام معرّفه. | " +
    "Fetch full details of a specific client by its id.",
  createClient:
    "إنشاء عميل جديد في النظام. | Create a new client in the system.",
  updateClient:
    "تعديل بيانات عميل موجود (تعديل جزئي). | Update an existing client (partial update).",
  deleteClient:
    "حذف عميل نهائيًا من النظام. | Permanently delete a client from the system.",

  id: "المعرّف الفريد | Unique id",
  customerName: "اسم العميل | Customer name",
  phone: "رقم الهاتف | Phone number",
  phoneAlt: "رقم هاتف بديل | Alternative phone number",
  compoundName: "اسم الكمبوند / الشركة | Compound / developer name",
  area: "المنطقة | Area",
  buildingNumber: "رقم العمارة | Building number",
  finishingStatus: "حالة التشطيب (راو / نصف تشطيب / تشطيب كامل / تحت الإنشاء) | Finishing status",
  rentSale: "نوع التعامل: بيع أو إيجار | Rent or sale",
  unitType: "نوع الوحدة | Unit type",
  cashRequired: "المبلغ المطلوب نقدًا | Cash required",
  remaining: "المبلغ المتبقي | Remaining amount",
  lastContactDate: "تاريخ آخر تواصل (صيغة: YYYY-MM-DD) | Last contact date",
  additionalNotes: "ملاحظات إضافية | Additional notes",
  feedback: "ردود الفعل / الملاحظات | Feedback",
  assignedEmployee: "معرّف الموظف المسؤول | Assigned employee id",
  customFields: "الحقول المخصصة (قاموس أزواج) | Custom fields (key-value map)",
  budgetFrom: "الميزانية من | Budget from",
  budgetTo: "الميزانية إلى | Budget to",
  paymentMethod: "طريقة الدفع | Payment method",
  preferredArea: "المنطقة المفضلة | Preferred area",
  bedrooms: "عدد الغرف | Bedrooms",
  preferredDeveloper: "المطور المفضل | Preferred developer",
  source: "مصدر العميل | Client source",
  seriousnessRating: "معدل الجدية من 1 إلى 10 | Seriousness rating (1-10)",
  isCompanyClient: "هل هو عميل شركة؟ (الافتراضي: فرد) | Is it a company client? (default: individual)",

  min: "الحد الأدنى | Minimum",
  max: "الحد الأقصى | Maximum",
  limit: "عدد النتائج في الصفحة (الحد الأقصى 100، الافتراضي 50) | Page size (max 100, default 50)",
  offset: "البدء من النتيجة رقم | Number of results to skip",

  errorPrefix: "خطأ | Error: ",
} as const;
