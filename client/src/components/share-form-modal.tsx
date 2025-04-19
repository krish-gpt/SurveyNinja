import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, Twitter, Facebook, Linkedin, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ShareFormModalProps {
  formId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareFormModal({ formId, isOpen, onClose }: ShareFormModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const formUrl = `${window.location.origin}/form/${formId}`;

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Form link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareOnSocialMedia = (platform: string) => {
    let shareUrl = "";
    const text = "Check out this form I created!";
    
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(formUrl)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(formUrl)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(formUrl)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(formUrl)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share form</DialogTitle>
          <DialogDescription>
            Share this form with others by copying the link or sharing on social media.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 mt-4">
          <div className="grid flex-1 gap-2">
            <Input
              value={formUrl}
              readOnly
              className="w-full"
            />
          </div>
          <Button size="icon" variant="outline" onClick={copyToClipboard}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="flex justify-center space-x-4 mt-4">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full"
            onClick={() => shareOnSocialMedia("twitter")}
          >
            <Twitter className="h-5 w-5 text-blue-400" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full"
            onClick={() => shareOnSocialMedia("facebook")}
          >
            <Facebook className="h-5 w-5 text-blue-600" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full"
            onClick={() => shareOnSocialMedia("linkedin")}
          >
            <Linkedin className="h-5 w-5 text-blue-700" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full"
            onClick={() => shareOnSocialMedia("email")}
          >
            <Mail className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
        
        <DialogFooter className="sm:justify-start mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}