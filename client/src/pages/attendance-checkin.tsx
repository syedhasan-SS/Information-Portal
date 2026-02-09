import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogIn,
  LogOut,
  MapPin,
  Clock,
  Coffee,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Timer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
// Google Maps removed due to billing requirements
// import { GoogleMapLocation } from "@/components/GoogleMapLocation";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  loginTime: string;
  logoutTime?: string;
  loginLocation?: LocationData;
  logoutLocation?: LocationData;
  workDuration?: number;
  status: "active" | "completed" | "incomplete";
}

export default function AttendanceCheckInPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current location on mount with high accuracy
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: "Location Access",
            description: "Please enable location for accurate attendance tracking.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      );
    }
  }, [toast]);

  // Fetch current active session
  const { data: activeSession, isLoading } = useQuery<AttendanceRecord | null>({
    queryKey: ["/api/attendance/current", user?.id],
    queryFn: async () => {
      if (!user?.email) return null;
      const res = await fetch(`/api/attendance/current/${user?.id}`, {
        headers: {
          "x-user-email": user.email,
        },
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const captureLocation = async (): Promise<LocationData | undefined> => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return undefined;
    }

    setIsCapturingLocation(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsCapturingLocation(false);
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setUserLocation(locationData);
          resolve(locationData);
        },
        (error) => {
          setIsCapturingLocation(false);
          let errorMessage = "Unable to capture location.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Location permission denied. Please enable location access.";
          }
          toast({
            title: "Location Error",
            description: errorMessage,
            variant: "destructive",
          });
          resolve(undefined);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("User email not found");
      }
      const location = await captureLocation();
      const response = await fetch("/api/attendance/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
        },
        credentials: "include",
        body: JSON.stringify({
          loginTime: new Date().toISOString(),
          loginLocation: location,
          loginDeviceInfo: navigator.userAgent,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to check in");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/current", user?.id] });
      toast({
        title: "Checked In Successfully",
        description: "Have a productive day!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-In Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("User email not found");
      }
      const location = await captureLocation();
      const response = await fetch("/api/attendance/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user.email,
        },
        credentials: "include",
        body: JSON.stringify({
          logoutTime: new Date().toISOString(),
          logoutLocation: location,
          logoutDeviceInfo: navigator.userAgent,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to check out");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/current", user?.id] });
      toast({
        title: "Checked Out Successfully",
        description: "See you tomorrow!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-Out Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStartBreak = () => {
    setOnBreak(true);
    setBreakStartTime(new Date());
    toast({
      title: "Break Started",
      description: "Enjoy your break!",
    });
  };

  const handleEndBreak = () => {
    setOnBreak(false);
    setBreakStartTime(null);
    toast({
      title: "Break Ended",
      description: "Welcome back!",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isCheckedIn = activeSession && activeSession.status === "active";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[500px] px-6">
          <div className="flex h-16 items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Attendance</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/attendance")}
            >
              Reports
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[500px] p-6 space-y-6">
        {/* Greeting Card */}
        <Card className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm opacity-90">Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"},</p>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-sm opacity-90 mt-1">{user?.role}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatTime(currentTime)}</p>
              <p className="text-xs opacity-90">{formatDate(currentTime)}</p>
            </div>
          </div>
        </Card>

        {/* Status Card */}
        <Card className="p-6">
          <div className={cn(
            "p-6 rounded-xl border-2 text-center",
            isCheckedIn ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
          )}>
            {isCheckedIn ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-semibold text-green-700">You're Checked In</span>
                </div>
                <div className="text-4xl font-bold text-green-600 mb-2 font-mono">
                  {formatDuration(activeSession.loginTime)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Started at {new Date(activeSession.loginTime).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <>
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="font-semibold text-gray-700">Not Checked In</p>
                <p className="text-sm text-muted-foreground">
                  Start your day by checking in
                </p>
              </>
            )}
          </div>
        </Card>

        {/* Location Card */}
        {userLocation && (
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Your Current Location</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Latitude:</span>
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {userLocation.latitude.toFixed(6)}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Longitude:</span>
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {userLocation.longitude.toFixed(6)}
                    </code>
                  </div>
                  {userLocation.accuracy && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Accuracy:</span>
                      <Badge variant="secondary" className="text-xs">
                        ±{Math.round(userLocation.accuracy)} meters
                      </Badge>
                    </div>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
                  >
                    View on Google Maps
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isCheckedIn ? (
            <Button
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending || isCapturingLocation}
              className="w-full h-16 text-lg bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loginMutation.isPending || isCapturingLocation ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isCapturingLocation ? "Capturing Location..." : "Checking In..."}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Check In
                </>
              )}
            </Button>
          ) : (
            <>
              {/* Break Button */}
              {!onBreak ? (
                <Button
                  onClick={handleStartBreak}
                  variant="outline"
                  className="w-full h-14"
                  size="lg"
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  Start Break
                </Button>
              ) : (
                <Card className="p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-semibold text-amber-700">On Break</p>
                        <p className="text-sm text-amber-600">
                          {breakStartTime && formatDuration(breakStartTime.toISOString())}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleEndBreak}
                      variant="outline"
                      size="sm"
                    >
                      End Break
                    </Button>
                  </div>
                </Card>
              )}

              {/* Check Out Button */}
              <Button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending || isCapturingLocation || onBreak}
                variant="destructive"
                className="w-full h-16 text-lg"
                size="lg"
              >
                {logoutMutation.isPending || isCapturingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isCapturingLocation ? "Capturing Location..." : "Checking Out..."}
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-5 w-5" />
                    Check Out
                  </>
                )}
              </Button>
              {onBreak && (
                <p className="text-sm text-center text-muted-foreground">
                  End your break to check out
                </p>
              )}
            </>
          )}
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Location Tracking</p>
              <p>Your location is captured at check-in and check-out for attendance verification.</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setLocation("/attendance")}
            className="h-20 flex-col gap-2"
          >
            <Calendar className="h-6 w-6" />
            <span className="text-xs">My Reports</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/attendance/team")}
            className="h-20 flex-col gap-2"
          >
            <Timer className="h-6 w-6" />
            <span className="text-xs">Team Status</span>
          </Button>
        </div>
      </main>
    </div>
  );
}
