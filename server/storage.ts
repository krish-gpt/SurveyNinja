import { forms, users, responses, supportEnquiries, type User, type InsertUser, type Form, type InsertForm, type Response, type InsertResponse, type SupportEnquiry, type InsertSupportEnquiry } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Modify the interface with needed CRUD methods
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: number, userData: Partial<User>): Promise<User>;
  updateUserPlan(userId: number, plan: string): Promise<User>;
  updateUserStripeInfo(userId: number, stripeInfo: { customerId: string | null, subscriptionId: string | null, paymentDate?: Date }): Promise<User>;
  
  // Form operations
  getForms(userId: number): Promise<Form[]>;
  getForm(id: number): Promise<Form | undefined>;
  getFormByUserIdAndId(userId: number, formId: number): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: number, form: Partial<InsertForm>): Promise<Form>;
  deleteForm(id: number): Promise<boolean>;
  getFormsCount(userId: number): Promise<number>;
  
  // Response operations
  getResponses(formId: number, limit?: number): Promise<Response[]>;
  getResponse(id: number): Promise<Response | undefined>;
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesCount(formId: number): Promise<number>;
  
  // Support enquiry operations
  getSupportEnquiries(userId?: number): Promise<SupportEnquiry[]>;
  getSupportEnquiry(id: number): Promise<SupportEnquiry | undefined>;
  createSupportEnquiry(enquiry: InsertSupportEnquiry): Promise<SupportEnquiry>;
  updateSupportEnquiryStatus(id: number, status: string): Promise<SupportEnquiry>;
  
  // Session store
  sessionStore: any; // Using any type to avoid TypeScript issues with the session store
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        plan: "free",
      })
      .returning();
    return user;
  }
  
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    // Filter out sensitive fields like password, plan, and stripe data
    const safeUpdateData: Partial<User> = {};
    
    // Only allow updating specific user fields
    if (userData.username !== undefined) safeUpdateData.username = userData.username;
    if (userData.email !== undefined) safeUpdateData.email = userData.email;
    if (userData.name !== undefined) safeUpdateData.name = userData.name;
    if (userData.organizationName !== undefined) safeUpdateData.organizationName = userData.organizationName;
    if (userData.industry !== undefined) safeUpdateData.industry = userData.industry;
    if (userData.password !== undefined) safeUpdateData.password = userData.password;
    
    const [updatedUser] = await db
      .update(users)
      .set(safeUpdateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return updatedUser;
  }

  async updateUserPlan(userId: number, plan: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ plan })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return updatedUser;
  }

  async updateUserStripeInfo(
    userId: number, 
    stripeInfo: { customerId: string | null, subscriptionId: string | null, paymentDate?: Date }
  ): Promise<User> {
    // Create update object with required fields
    const updateData: any = {};
    
    // Only add fields that are provided and not null
    if (stripeInfo.customerId !== undefined) {
      updateData.stripeCustomerId = stripeInfo.customerId;
    }
    
    if (stripeInfo.subscriptionId !== undefined) {
      updateData.stripeSubscriptionId = stripeInfo.subscriptionId;
    }
    
    // Only update payment date if provided
    if (stripeInfo.paymentDate) {
      updateData.paymentDate = stripeInfo.paymentDate;
    }
    
    // We don't update the plan here - plan changes should only happen via updateUserPlan
    // based on webhook confirmation
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return updatedUser;
  }

  // Form operations
  async getForms(userId: number): Promise<Form[]> {
    return db.select().from(forms).where(eq(forms.userId, userId));
  }

  async getForm(id: number): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form;
  }

  async getFormByUserIdAndId(userId: number, formId: number): Promise<Form | undefined> {
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.userId, userId)));
    return form;
  }

  async createForm(insertForm: InsertForm): Promise<Form> {
    const now = new Date();
    const [form] = await db
      .insert(forms)
      .values({
        ...insertForm,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return form;
  }

  async updateForm(id: number, partialForm: Partial<InsertForm>): Promise<Form> {
    const [updatedForm] = await db
      .update(forms)
      .set({
        ...partialForm,
        updatedAt: new Date()
      })
      .where(eq(forms.id, id))
      .returning();

    if (!updatedForm) {
      throw new Error(`Form with ID ${id} not found`);
    }
    
    return updatedForm;
  }

  async deleteForm(id: number): Promise<boolean> {
    const result = await db.delete(forms).where(eq(forms.id, id));
    return !!result;
  }

  async getFormsCount(userId: number): Promise<number> {
    const result = await db
      .select()
      .from(forms)
      .where(eq(forms.userId, userId));
    
    return result.length;
  }

  // Response operations
  async getResponses(formId: number, limit?: number): Promise<Response[]> {
    const result = await db
      .select()
      .from(responses)
      .where(eq(responses.formId, formId))
      .orderBy(desc(responses.createdAt));
    
    if (limit !== undefined) {
      return result.slice(0, limit);
    }
    
    return result;
  }

  async getResponse(id: number): Promise<Response | undefined> {
    const [response] = await db.select().from(responses).where(eq(responses.id, id));
    return response;
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const [response] = await db
      .insert(responses)
      .values(insertResponse)
      .returning();

    return response;
  }

  async getResponsesCount(formId: number): Promise<number> {
    const result = await db
      .select()
      .from(responses)
      .where(eq(responses.formId, formId));
    
    return result.length;
  }

  // Support enquiry operations
  async getSupportEnquiries(userId?: number): Promise<SupportEnquiry[]> {
    if (userId) {
      return db
        .select()
        .from(supportEnquiries)
        .where(eq(supportEnquiries.userId, userId))
        .orderBy(desc(supportEnquiries.createdAt));
    } else {
      return db
        .select()
        .from(supportEnquiries)
        .orderBy(desc(supportEnquiries.createdAt));
    }
  }

  async getSupportEnquiry(id: number): Promise<SupportEnquiry | undefined> {
    const [enquiry] = await db
      .select()
      .from(supportEnquiries)
      .where(eq(supportEnquiries.id, id));
    return enquiry;
  }

  async createSupportEnquiry(insertEnquiry: InsertSupportEnquiry): Promise<SupportEnquiry> {
    const [enquiry] = await db
      .insert(supportEnquiries)
      .values(insertEnquiry)
      .returning();
    
    return enquiry;
  }

  async updateSupportEnquiryStatus(id: number, status: string): Promise<SupportEnquiry> {
    const [updatedEnquiry] = await db
      .update(supportEnquiries)
      .set({ status })
      .where(eq(supportEnquiries.id, id))
      .returning();
    
    if (!updatedEnquiry) {
      throw new Error(`Support enquiry with ID ${id} not found`);
    }
    
    return updatedEnquiry;
  }
}

export const storage = new DatabaseStorage();
