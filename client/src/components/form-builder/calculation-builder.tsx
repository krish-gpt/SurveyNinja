import { useState, useEffect } from "react";
import { FormElement } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calculator } from "lucide-react";

type CalculationFormat = "number" | "currency" | "percentage";

interface Calculation {
  formula: string;
  format: CalculationFormat;
  precision: number;
}

interface CalculationBuilderProps {
  selectedElement: FormElement;
  formElements: FormElement[];
  onUpdateCalculation: (calculation: Calculation) => void;
}

export default function CalculationBuilder({
  selectedElement,
  formElements,
  onUpdateCalculation,
}: CalculationBuilderProps) {
  // Filter available elements - only include elements that come before this one
  const availableElements = formElements.filter(
    (el) => el.id !== selectedElement.id && 
    // Only show numeric input elements (short-text with number type or rating)
    (el.type === "short-text" || el.type === "rating") &&
    // Only allow elements added before this one
    formElements.findIndex(item => item.id === el.id) < formElements.findIndex(item => item.id === selectedElement.id)
  );
  
  // Initialize calculation state
  const [formula, setFormula] = useState(selectedElement.calculation?.formula || "");
  const [format, setFormat] = useState<"number" | "currency" | "percentage">(
    (selectedElement.calculation?.format as "number" | "currency" | "percentage") || "number"
  );
  const [precision, setPrecision] = useState(selectedElement.calculation?.precision?.toString() || "2");
  
  // Update calculation
  const updateCalculation = () => {
    onUpdateCalculation({
      formula,
      format,
      precision: parseInt(precision),
    });
  };
  
  // Update formula when elements are inserted
  const insertElement = (elementId: string) => {
    const updatedFormula = formula + `{${elementId}}`;
    setFormula(updatedFormula);
    onUpdateCalculation({
      formula: updatedFormula,
      format,
      precision: parseInt(precision),
    });
  };
  
  // Insert operator
  const insertOperator = (operator: string) => {
    const updatedFormula = formula + ` ${operator} `;
    setFormula(updatedFormula);
    onUpdateCalculation({
      formula: updatedFormula,
      format,
      precision: parseInt(precision),
    });
  };
  
  // Update calculation when other properties change
  useEffect(() => {
    if (selectedElement.type === 'calculation') {
      updateCalculation();
    }
  }, [format, precision]);
  
  // If the element type is not calculation, don't show this component
  if (selectedElement.type !== 'calculation') {
    return null;
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Formula</Label>
        <div className="flex items-center space-x-2">
          <Textarea
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onBlur={updateCalculation}
            placeholder="Create a formula using fields and operators"
            className="min-h-[80px]"
          />
        </div>
        
        <p className="text-xs text-gray-500 mt-1">
          Use {"{field_id}"} to reference other fields. Combine with operators like +, -, *, /.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>Insert Field</Label>
        <div className="grid grid-cols-2 gap-2">
          {availableElements.map((element) => (
            <Button
              key={element.id}
              variant="outline"
              size="sm"
              onClick={() => insertElement(element.id)}
              className="justify-start overflow-hidden"
            >
              <span className="truncate">{element.label || `Field ${element.id}`}</span>
            </Button>
          ))}
          
          {availableElements.length === 0 && (
            <p className="text-sm text-gray-500 col-span-2">
              No eligible fields available. Add numeric fields to use in calculations.
            </p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Insert Operator</Label>
        <div className="flex space-x-2">
          {["+", "-", "*", "/", "(", ")", "."].map((op) => (
            <Button
              key={op}
              variant="outline"
              size="sm"
              onClick={() => insertOperator(op)}
            >
              {op}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Format</Label>
        <Select
          value={format}
          onValueChange={(value) => setFormat(value as "number" | "currency" | "percentage")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="currency">Currency ($)</SelectItem>
            <SelectItem value="percentage">Percentage (%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Decimal Precision</Label>
        <Select
          value={precision}
          onValueChange={(value) => setPrecision(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select precision" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0 (Whole numbers)</SelectItem>
            <SelectItem value="1">1 decimal place</SelectItem>
            <SelectItem value="2">2 decimal places</SelectItem>
            <SelectItem value="3">3 decimal places</SelectItem>
            <SelectItem value="4">4 decimal places</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <Label className="mb-2 block">Preview:</Label>
        <div className="p-2 border rounded bg-white">
          <p className="font-mono text-sm">
            {formula || "No formula specified"}
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          The calculated value will be displayed when the form is filled out.
        </p>
      </div>
    </div>
  );
}