// components/MapActions.tsx
"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapContext, MarkerState } from "@/lib/context/MapContext";
import { geocodeWithThrottle, reverseGeocode } from "@/lib/utils/map-utils";
import { Message } from "beeai-framework/backend/core";

interface MapActionsProps {}

interface ChatMessage extends Message {
  mapCommands?: {
    command: string;
    location: string;
    risk?: string;
    summary?: string;
  }[];
}

const MapActions: React.FC<MapActionsProps> = () => {
  const map = useMap();
  const { addMarker, setMarkers, lastMessage, setLastMessage } =
    useMapContext();

  useEffect(() => {
    if (lastMessage && (lastMessage as ChatMessage).mapCommands) {
      const mapCommands = (lastMessage as ChatMessage).mapCommands;
      if (mapCommands) {
        mapCommands.forEach((command) => {
          if (command.command === "SET_MARKER") {
            addMarkerFromCommand(command.location);
          } else if (command.command === "UPDATE_MARKER") {
            addMarkerFromCommand(
              command.location,
              command.risk,
              command.summary
            );
          }
          // Add other command handling logic here, e.g., "REMOVE_MARKER"
        });
      }
    }
  }, [lastMessage, addMarker, map]);

  const addMarkerFromCommand = async (
    locationName: string,
    risk?: string,
    summary?: string
  ) => {
    const results = await geocodeWithThrottle(locationName);
    if (results && results.length > 0) {
      const { center, name, properties } = results[0];
      const newMarker: MarkerState = {
        lat: center.lat,
        lng: center.lng,
        address: name,
        id: Date.now().toString(),
        risk: risk || "Unknown", // Set initial risk
        summary: summary || "",
      };
      addMarker(newMarker);
      map.flyTo(
        center,
        (properties?.place_rank < 30 && properties?.place_rank > 4 && 14) || 5
      );
      console.warn("place_rank:", results);
    } else {
      console.warn("Location not found for:", locationName);
    }
  };

  return null; // This component doesn't render anything directly
};

export default MapActions;
