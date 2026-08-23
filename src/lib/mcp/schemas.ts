import { z } from "zod";

const invalidIdMsg = "معرّف غير صالح | Invalid id";

export const idSchema = z.object({
  id: z.string().uuid(invalidIdMsg),
});

const paginationSchema = {
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
};

export const searchUnitsSchema = z.object({
  customer_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  compound_name: z.string().trim().optional(),
  area: z.string().trim().optional(),
  building_number: z.string().trim().optional(),
  finishing_status: z.string().trim().optional(),
  rent_sale: z.string().trim().optional(),
  unit_type: z.string().trim().optional(),
  cash_required_min: z.number().optional(),
  cash_required_max: z.number().optional(),
  remaining_min: z.number().optional(),
  remaining_max: z.number().optional(),
  assigned_employee: z.string().trim().optional(),
  ...paginationSchema,
});

export const createUnitSchema = z.object({
  customer_name: z.string().trim().min(1, "اسم العميل مطلوب | Customer name is required"),
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب | Phone is required"),
  compound_name: z.string().trim().min(1, "اسم الكمبوند مطلوب | Compound name is required"),
  area: z.string().trim().optional().default(""),
  building_number: z.string().trim().optional().default(""),
  finishing_status: z.string().trim().optional().default(""),
  rent_sale: z.string().trim().optional().default(""),
  unit_type: z.string().trim().optional().default(""),
  cash_required: z.number().positive().optional(),
  remaining: z.number().positive().optional(),
  last_contact_date: z.string().trim().optional(),
  additional_notes: z.string().trim().optional().default(""),
  feedback: z.string().trim().optional().default(""),
  assigned_employee: z.string().trim().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateUnitSchema = z
  .object({
    id: z.string().uuid(invalidIdMsg),
  })
  .merge(
    z.object({
      customer_name: z.string().trim().min(1).optional(),
      phone: z.string().trim().min(1).optional(),
      compound_name: z.string().trim().min(1).optional(),
      area: z.string().trim().optional(),
      building_number: z.string().trim().optional(),
      finishing_status: z.string().trim().optional(),
      rent_sale: z.string().trim().optional(),
      unit_type: z.string().trim().optional(),
      cash_required: z.number().positive().optional(),
      remaining: z.number().positive().optional(),
      last_contact_date: z.string().trim().optional(),
      additional_notes: z.string().trim().optional(),
      feedback: z.string().trim().optional(),
      assigned_employee: z.string().trim().nullable().optional(),
      custom_fields: z.record(z.string(), z.unknown()).optional(),
    })
  );

export const searchClientsSchema = z.object({
  customer_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  phone_alt: z.string().trim().optional(),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  payment_method: z.string().trim().optional(),
  preferred_area: z.string().trim().optional(),
  unit_type: z.string().trim().optional(),
  bedrooms: z.string().trim().optional(),
  preferred_developer: z.string().trim().optional(),
  source: z.string().trim().optional(),
  assigned_employee: z.string().trim().optional(),
  is_company_client: z.boolean().optional().default(false),
  ...paginationSchema,
});

export const createClientSchema = z.object({
  customer_name: z.string().trim().min(1, "اسم العميل مطلوب | Customer name is required"),
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب | Phone is required"),
  phone_alt: z.string().trim().optional(),
  budget_from: z.number().positive().optional(),
  budget_to: z.number().positive().optional(),
  payment_method: z.string().trim().optional(),
  preferred_area: z.string().trim().optional(),
  unit_type: z.string().trim().optional(),
  bedrooms: z.string().trim().optional(),
  preferred_developer: z.string().trim().optional(),
  source: z.string().trim().optional(),
  additional_notes: z.string().trim().optional(),
  last_contact_date: z.string().trim().optional(),
  assigned_employee: z.string().trim().optional(),
  seriousness_rating: z.number().int().min(1).max(10).optional().default(5),
  custom_fields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateClientSchema = z
  .object({
    id: z.string().uuid(invalidIdMsg),
  })
  .merge(
    z.object({
      customer_name: z.string().trim().min(1).optional(),
      phone: z.string().trim().min(1).optional(),
      phone_alt: z.string().trim().nullable().optional(),
      budget_from: z.number().positive().nullable().optional(),
      budget_to: z.number().positive().nullable().optional(),
      payment_method: z.string().trim().nullable().optional(),
      preferred_area: z.string().trim().nullable().optional(),
      unit_type: z.string().trim().nullable().optional(),
      bedrooms: z.string().trim().nullable().optional(),
      preferred_developer: z.string().trim().nullable().optional(),
      source: z.string().trim().nullable().optional(),
      additional_notes: z.string().trim().nullable().optional(),
      last_contact_date: z.string().trim().nullable().optional(),
      assigned_employee: z.string().trim().nullable().optional(),
      seriousness_rating: z.number().int().min(1).max(10).optional(),
      custom_fields: z.record(z.string(), z.unknown()).optional(),
    })
  );

export type SearchUnitsParams = z.infer<typeof searchUnitsSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type UpdateUnitPayload = Omit<UpdateUnitInput, "id">;
export type SearchClientsParams = z.infer<typeof searchClientsSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type UpdateClientPayload = Omit<UpdateClientInput, "id">;
