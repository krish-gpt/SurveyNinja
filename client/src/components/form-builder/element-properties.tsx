import { useEffect } from "react";
import { FormElement } from "@shared/schema";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface ElementPropertiesProps {
  selectedElement: FormElement | null;
  onUpdateElement: (updatedElement: FormElement) => void;
}

export default function ElementProperties({ selectedElement, onUpdateElement }: ElementPropertiesProps) {
  const { register, setValue, watch, handleSubmit, reset } = useForm();
  
  // Reset form when selected element changes
  useEffect(() => {
    if (selectedElement) {
      reset({
        label: selectedElement.label,
        required: selectedElement.required,
        options: selectedElement.options,
        properties: selectedElement.properties,
      });
    }
  }, [selectedElement, reset]);
  
  // Watch form values
  const watchedValues = watch();
  
  // Handle form submit
  const onSubmit = (data: any) => {
    if (!selectedElement) return;
    
    const updatedElement: FormElement = {
      ...selectedElement,
      label: data.label,
      required: data.required,
      options: data.options,
      properties: data.properties,
    };
    
    onUpdateElement(updatedElement);
  };
  
  // Handle options management for multiple choice, checkbox, and dropdown
  const addOption = () => {
    if (!selectedElement) return;
    
    const currentOptions = watchedValues.options || [];
    setValue("options", [...currentOptions, "New Option"]);
  };
  
  const updateOption = (index: number, value: string) => {
    if (!selectedElement) return;
    
    const newOptions = [...(watchedValues.options || [])];
    newOptions[index] = value;
    setValue("options", newOptions);
  };
  
  const removeOption = (index: number) => {
    if (!selectedElement) return;
    
    const newOptions = [...(watchedValues.options || [])];
    newOptions.splice(index, 1);
    setValue("options", newOptions);
  };
  
  if (!selectedElement) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
        <p className="text-gray-500 text-center my-8">
          Select an element to edit its properties
        </p>
      </div>
    );
  }
  
  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Properties</h2>
        <p className="text-sm text-gray-500">Configure the selected element</p>
      </div>
      
      <form onChange={handleSubmit(onSubmit)} className="p-4 space-y-6">
        {/* Common properties for all elements */}
        <div>
          <Label htmlFor="element-label">Question Text</Label>
          <div className="mt-1">
            <Input
              id="element-label"
              {...register("label")}
              placeholder="Enter question text"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="element-description">Help Text (Optional)</Label>
          <div className="mt-1">
            <Input
              id="element-description"
              {...register("properties.helpText")}
              placeholder="Enter additional instructions"
            />
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="element-required">Required</Label>
            <div className="mt-1">
              <Switch
                id="element-required"
                checked={watchedValues.required}
                onCheckedChange={(checked) => setValue("required", checked)}
              />
            </div>
          </div>
        </div>
        
        {/* Element-specific properties */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Display Options</h3>
          
          {/* Multiple choice, checkbox, or dropdown options */}
          {["multiple-choice", "checkbox", "dropdown"].includes(selectedElement.type) && (
            <div className="space-y-3">
              <Label>Options</Label>
              {(watchedValues.options || []).map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          )}
          
          {/* Rating options */}
          {selectedElement.type === "rating" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="element-size">Size</Label>
                <Select
                  value={watchedValues.properties?.size || "medium"}
                  onValueChange={(value) => setValue("properties.size", value)}
                >
                  <SelectTrigger id="element-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="element-style">Style</Label>
                <Select
                  value={watchedValues.properties?.style || "star"}
                  onValueChange={(value) => setValue("properties.style", value)}
                >
                  <SelectTrigger id="element-style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="star">Star Rating</SelectItem>
                    <SelectItem value="number">Number Rating</SelectItem>
                    <SelectItem value="emoji">Emoji Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="element-max">Maximum Rating</Label>
                <Select
                  value={watchedValues.properties?.maxRating?.toString() || "5"}
                  onValueChange={(value) => setValue("properties.maxRating", parseInt(value))}
                >
                  <SelectTrigger id="element-max">
                    <SelectValue placeholder="Select maximum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
