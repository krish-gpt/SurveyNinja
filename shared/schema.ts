import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  organizationName: text("organization_name"),
  industry: text("industry"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").default("free").notNull(),
  paymentDate: timestamp("payment_date"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

// Form model
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  logo: text("logo"),
  elements: jsonb("elements").default([]).notNull(),
  status: text("status").default("draft").notNull(), // 'draft' or 'published'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormSchema = createInsertSchema(forms).pick({
  userId: true,
  title: true,
  description: true,
  logo: true,
  elements: true,
  status: true,
});

// Form response model
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Support enquiries model
export const supportEnquiries = pgTable("support_enquiries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResponseSchema = createInsertSchema(responses).pick({
  formId: true,
  data: true,
});

export const insertSupportEnquirySchema = createInsertSchema(supportEnquiries).pick({
  userId: true,
  email: true,
  subject: true,
  message: true,
});

// Element types for form builder
export const formElementTypes = [
  "short-text",
  "long-text",
  "multiple-choice",
  "checkbox",
  "dropdown",
  "rating",
  "date",
  "file-upload",
] as const;

export const formElementSchema = z.object({
  id: z.string(),
  type: z.enum(formElementTypes),
  label: z.string(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  properties: z.record(z.any()).optional(),
});

export type FormElement = z.infer<typeof formElementSchema>;
export type InsertFormElement = z.infer<typeof formElementSchema>;

// Extend the insert schemas with additional validation
export const extendedInsertUserSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Response = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type SupportEnquiry = typeof supportEnquiries.$inferSelect;
export type InsertSupportEnquiry = z.infer<typeof insertSupportEnquirySchema>;
