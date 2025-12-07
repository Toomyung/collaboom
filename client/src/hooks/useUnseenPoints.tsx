import { useState, useEffect, useCallback } from "react";
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
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [seenEventIds, setSeenEventIds] = useState<Set<string>>(new Set());

  const { data: unseenEvents = [], isLoading } = useQuery<ScoreEvent[]>({
    queryKey: ["/api/me/score-events/unseen"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const markSeenMutation = useMutation({
    mutationFn: async (eventIds: string[]) => {
      const res = await apiRequest("POST", "/api/me/score-events/mark-seen", { eventIds });
      if (!res.ok) throw new Error("Failed to mark events as seen");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/score-events/unseen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/score-events"] });
    },
  });

  const filteredEvents = unseenEvents.filter(e => !seenEventIds.has(e.id) && e.delta > 0);
  const currentEvent = filteredEvents.length > currentEventIndex ? filteredEvents[currentEventIndex] : null;
  const hasUnseenEvents = filteredEvents.length > 0;

  const markCurrentAsSeen = useCallback(() => {
    if (currentEvent) {
      setSeenEventIds(prev => new Set(Array.from(prev).concat(currentEvent.id)));
      markSeenMutation.mutate([currentEvent.id]);
      
      if (currentEventIndex + 1 < filteredEvents.length) {
        setCurrentEventIndex(prev => prev + 1);
      } else {
        setCurrentEventIndex(0);
      }
    }
  }, [currentEvent, currentEventIndex, filteredEvents.length, markSeenMutation]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSeenEventIds(new Set());
      setCurrentEventIndex(0);
    }
  }, [isAuthenticated]);

  return {
    currentEvent,
    isLoading,
    markCurrentAsSeen,
    hasUnseenEvents,
  };
}
