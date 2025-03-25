// lib/context/MapContext.tsx
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
  useContext,
} from "react";
import L from "leaflet";
import { geocodeWithThrottle, reverseGeocode } from "@/lib/utils/map-utils";
import { Message } from "beeai-framework/backend/core";

interface MapContextProps {
  markers: MarkerState[];
  addMarker: (marker: MarkerState) => void;
  removeMarker: (id: string) => void;
  setMarkers: React.Dispatch<React.SetStateAction<MarkerState[]>>;
  lastMessage: Message | null; // Added last message
  setLastMessage: React.Dispatch<React.SetStateAction<Message | null>>;
}

interface MapProviderProps {
  children: ReactNode;
  initialLocations?: MarkerState[];
}

export interface MarkerState {
  lat: number;
  lng: number;
  address: string | null;
  id: string;
  risk: string;
}

const MapContext = createContext<MapContextProps | undefined>(undefined);

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within a MapProvider");
  }
  return context;
};

export const MapProvider: React.FC<MapProviderProps> = ({
  children,
  initialLocations = [],
}) => {
  const [markers, setMarkers] = useState<MarkerState[]>(initialLocations);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  const addMarker = useCallback((marker: MarkerState) => {
    setMarkers((prevMarkers) => [...prevMarkers, marker]);
  }, []);

  const removeMarker = (id: string) => {
    setMarkers((prevMarkers) =>
      prevMarkers.filter((marker) => marker.id !== id)
    );
  };

  const value: MapContextProps = {
    markers,
    addMarker,
    removeMarker,
    setMarkers,
    lastMessage,
    setLastMessage,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};
