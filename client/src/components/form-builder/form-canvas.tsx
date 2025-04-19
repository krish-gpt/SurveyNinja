import { useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { FormElement } from "@shared/schema";
import { nanoid } from "nanoid";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, MoreVertical } from "lucide-react";
import { FormElements } from "./form-elements";

interface FormCanvasProps {
  formTitle: string;
  formDescription: string;
  elements: FormElement[];
  onUpdateTitle: (title: string) => void;
  onUpdateDescription: (description: string) => void;
  onAddElement: (element: FormElement) => void;
  onUpdateElement: (elementId: string, element: FormElement) => void;
  onDuplicateElement: (elementId: string) => void;
  onRemoveElement: (elementId: string) => void;
  onSelectElement: (element: FormElement | null) => void;
  selectedElementId: string | null;
}

export default function FormCanvas({
  formTitle,
  formDescription,
  elements,
  onUpdateTitle,
  onUpdateDescription,
  onAddElement,
  onUpdateElement,
  onDuplicateElement,
  onRemoveElement,
  onSelectElement,
  selectedElementId,
}: FormCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: "droppable-area" });

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (over && over.id === "droppable-area" && active.data?.current?.type) {
      // Create new element when dropping from sidebar
      const elementType = active.data.current.type;
      const newElement: FormElement = {
        id: nanoid(),
        type: elementType,
        label: `New ${elementType} question`,
        required: false,
        options: ["multiple-choice", "checkbox", "dropdown"].includes(elementType) ? ["Option 1", "Option 2", "Option 3"] : undefined,
        properties: {},
      };
      
      onAddElement(newElement);
    }
    
    setActiveId(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      {/* Form header with saving options */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              value={formTitle}
              onChange={(e) => onUpdateTitle(e.target.value)}
              className="border-0 focus:ring-0 text-xl font-semibold text-gray-900 w-full focus:outline-none"
              placeholder="Form Title"
            />
          </div>
        </div>
      </div>

      {/* Form content area */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div 
          className="flex-1 p-6 space-y-6" 
          ref={setDroppableNodeRef}
        >
          {/* Form header section */}
          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-primary-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <Input
                  type="text"
                  value={formTitle}
                  onChange={(e) => onUpdateTitle(e.target.value)}
                  className="border-0 focus:ring-0 text-xl font-semibold text-gray-900 w-full focus:outline-none"
                  placeholder="Form Title"
                />
                <Textarea
                  value={formDescription}
                  onChange={(e) => onUpdateDescription(e.target.value)}
                  className="mt-2 border-0 focus:ring-0 text-sm text-gray-500 w-full focus:outline-none resize-none"
                  placeholder="Form Description"
                />
              </div>
              <div>
                <div className="h-16 w-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 border border-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>

          {/* Form elements */}
          {elements.map((element) => (
            <Card 
              key={element.id}
              className={`bg-white rounded-lg shadow-sm border p-6 ${
                selectedElementId === element.id 
                  ? "border-primary-500 ring-2 ring-primary-500" 
                  : "border-gray-200 hover:border-primary-300"
              }`}
              onClick={() => onSelectElement(element)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={element.label}
                    onChange={(e) => onUpdateElement(element.id, { ...element, label: e.target.value })}
                    className="border-0 focus:ring-0 text-base font-medium text-gray-900 w-full focus:outline-none"
                    placeholder="Question Text"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {element.required ? "Required" : "Optional"}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateElement(element.id);
                    }}
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveElement(element.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>

              <FormElements element={element} />
            </Card>
          ))}

          {/* Drop indicator zone */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <span className="text-gray-500">Drag and drop form elements here</span>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
