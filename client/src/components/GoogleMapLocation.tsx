import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface GoogleMapLocationProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  onLocationUpdate?: (location: { latitude: number; longitude: number; accuracy: number }) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
    googleMapsLoaded?: boolean;
    googleMapsLoading?: boolean;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

export function GoogleMapLocation({ latitude, longitude, accuracy, onLocationUpdate }: GoogleMapLocationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Load Google Maps script only once
    const loadGoogleMaps = async () => {
      // If already loaded, initialize immediately
      if (window.google && window.google.maps && window.googleMapsLoaded) {
        if (mounted) {
          initializeMap();
        }
        return;
      }

      // If loading is in progress, wait for it
      if (scriptLoadPromise) {
        await scriptLoadPromise;
        if (mounted && window.google && window.google.maps) {
          initializeMap();
        }
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // If script exists, wait for it to load
        scriptLoadPromise = new Promise((resolve) => {
          // Check if already loaded
          if (window.google && window.google.maps) {
            window.googleMapsLoaded = true;
            resolve();
          } else {
            // Wait for load event
            existingScript.addEventListener('load', () => {
              window.googleMapsLoaded = true;
              resolve();
            });
          }
        });
        await scriptLoadPromise;
        if (mounted && window.google && window.google.maps) {
          initializeMap();
        }
        return;
      }

      // Create new script
      scriptLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.googleMapsLoaded = true;
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load Google Maps'));
        };
        document.head.appendChild(script);
      });

      try {
        await scriptLoadPromise;
        if (mounted && window.google && window.google.maps) {
          initializeMap();
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        if (mounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      const position = { lat: latitude, lng: longitude };

      // Create map
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom: 17,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        mapTypeId: "roadmap",
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "on" }],
          },
        ],
      });

      // Create marker
      markerRef.current = new window.google.maps.Marker({
        position: position,
        map: mapInstanceRef.current,
        title: "Your Location",
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4F46E5",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
      });

      // Create accuracy circle
      if (accuracy) {
        circleRef.current = new window.google.maps.Circle({
          map: mapInstanceRef.current,
          center: position,
          radius: accuracy,
          fillColor: "#4F46E5",
          fillOpacity: 0.15,
          strokeColor: "#4F46E5",
          strokeOpacity: 0.3,
          strokeWeight: 1,
        });
      }

      // Start watching position for high accuracy updates
      if (navigator.geolocation && onLocationUpdate) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const newPosition = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };

            // Update marker position
            if (markerRef.current) {
              markerRef.current.setPosition(newPosition);
            }

            // Update accuracy circle
            if (circleRef.current && pos.coords.accuracy) {
              circleRef.current.setCenter(newPosition);
              circleRef.current.setRadius(pos.coords.accuracy);
            }

            // Center map on new position
            if (mapInstanceRef.current) {
              mapInstanceRef.current.panTo(newPosition);
            }

            // Callback with updated location
            onLocationUpdate({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (error) => {
            console.error("Location watch error:", error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000,
          }
        );
      }

      // Map initialized successfully
      if (mounted) {
        setIsLoading(false);
      }
    };

    loadGoogleMaps();

    // Cleanup
    return () => {
      mounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [latitude, longitude, accuracy, onLocationUpdate]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {(isLoading || hasError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            {isLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </>
            ) : (
              <>
                <p className="text-sm text-red-600 font-semibold mb-1">Failed to load map</p>
                <p className="text-xs text-muted-foreground">Please check your internet connection</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
