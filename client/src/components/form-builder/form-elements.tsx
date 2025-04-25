import { FormElement } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Star, Calendar, Upload, Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FormElementsProps {
  element: FormElement;
}

export function FormElements({ element }: FormElementsProps) {
  const formatCalculationValue = (value: number, format: string, precision: number) => {
    if (format === "currency") {
      return `$${value.toFixed(precision)}`;
    } else if (format === "percentage") {
      return `${value.toFixed(precision)}%`;
    } else {
      return value.toFixed(precision);
    }
  };
  
  switch (element.type) {
    case "short-text":
      return (
        <div className="space-y-2 mt-4">
          <Input type="text" placeholder="Short text answer" disabled />
        </div>
      );

    case "long-text":
      return (
        <div className="space-y-2 mt-4">
          <Textarea placeholder="Long text answer" disabled />
        </div>
      );

    case "multiple-choice":
      return (
        <div className="space-y-2 mt-4">
          <RadioGroup disabled>
            {element.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`radio-${element.id}-${index}`} />
                <Label htmlFor={`radio-${element.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );

    case "checkbox":
      return (
        <div className="space-y-2 mt-4">
          {element.options?.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox id={`checkbox-${element.id}-${index}`} disabled />
              <Label htmlFor={`checkbox-${element.id}-${index}`}>{option}</Label>
            </div>
          ))}
        </div>
      );

    case "dropdown":
      return (
        <div className="space-y-2 mt-4">
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {element.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "rating":
      const maxRating = element.properties?.maxRating || 5;
      return (
        <div className="space-y-2 mt-4">
          <div className="flex items-center space-x-2">
            {Array.from({ length: maxRating }, (_, i) => (
              <Star 
                key={i}
                className={i < 3 ? "text-yellow-400" : "text-gray-300"}
                fill={i < 3 ? "currentColor" : "none"}
              />
            ))}
          </div>
        </div>
      );

    case "date":
      return (
        <div className="space-y-2 mt-4">
          <div className="relative">
            <Input type="date" disabled />
            <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      );

    case "file-upload":
      return (
        <div className="space-y-2 mt-4">
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              Drag and drop files here, or click to select files
            </p>
          </div>
        </div>
      );
      
    case "calculation":
      const formula = element.calculation?.formula || "";
      const format = element.calculation?.format || "number";
      const precision = element.calculation?.precision || 2;
      const sampleValue = 123.45; // Sample value for preview
      
      return (
        <div className="space-y-2 mt-4">
          <Card className="p-4 border border-gray-200 bg-gray-50">
            <div className="flex items-center mb-2">
              <Calculator className="h-5 w-5 text-gray-500 mr-2" />
              <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                Calculation
              </Badge>
            </div>
            <div className="font-mono text-sm p-2 bg-white border rounded mb-2">
              <code>{formula || "No formula specified"}</code>
            </div>
            <div className="text-xl font-medium text-right">
              {formatCalculationValue(sampleValue, format, precision)}
              <span className="text-xs text-gray-500 ml-1">(Preview)</span>
            </div>
          </Card>
        </div>
      );

    default:
      return null;
  }
}

// Determine if an element should be conditionally shown
export function shouldShowElement(
  element: FormElement,
  formData: Record<string, any> = {}
): boolean {
  // If no conditions, always show the element
  if (!element.conditions || element.conditions.length === 0) {
    return true;
  }
  
  const { conditions, conditionLogic = "AND" } = element;
  
  // Check each condition
  const results = conditions.map(condition => {
    const { sourceElementId, operator, value, action } = condition;
    const fieldValue = formData[sourceElementId];
    
    let conditionMet = false;
    
    switch (operator) {
      case "equals":
        conditionMet = fieldValue === value;
        break;
      case "not_equals":
        conditionMet = fieldValue !== value;
        break;
      case "greater_than":
        conditionMet = Number(fieldValue) > Number(value);
        break;
      case "less_than":
        conditionMet = Number(fieldValue) < Number(value);
        break;
      case "is_empty":
        conditionMet = fieldValue === undefined || 
                       fieldValue === null || 
                       fieldValue === "" || 
                       (Array.isArray(fieldValue) && fieldValue.length === 0);
        break;
      case "is_filled":
        conditionMet = fieldValue !== undefined && 
                       fieldValue !== null && 
                       fieldValue !== "" && 
                       !(Array.isArray(fieldValue) && fieldValue.length === 0);
        break;
      default:
        conditionMet = false;
    }
    
    // Return true if the condition indicates the element should be shown
    return action === "show" ? conditionMet : !conditionMet;
  });
  
  // Apply the logic (AND or OR)
  if (conditionLogic === "AND") {
    return results.every(result => result === true);
  } else {
    return results.some(result => result === true);
  }
}

// Function to evaluate a calculation formula
export function evaluateFormula(
  formula: string,
  formData: Record<string, any> = {}
): number {
  if (!formula) return 0;
  
  // Replace {fieldId} with actual values from formData
  let processedFormula = formula;
  const fieldMatches = formula.match(/\{([^}]+)\}/g) || [];
  
  fieldMatches.forEach(match => {
    const fieldId = match.replace(/\{|\}/g, '');
    const fieldValue = formData[fieldId] || 0;
    processedFormula = processedFormula.replace(match, fieldValue);
  });
  
  try {
    // Use Function to safely evaluate the math expression
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${processedFormula})`)();
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch (error) {
    console.error("Error evaluating formula:", error);
    return 0;
  }
}
