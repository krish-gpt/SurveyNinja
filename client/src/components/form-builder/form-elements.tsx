import { FormElement } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Star, Calendar, Upload } from "lucide-react";

interface FormElementsProps {
  element: FormElement;
}

export function FormElements({ element }: FormElementsProps) {
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

    default:
      return null;
  }
}
