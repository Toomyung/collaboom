import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScoreEvent } from "@shared/schema";

interface UseUnseenPointsReturn {
  currentEvent: ScoreEvent | null;
  isLoading: boolean;
  markCurrentAsSeen: () => void;
  hasUnseenEvents: boolean;
}

export function useUnseenPoints(isAuthenticated: boolean): UseUnseenPointsReturn {
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processedIdsRef = useRef<Set<string>>(new Set());

  const { data: unseenEvents = [], isLoading } = useQuery<ScoreEvent[]>({
    queryKey: ["/api/me/score-events/unseen"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const markSeenMutation = useMutation({
    mutationFn: async (eventIds: string[]) => {
      const res = await apiRequest("POST", "/api/me/score-events/mark-seen", { eventIds });
      if (!res.ok) throw new Error("Failed to mark events as seen");
      return res.json();
    },
    onSettled: () => {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/me/score-events/unseen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/score-events"] });
    },
  });

  const availableEvents = unseenEvents.filter(
    e => !processedIdsRef.current.has(e.id) && e.delta > 0
  );

  const currentEvent = currentEventId
    ? unseenEvents.find(e => e.id === currentEventId) || null
    : null;

  const hasUnseenEvents = availableEvents.length > 0 || currentEvent !== null;

  useEffect(() => {
    if (!isAuthenticated) {
      processedIdsRef.current = new Set();
      setCurrentEventId(null);
      setIsProcessing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!currentEventId && !isProcessing && availableEvents.length > 0) {
      const next = availableEvents[0];
      processedIdsRef.current.add(next.id);
      setCurrentEventId(next.id);
    }
  }, [currentEventId, isProcessing, availableEvents]);

  const markCurrentAsSeen = useCallback(() => {
    if (currentEventId && !isProcessing) {
      setIsProcessing(true);
      setCurrentEventId(null);
      markSeenMutation.mutate([currentEventId]);
    }
  }, [currentEventId, isProcessing, markSeenMutation]);

  return {
    currentEvent,
    isLoading,
    markCurrentAsSeen,
    hasUnseenEvents,
  };
}
