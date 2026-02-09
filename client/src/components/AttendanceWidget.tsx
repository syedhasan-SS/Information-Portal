import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn, LogOut, MapPin, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

export function AttendanceWidget({ userId }: { userId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check location permission on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setLocationPermission(result.state as any);
      });
    }
  }, []);

  // Fetch current active session
  const { data: activeSession, isLoading } = useQuery<AttendanceRecord | null>({
    queryKey: ["/api/attendance/current", userId],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Capture GPS location
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
          setLocationPermission("granted");
          resolve(locationData);
        },
        (error) => {
          setIsCapturingLocation(false);
          setLocationPermission("denied");

          let errorMessage = "Unable to capture location.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Location permission denied. Please enable location access in your browser settings.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = "Location information unavailable.";
          } else if (error.code === error.TIMEOUT) {
            errorMessage = "Location request timed out.";
          }

          toast({
            title: "Location Error",
            description: errorMessage,
            variant: "destructive",
          });

          resolve(undefined);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      const location = await captureLocation();
      const deviceInfo = navigator.userAgent;

      const response = await fetch("/api/attendance/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          loginTime: new Date().toISOString(),
          loginLocation: location,
          loginDeviceInfo: deviceInfo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to login");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/current", userId] });
      toast({
        title: "Login Successful",
        description: "Your attendance has been recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const location = await captureLocation();
      const deviceInfo = navigator.userAgent;

      const response = await fetch("/api/attendance/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          logoutTime: new Date().toISOString(),
          logoutLocation: location,
          logoutDeviceInfo: deviceInfo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to logout");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/current", userId] });
      toast({
        title: "Logout Successful",
        description: "Your attendance has been recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Failed",
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

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  const isLoggedIn = activeSession && activeSession.status === "active";

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Attendance
          </h3>
          <div className="text-sm text-muted-foreground font-mono">
            {formatTime(currentTime)}
          </div>
        </div>

        {/* Status */}
        <div className={cn(
          "p-4 rounded-lg border-2",
          isLoggedIn ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isLoggedIn ? "Logged In" : "Not Logged In"}
            </span>
            {isLoggedIn && (
              <div className="flex items-center gap-1 text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                <span className="text-xs">Active</span>
              </div>
            )}
          </div>

          {isLoggedIn && activeSession && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Login Time: {new Date(activeSession.loginTime).toLocaleString()}
              </div>
              <div className="text-2xl font-mono font-bold text-green-600">
                {formatDuration(activeSession.loginTime)}
              </div>
              {activeSession.loginLocation && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>Location captured</span>
                </div>
              )}
            </div>
          )}

          {!isLoggedIn && (
            <div className="text-xs text-muted-foreground">
              Click Login to start tracking your attendance
            </div>
          )}
        </div>

        {/* Location Permission Warning */}
        {locationPermission === "denied" && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800">
              <strong>Location Access Required:</strong> Please enable location permissions in your browser settings for accurate attendance tracking.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isLoggedIn ? (
            <Button
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending || isCapturingLocation}
              className="flex-1"
              size="lg"
            >
              {loginMutation.isPending || isCapturingLocation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isCapturingLocation ? "Capturing Location..." : "Logging In..."}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending || isCapturingLocation}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              {logoutMutation.isPending || isCapturingLocation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isCapturingLocation ? "Capturing Location..." : "Logging Out..."}
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info Text */}
        <div className="text-xs text-center text-muted-foreground">
          <MapPin className="h-3 w-3 inline mr-1" />
          GPS location is captured at login and logout
        </div>
      </div>
    </Card>
  );
}
