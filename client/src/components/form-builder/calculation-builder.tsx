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

// Define the calculation type for better TypeScript safety
type CalculationFormat = "number" | "currency" | "percentage";

type Calculation = {
  formula: string;
  format: CalculationFormat;
  precision: number;
};

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
  const [format, setFormat] = useState<CalculationFormat>(
    (selectedElement.calculation?.format as CalculationFormat) || "number"
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
            className="min-h-[80px] font-mono"
          />
        </div>
        
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">
            Use <code className="px-1 py-0.5 bg-gray-100 rounded font-mono">{"{field_id}"}</code> to reference other fields. The field ID is shown with each field in the list below.
          </p>
          <p className="text-xs text-gray-500">
            Example: <code className="px-1 py-0.5 bg-gray-100 rounded font-mono">{"{field_1}"} + {"{field_2}"} * 2</code>
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Available Fields</Label>
          <p className="text-xs text-gray-500">Click a field to insert it</p>
        </div>
        
        <div className="border rounded-md bg-gray-50 p-3">
          {availableElements.length > 0 ? (
            <div className="space-y-2">
              {availableElements.map((element) => (
                <Card key={element.id} className="overflow-hidden">
                  <CardContent className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm truncate">
                        {element.label || `Unnamed Field`}
                      </p>
                      <div className="flex items-center mt-1">
                        <Badge variant="outline" className="text-xs font-mono bg-slate-100">
                          ID: {element.id}
                        </Badge>
                        <span className="text-xs text-gray-500 ml-2">
                          {element.type === "rating" ? "Rating" : "Number field"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => insertElement(element.id)}
                      className="h-8"
                    >
                      Insert <code className="ml-1 text-xs">{"{" + element.id + "}"}</code>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calculator className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                No eligible fields available. Add numeric fields to use in calculations.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Only number fields or ratings that come before this calculation field can be used.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Operators</Label>
          <p className="text-xs text-gray-500">Click to insert</p>
        </div>
        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              {["+", "-", "*", "/", "(", ")", ".", "="].map((op) => (
                <Button
                  key={op}
                  variant="outline"
                  size="sm"
                  onClick={() => insertOperator(op)}
                  className="h-9 w-9 p-0 font-mono text-lg"
                >
                  {op}
                </Button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                <span className="font-semibold">Operator guide:</span> 
                <span className="ml-1">+ (add), - (subtract), * (multiply), / (divide)</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="space-y-2">
          <Label>Display Format</Label>
          <Select
            value={format}
            onValueChange={(value: CalculationFormat) => setFormat(value)}
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
            onValueChange={(value: string) => setPrecision(value)}
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
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Formula Preview</Label>
          <Badge variant="outline" className="text-xs bg-white">Result will show in form view</Badge>
        </div>
        <div className="p-3 border rounded-md bg-white font-mono">
          {formula ? (
            <p className="break-all">{formula}</p>
          ) : (
            <p className="text-gray-400 italic">No formula specified yet</p>
          )}
        </div>
        <div className="mt-3 flex items-start">
          <div className="p-1 rounded-md bg-amber-100 mr-2 mt-0.5">
            <Calculator className="h-4 w-4 text-amber-700" />
          </div>
          <p className="text-xs text-gray-600">
            This calculation will be performed when the form is filled out, using the values entered by the user.
          </p>
        </div>
      </div>
    </div>
  );
}