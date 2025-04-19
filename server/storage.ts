import { forms, users, responses, type User, type InsertUser, type Form, type InsertForm, type Response, type InsertResponse } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private forms: Map<number, Form>;
  private responses: Map<number, Response>;
  private currentUserId: number;
  private currentFormId: number;
  private currentResponseId: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.forms = new Map();
    this.responses = new Map();
    this.currentUserId = 1;
    this.currentFormId = 1;
    this.currentResponseId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      plan: "free", 
      stripeCustomerId: null, 
      stripeSubscriptionId: null, 
      paymentDate: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPlan(userId: number, plan: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const updatedUser = { ...user, plan };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(
    userId: number, 
    stripeInfo: { customerId: string, subscriptionId: string, paymentDate?: Date }
  ): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const updatedUser = { 
      ...user, 
      stripeCustomerId: stripeInfo.customerId,
      stripeSubscriptionId: stripeInfo.subscriptionId,
      paymentDate: stripeInfo.paymentDate || new Date(),
      plan: "paid"
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Form operations
  async getForms(userId: number): Promise<Form[]> {
    return Array.from(this.forms.values()).filter(
      (form) => form.userId === userId,
    );
  }

  async getForm(id: number): Promise<Form | undefined> {
    return this.forms.get(id);
  }

  async getFormByUserIdAndId(userId: number, formId: number): Promise<Form | undefined> {
    const form = await this.getForm(formId);
    if (form && form.userId === userId) {
      return form;
    }
    return undefined;
  }

  async createForm(insertForm: InsertForm): Promise<Form> {
    const id = this.currentFormId++;
    const now = new Date();
    const form: Form = { 
      ...insertForm, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.forms.set(id, form);
    return form;
  }

  async updateForm(id: number, partialForm: Partial<InsertForm>): Promise<Form> {
    const form = await this.getForm(id);
    if (!form) {
      throw new Error(`Form with ID ${id} not found`);
    }
    
    const updatedForm = { 
      ...form, 
      ...partialForm,
      updatedAt: new Date()
    };
    this.forms.set(id, updatedForm);
    return updatedForm;
  }

  async deleteForm(id: number): Promise<boolean> {
    return this.forms.delete(id);
  }

  async getFormsCount(userId: number): Promise<number> {
    return (await this.getForms(userId)).length;
  }

  // Response operations
  async getResponses(formId: number, limit?: number): Promise<Response[]> {
    const formResponses = Array.from(this.responses.values())
      .filter((response) => response.formId === formId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (limit !== undefined) {
      return formResponses.slice(0, limit);
    }
    
    return formResponses;
  }

  async getResponse(id: number): Promise<Response | undefined> {
    return this.responses.get(id);
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const id = this.currentResponseId++;
    const now = new Date();
    const response: Response = { 
      ...insertResponse, 
      id, 
      createdAt: now 
    };
    this.responses.set(id, response);
    return response;
  }

  async getResponsesCount(formId: number): Promise<number> {
    return (await this.getResponses(formId)).length;
  }
}

export const storage = new MemStorage();
