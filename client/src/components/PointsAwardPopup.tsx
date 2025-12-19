import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, TrendingUp, CheckCircle2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PointsAwardPopupProps {
  points: number;
  reason: string;
  message?: string | null;
  open: boolean;
  onClose: () => void;
}

const reasonLabels: Record<string, { title: string; description: string; icon: typeof Award }> = {
  signup_bonus: {
    title: "Welcome to Collaboom!",
    description: "You've earned a signup bonus for joining our community!",
    icon: Zap,
  },
  address_completion: {
    title: "Profile Complete!",
    description: "You've earned points for completing your shipping address!",
    icon: CheckCircle2,
  },
  upload_verified: {
    title: "Content Verified!",
    description: "Your content has been approved and you've earned reward points!",
    icon: Award,
  },
  admin_adjustment: {
    title: "Points Awarded!",
    description: "You've received bonus points!",
    icon: TrendingUp,
  },
  default: {
    title: "Points Earned!",
    description: "You've earned points!",
    icon: Award,
  },
};

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    setDisplayValue(0);
    
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(easeOutQuart * value));
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

export function PointsAwardPopup({ points, reason, message, open, onClose }: PointsAwardPopupProps) {
  const [showCounter, setShowCounter] = useState(false);
  
  useEffect(() => {
    if (open) {
      setShowCounter(false);
      const timer = setTimeout(() => setShowCounter(true), 400);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const labels = reasonLabels[reason] || reasonLabels.default;
  const isPositive = points > 0;
  const IconComponent = labels.icon;
  const displayDescription = message || labels.description;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-md text-center overflow-hidden"
        data-testid="dialog-points-award"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.08 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-purple-500"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 2.5, opacity: 0.05 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-primary"
          />
        </div>

        <DialogHeader className="items-center relative z-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mb-4"
          >
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto shadow-lg"
              >
                <IconComponent className="h-8 w-8 text-white" />
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
              >
                <CheckCircle2 className="h-3 w-3 text-white" />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <DialogTitle className="text-xl font-semibold" data-testid="text-points-title">
              {labels.title}
            </DialogTitle>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <DialogDescription className="text-sm text-muted-foreground" data-testid="text-points-description">
              {displayDescription}
            </DialogDescription>
          </motion.div>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="my-6 relative z-10"
        >
          <div className="inline-flex items-center gap-1">
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className={`text-4xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}
            >
              {isPositive ? '+' : ''}
            </motion.span>
            <span 
              className={`text-5xl font-bold tabular-nums ${isPositive ? 'text-green-500' : 'text-red-500'}`}
              data-testid="text-points-amount"
            >
              {showCounter ? <AnimatedCounter value={Math.abs(points)} /> : 0}
            </span>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="text-sm text-muted-foreground mt-1 font-medium uppercase tracking-wider"
          >
            points
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="relative z-10"
        >
          <Button 
            onClick={onClose} 
            className="w-full"
            size="lg"
            data-testid="button-points-continue"
          >
            Continue
          </Button>
        </motion.div>
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
