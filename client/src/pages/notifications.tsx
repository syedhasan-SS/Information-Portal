import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Loader2,
  MessageSquare,
  TicketIcon,
  UserPlus,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";

async function getNotifications(userId: string): Promise<Notification[]> {
  const res = await fetch(`/api/notifications?userId=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

async function markAsRead(id: string): Promise<Notification> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to mark notification as read");
  return res.json();
}

async function markAllAsRead(userId: string): Promise<void> {
  const res = await fetch("/api/notifications/mark-all-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Failed to mark all as read");
}

async function deleteNotification(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete notification");
}

export default function NotificationsPage() {
  console.log("NotificationsPage rendering");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"all" | "case_created" | "comment_mention" | "ticket_assigned" | "ticket_solved">("all");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const userId = user?.id || "";
  console.log("NotificationsPage user:", user, "userId:", userId);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => getNotifications(userId),
    enabled: !!userId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const filteredNotifications = notifications?.filter(
    (notif) => activeTab === "all" || notif.type === activeTab
  ) || [];

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;
  const caseCreatedCount = notifications?.filter((n) => n.type === "case_created" && !n.isRead).length || 0;
  const commentMentionCount = notifications?.filter((n) => (n.type === "comment_mention" || n.type === "comment_added") && !n.isRead).length || 0;
  const ticketAssignedCount = notifications?.filter((n) => n.type === "ticket_assigned" && !n.isRead).length || 0;
  const ticketSolvedCount = notifications?.filter((n) => n.type === "ticket_solved" && !n.isRead).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "case_created":
        return <TicketIcon className="h-5 w-5 text-blue-500" />;
      case "comment_mention":
      case "comment_added":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "ticket_assigned":
        return <UserPlus className="h-5 w-5 text-orange-500" />;
      case "ticket_solved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.ticketId) {
      setLocation(`/tickets/${notification.ticketId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Bell className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Notifications
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
                  </p>
                </div>
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="relative">
              All
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="case_created" className="relative">
              Cases Created
              {caseCreatedCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {caseCreatedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="comment_mention" className="relative">
              Comments
              {commentMentionCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {commentMentionCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ticket_assigned" className="relative">
              Assigned
              {ticketAssignedCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {ticketAssignedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ticket_solved" className="relative">
              Solved
              {ticketSolvedCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {ticketSolvedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <Card className="p-16">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </Card>
            ) : filteredNotifications.length > 0 ? (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`p-4 transition-colors hover:bg-accent/5 cursor-pointer ${
                      !notification.isRead ? "bg-blue-50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          {notification.metadata?.ticketNumber && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                {notification.metadata.ticketNumber}
                              </Badge>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-16">
                <div className="text-center">
                  <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground">No notifications</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeTab === "all"
                      ? "You're all caught up!"
                      : `No ${activeTab.replace("_", " ")} notifications`}
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
