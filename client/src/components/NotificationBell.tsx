import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Package, Trophy, Star, MessageCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

function getNotificationIcon(type: string) {
  switch (type) {
    case "approved":
      return <Check className="h-4 w-4 text-green-500" />;
    case "rejected":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "shipping_shipped":
    case "shipping_delivered":
      return <Package className="h-4 w-4 text-blue-500" />;
    case "score_updated":
    case "tier_upgraded":
      return <Trophy className="h-4 w-4 text-amber-500" />;
    case "comment_reply":
      return <MessageCircle className="h-4 w-4 text-purple-500" />;
    case "upload_verified":
      return <Star className="h-4 w-4 text-amber-500" />;
    default:
      return <Star className="h-4 w-4 text-primary" />;
  }
}

function getNotificationRoute(notification: Notification): string {
  switch (notification.type) {
    case "approved":
    case "shipping_shipped":
    case "shipping_delivered":
    case "upload_verified":
    case "deadline_missed":
      // Navigate to dashboard with anchor to the specific application
      if (notification.applicationId) {
        return `/dashboard#application-${notification.applicationId}`;
      }
      return "/dashboard";
    case "rejected":
      // Rejected - go to browse campaigns
      return "/dashboard";
    case "score_updated":
    case "tier_upgraded":
      // Score/Tier related - go to score page
      return "/score-tier";
    case "comment_reply":
      // Comment - go to dashboard with anchor
      if (notification.applicationId) {
        return `/dashboard#application-${notification.applicationId}`;
      }
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("POST", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = unreadData?.count || 0;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Navigate to the relevant page
    const route = getNotificationRoute(notification);
    setOpen(false);
    setLocation(route);
  };

  const handleMarkAsReadOnly = (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11"
          data-testid="button-notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 hover-elevate cursor-pointer transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      !notification.read && "font-medium"
                    )}>
                      {notification.title || notification.type}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.createdAt
                        ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                        : ""}
                    </p>
                  </div>
                  {!notification.read && (
                    <button
                      onClick={(e) => handleMarkAsReadOnly(notification, e)}
                      className="flex-shrink-0 hover:scale-110 transition-transform p-1"
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
        </ScrollArea>
        {notifications && notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setOpen(false);
                setLocation("/dashboard");
              }}
              data-testid="button-view-all-notifications"
            >
              View Dashboard
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
