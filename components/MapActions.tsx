// components/MapActions.tsx
"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapContext, MarkerState } from "@/lib/context/MapContext";
import { geocodeWithThrottle, reverseGeocode } from "@/lib/utils/map-utils";

interface MapActionsProps {}

const MapActions: React.FC<MapActionsProps> = () => {
  const map = useMap();
  const { addMarker, setMarkers, lastMessage, setLastMessage } =
    useMapContext();

  useEffect(() => {
    if (lastMessage && lastMessage.text.startsWith("SET_MARKER|")) {
      const locationName = lastMessage.text.split("|")[1];
      addMarkerFromCommand(locationName);
      console.log("action", locationName);
    }
  }, [lastMessage, addMarker]);

  const addMarkerFromCommand = async (locationName: string) => {
    const results = await geocodeWithThrottle(locationName);
    if (results && results.length > 0) {
      const { center, name, properties } = results[0];
      const newMarker: MarkerState = {
        lat: center.lat,
        lng: center.lng,
        address: name,
        id: Date.now().toString(),
        risk: "Unknown", // Set initial risk
      };
      addMarker(newMarker);
      map.flyTo(
        center,
        (properties?.place_rank < 30 &&
          properties?.place_rank > 4 &&
          14) ||
          5
      );
      console.warn("place_rank:", results);
    } else {
      console.warn("Location not found for:", locationName);
    }
  };

  return null; // This component doesn't render anything directly
};

export default MapActions;
