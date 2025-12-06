import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Send, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SuspensionAppealDialogProps {
  open: boolean;
  onClose: () => void;
  influencerName: string;
}

export function SuspensionAppealDialog({
  open,
  onClose,
  influencerName,
}: SuspensionAppealDialogProps) {
  const [appealMessage, setAppealMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setAppealMessage("");
      setHasSubmitted(false);
    }
  }, [open]);

  const submitAppealMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/suspension-appeal", { message });
      return res.json();
    },
    onSuccess: () => {
      setHasSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); // Refresh user data with updated appealSubmitted
      toast({
        title: "Appeal submitted",
        description: "We will review your appeal and get back to you soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit appeal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (appealMessage.trim()) {
      submitAppealMutation.mutate(appealMessage.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
          </div>
          <DialogTitle className="text-xl">Account Suspended</DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              Hi {influencerName || "there"}, your Collaboom account has been suspended due to a
              violation of our community guidelines or suspicious activity.
            </p>
            <p>
              While suspended, you cannot apply to any campaigns or participate in collaborations.
            </p>
            <p className="font-medium text-foreground">
              If you believe this decision was made in error, please submit an appeal below:
            </p>
          </DialogDescription>
        </DialogHeader>

        {!hasSubmitted ? (
          <>
            <div className="py-2">
              <Textarea
                placeholder="Explain why you believe this suspension is a mistake..."
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                rows={4}
                className="resize-none"
                data-testid="textarea-appeal-message"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Your appeal will be reviewed by our team and you will receive a response via email.
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
                data-testid="button-close-suspension-dialog"
              >
                Close
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!appealMessage.trim() || submitAppealMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-submit-appeal"
              >
                {submitAppealMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Appeal
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <Send className="h-6 w-6 text-green-500" />
            </div>
            <p className="font-medium text-green-600 mb-2">Appeal Submitted Successfully</p>
            <p className="text-sm text-muted-foreground mb-4">
              We will review your appeal and respond via email.
            </p>
            <Button onClick={onClose} data-testid="button-close-after-appeal">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
