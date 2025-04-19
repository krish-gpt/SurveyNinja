import { Form as FormType, FormElement } from "@shared/schema";

/**
 * Extends the basic Form type to include the elements array
 * Used across multiple components when displaying form details
 */
export interface DetailedForm extends FormType {
  elements: FormElement[];
}

/**
 * Summary of a form used in list views
 */
export interface FormSummary {
  id: number;
  title: string;
  description?: string;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
  lastResponseDate?: string;
}

/**
 * Form response data structure
 */
export interface ResponseData {
  id: number;
  createdAt: string;
  data: Record<string, any>;
  [key: string]: any;
}

/**
 * User statistics data structure
 */
export interface UserStats {
  formCount: number;
  maxForms: number;
  totalResponses: number;
  maxResponses: number;
}
