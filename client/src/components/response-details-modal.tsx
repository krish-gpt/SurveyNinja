import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormElement } from "@shared/schema";
import { ClipboardCopy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DetailedForm, ResponseData } from "@/types/form-types";

interface ResponseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: ResponseData | null;
  form: DetailedForm | null | any;
}

export default function ResponseDetailsModal({ 
  isOpen, 
  onClose, 
  response, 
  form
}: ResponseDetailsModalProps) {
  const { toast } = useToast();
  
  if (!response || !form) {
    return null;
  }
  
  const handleCopyToClipboard = () => {
    // Format data for clipboard
    const formattedData = form.elements.map((element: FormElement) => {
      const value = response.data[element.id];
      const displayValue = Array.isArray(value) 
        ? value.join(", ") 
        : (value === undefined || value === null) 
          ? "Not answered" 
          : String(value);
          
      return `${element.label}: ${displayValue}`;
    }).join("\n");
    
    // Copy to clipboard
    navigator.clipboard.writeText(formattedData).then(() => {
      toast({
        title: "Copied!",
        description: "Response details copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    });
  };
  
  // Format date for display
  const submissionDate = new Date(response.createdAt).toLocaleString();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Response Details</DialogTitle>
          <DialogDescription>
            Submitted on {submissionDate}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto">
          {form.elements.map((element: FormElement) => {
            const value = response.data[element.id];
            const displayValue = Array.isArray(value) 
              ? value.join(", ") 
              : (value === undefined || value === null) 
                ? "Not answered" 
                : String(value);
            
            return (
              <div key={element.id} className="border-b pb-3 last:border-0">
                <h4 className="text-sm font-medium text-gray-700">{element.label}</h4>
                <p className="mt-1 text-gray-900">{displayValue}</p>
              </div>
            );
          })}
        </div>
        
        <DialogFooter className="flex justify-between items-center gap-4">
          <Button 
            variant="outline" 
            type="button" 
            onClick={handleCopyToClipboard}
            className="mr-auto"
          >
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
          <Button 
            type="button" 
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}