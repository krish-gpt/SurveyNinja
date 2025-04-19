import { forms, users, responses, type User, type InsertUser, type Form, type InsertForm, type Response, type InsertResponse } from "@shared/schema";
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
  createUser(user: InsertUser): Promise<User>;
  updateUserPlan(userId: number, plan: string): Promise<User>;
  updateUserStripeInfo(userId: number, stripeInfo: { customerId: string, subscriptionId: string, paymentDate?: Date }): Promise<User>;
  
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
    stripeInfo: { customerId: string, subscriptionId: string, paymentDate?: Date }
  ): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        stripeCustomerId: stripeInfo.customerId,
        stripeSubscriptionId: stripeInfo.subscriptionId,
        paymentDate: stripeInfo.paymentDate || new Date(),
        plan: "paid"
      })
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
    let query = db
      .select()
      .from(responses)
      .where(eq(responses.formId, formId))
      .orderBy(desc(responses.createdAt));
    
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    
    return query;
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
}

export const storage = new DatabaseStorage();
