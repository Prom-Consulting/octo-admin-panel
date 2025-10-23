import z from "zod";

export const CreateAssignmentSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  timezone: z.string().default("UTC"),
  clientId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  assignmentDate: z.string(),
  startTime: z.string(),
  notes: z.string().nullable().optional(),
  source: z.enum(["calendar", "mobile", "admin", "booking"]),
  discount: z.number().min(0).max(100).default(0),
  service: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    price: z.number(),
    duration: z.number(),
  }),
  additionalServices: z
    .array(
      z.object({
        id: z.number().int().positive(),
        price: z.number(),
        duration: z.number(),
      })
    )
    .default([]),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;