import { useState } from "react";
import { FormElement, conditionOperators, conditionActions, conditionLogic } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, X } from "lucide-react";

// Define the condition type based on schema
type Condition = {
  sourceElementId: string;
  operator: typeof conditionOperators[number];
  value?: any;
  action: typeof conditionActions[number];
};

interface ConditionalLogicProps {
  selectedElement: FormElement;
  formElements: FormElement[];
  onUpdateConditions: (conditions: Condition[], logic: typeof conditionLogic[number]) => void;
}

export default function ConditionalLogic({
  selectedElement,
  formElements,
  onUpdateConditions,
}: ConditionalLogicProps) {
  // Filter out the current element and elements that come after it
  const availableElements = formElements.filter(
    (el) => el.id !== selectedElement.id && 
    // Only allow elements added before this one (assumption: elements are ordered by their position in the form)
    formElements.findIndex(item => item.id === el.id) < formElements.findIndex(item => item.id === selectedElement.id)
  );
  
  // Initialize conditions
  const [conditions, setConditions] = useState<Condition[]>(selectedElement.conditions || []);
  const [logic, setLogic] = useState<typeof conditionLogic[number]>(selectedElement.conditionLogic || "AND");
  
  // Add a new condition
  const addCondition = () => {
    if (availableElements.length === 0) return;
    
    const newCondition: Condition = {
      sourceElementId: availableElements[0].id,
      operator: "equals",
      value: "",
      action: "show",
    };
    
    const updatedConditions = [...conditions, newCondition];
    setConditions(updatedConditions);
    onUpdateConditions(updatedConditions, logic);
  };
  
  // Update a condition
  const updateCondition = (index: number, field: string, value: any) => {
    const updatedConditions = [...conditions];
    
    // Special case for operator change - reset value if necessary
    if (field === "operator") {
      const operator = value as typeof conditionOperators[number];
      if (["is_empty", "is_filled"].includes(operator)) {
        updatedConditions[index] = {
          ...updatedConditions[index],
          operator,
          value: undefined
        };
      } else {
        updatedConditions[index] = {
          ...updatedConditions[index],
          operator
        };
      }
    } else if (field === "action") {
      updatedConditions[index] = {
        ...updatedConditions[index],
        action: value as typeof conditionActions[number]
      };
    } else {
      updatedConditions[index] = {
        ...updatedConditions[index],
        [field]: value
      } as Condition;
    }
    
    setConditions(updatedConditions);
    onUpdateConditions(updatedConditions, logic);
  };
  
  // Remove a condition
  const removeCondition = (index: number) => {
    const updatedConditions = [...conditions];
    updatedConditions.splice(index, 1);
    setConditions(updatedConditions);
    onUpdateConditions(updatedConditions, logic);
  };
  
  // Update logic
  const updateLogic = (newLogic: typeof conditionLogic[number]) => {
    setLogic(newLogic);
    onUpdateConditions(conditions, newLogic);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Enable Conditional Logic</Label>
        <Switch
          checked={conditions.length > 0}
          onCheckedChange={(checked) => {
            if (checked && conditions.length === 0) {
              addCondition();
            } else if (!checked) {
              setConditions([]);
              onUpdateConditions([], logic);
            }
          }}
        />
      </div>
      
      {conditions.length > 0 && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-medium">This field will:</Label>
            <RadioGroup
              value={conditions[0]?.action} // Assuming all conditions have the same action
              onValueChange={(value) => {
                const action = value as typeof conditionActions[number];
                const updatedConditions = conditions.map(c => ({ ...c, action }));
                setConditions(updatedConditions);
                onUpdateConditions(updatedConditions, logic);
              }}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="show" id="action-show" />
                <Label htmlFor="action-show">Show</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hide" id="action-hide" />
                <Label htmlFor="action-hide">Hide</Label>
              </div>
            </RadioGroup>
          </div>
          
          {conditions.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Logic Type:</Label>
              <RadioGroup
                value={logic}
                onValueChange={(value) => updateLogic(value as typeof conditionLogic[number])}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="AND" id="logic-and" />
                  <Label htmlFor="logic-and">ALL conditions must be met (AND)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="OR" id="logic-or" />
                  <Label htmlFor="logic-or">ANY condition must be met (OR)</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          <Separator />
          
          <div className="space-y-4">
            <Label className="text-sm font-medium">Conditions:</Label>
            {conditions.map((condition, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div>
                        <Label className="text-xs mb-1 block">Field</Label>
                        <Select
                          value={condition.sourceElementId}
                          onValueChange={(value) => updateCondition(index, "sourceElementId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableElements.map((element) => (
                              <SelectItem key={element.id} value={element.id}>
                                {element.label || `Field ${element.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs mb-1 block">Operator</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(index, "operator", value as typeof conditionOperators[number])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {conditionOperators.map((op) => (
                              <SelectItem key={op} value={op}>
                                {op === "equals" && "Equals"}
                                {op === "not_equals" && "Not Equal To"}
                                {op === "greater_than" && "Greater Than"}
                                {op === "less_than" && "Less Than"}
                                {op === "is_empty" && "Is Empty"}
                                {op === "is_filled" && "Is Filled"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {!["is_empty", "is_filled"].includes(condition.operator) && (
                        <div>
                          <Label className="text-xs mb-1 block">Value</Label>
                          <Input
                            value={condition.value || ""}
                            onChange={(e) => updateCondition(index, "value", e.target.value)}
                            placeholder="Enter value"
                          />
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(index)}
                      className="mt-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCondition}
              disabled={availableElements.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
            
            {availableElements.length === 0 && conditions.length === 0 && (
              <p className="text-sm text-gray-500">
                There are no fields available to create conditions. 
                Add more fields to the form first.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}