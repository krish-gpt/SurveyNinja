import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareFormModalProps {
  formId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareFormModal({ formId, isOpen, onClose }: ShareFormModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  
  // Get form details
  const { data: form } = useQuery({
    queryKey: [`/api/forms/${formId}`],
    enabled: isOpen && !!formId,
  });
  
  useEffect(() => {
    if (isOpen && formId) {
      const baseUrl = window.location.origin;
      setFormUrl(`${baseUrl}/form/${formId}`);
    }
  }, [isOpen, formId]);
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "The form link has been copied to your clipboard",
      });
      
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to clipboard",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Share Your Form
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can view and submit responses to your form
            {form?.title && (
              <span className="block font-medium text-primary mt-1">
                "{form.title}"
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mt-2">
          <div className="grid flex-1 gap-2">
            <Input
              value={formUrl}
              readOnly
              className="w-full"
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
          <Button type="button" size="icon" onClick={handleCopyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
