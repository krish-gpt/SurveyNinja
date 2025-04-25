import { formElementTypes } from "@shared/schema";
import { 
  Type, 
  AlignLeft, 
  CheckCircle, 
  CheckSquare, 
  ChevronsDown, 
  Star, 
  Calendar, 
  FileUp,
  Calculator 
} from "lucide-react";

interface ElementSidebarProps {
  onDragStart: (event: React.DragEvent, elementType: string) => void;
}

// Map element types to icons
const elementIcons = {
  "short-text": <Type />,
  "long-text": <AlignLeft />,
  "multiple-choice": <CheckCircle />,
  "checkbox": <CheckSquare />,
  "dropdown": <ChevronsDown />,
  "rating": <Star />,
  "date": <Calendar />,
  "file-upload": <FileUp />,
  "calculation": <Calculator />,
};

// Map element types to display names
const elementNames = {
  "short-text": "Short Text",
  "long-text": "Long Text",
  "multiple-choice": "Multiple Choice",
  "checkbox": "Checkboxes",
  "dropdown": "Dropdown",
  "rating": "Rating",
  "date": "Date",
  "file-upload": "File Upload",
  "calculation": "Calculation",
};

export default function ElementSidebar({ onDragStart }: ElementSidebarProps) {
  return (
    <div className="w-64 bg-gray-100 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-medium text-gray-900">Form Elements</h2>
        <p className="text-sm text-gray-500">Drag and drop elements</p>
      </div>
      <div className="px-3 py-2">
        <div className="space-y-2">
          {formElementTypes.map((elementType) => (
            <div
              key={elementType}
              className="p-3 bg-white rounded-md shadow-sm border border-gray-200 cursor-grab hover:border-primary transition-colors"
              draggable={true}
              onDragStart={(e) => onDragStart(e, elementType)}
              data-element-type={elementType}
            >
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-md bg-primary-100 flex items-center justify-center text-primary">
                  {elementIcons[elementType]}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{elementNames[elementType]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
