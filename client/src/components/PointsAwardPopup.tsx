import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PointsAwardPopupProps {
  points: number;
  reason: string;
  open: boolean;
  onClose: () => void;
}

const reasonLabels: Record<string, { title: string; description: string }> = {
  signup_bonus: {
    title: "Welcome to Collaboom!",
    description: "You've earned a signup bonus for joining our community!",
  },
  address_completion: {
    title: "Profile Complete!",
    description: "You've earned points for completing your shipping address!",
  },
  upload_verified: {
    title: "Content Verified!",
    description: "Your content has been approved and you've earned reward points!",
  },
  admin_adjustment: {
    title: "Points Awarded!",
    description: "The admin has awarded you bonus points!",
  },
  default: {
    title: "Points Earned!",
    description: "You've earned points!",
  },
};

export function PointsAwardPopup({ points, reason, open, onClose }: PointsAwardPopupProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const labels = reasonLabels[reason] || reasonLabels.default;
  const isPositive = points > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-md text-center"
        data-testid="dialog-points-award"
      >
        <DialogHeader className="items-center">
          <div className="relative mb-4">
            <AnimatePresence>
              {showConfetti && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        opacity: 1, 
                        scale: 0,
                        x: 0,
                        y: 0,
                      }}
                      animate={{ 
                        opacity: 0, 
                        scale: 1,
                        x: Math.cos(i * 30 * Math.PI / 180) * 80,
                        y: Math.sin(i * 30 * Math.PI / 180) * 80,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>
            
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg"
            >
              {isPositive ? (
                <Trophy className="h-10 w-10 text-white" />
              ) : (
                <Star className="h-10 w-10 text-white" />
              )}
            </motion.div>
          </div>
          
          <DialogTitle className="text-2xl font-bold" data-testid="text-points-title">
            {labels.title}
          </DialogTitle>
          <DialogDescription className="text-base" data-testid="text-points-description">
            {labels.description}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="my-6"
        >
          <div 
            className={`text-5xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}
            data-testid="text-points-amount"
          >
            {isPositive ? '+' : ''}{points}
          </div>
          <div className="text-lg text-muted-foreground mt-1">points</div>
        </motion.div>

        <Button 
          onClick={onClose} 
          className="w-full"
          size="lg"
          data-testid="button-points-continue"
        >
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function usePointsPopup() {
  const [popupData, setPopupData] = useState<{
    points: number;
    reason: string;
  } | null>(null);

  const showPointsPopup = (points: number, reason: string) => {
    if (points === 0) return;
    setPopupData({ points, reason });
  };

  const closePopup = () => {
    setPopupData(null);
  };

  return {
    popupData,
    showPointsPopup,
    closePopup,
    isOpen: popupData !== null,
  };
}
