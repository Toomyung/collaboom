import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BlockedUserDialogProps {
  open: boolean;
  influencerName: string;
}

export function BlockedUserDialog({
  open,
  influencerName,
}: BlockedUserDialogProps) {
  const { logout } = useAuth();

  const handleConfirm = () => {
    logout();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <ShieldX className="h-6 w-6 text-red-500" />
            </div>
          </div>
          <DialogTitle className="text-xl text-red-600">Account Blocked</DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              Hi {influencerName || "there"}, your Collaboom account has been permanently blocked
              due to serious violations of our community guidelines.
            </p>
            <p>
              You are no longer able to use this platform or participate in any campaigns.
            </p>
            <p className="font-medium text-foreground">
              If you believe this decision was made in error, please contact us at{" "}
              <a 
                href="mailto:support@collaboom.io" 
                className="text-primary underline"
              >
                support@collaboom.io
              </a>
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            onClick={handleConfirm}
            className="w-full"
            data-testid="button-confirm-blocked"
          >
            I understand & Log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
