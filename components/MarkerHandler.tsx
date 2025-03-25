// components/MarkerHandler.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";

export interface MarkerState {
  lat: number;
  lng: number;
  address: string | null;
  id: string;
  risk: string;
}

interface MarkerHandlerProps {
  markers: MarkerState[];
  setMarkers: React.Dispatch<React.SetStateAction<MarkerState[]>>;
}

function MarkerHandler({ markers, setMarkers }: MarkerHandlerProps) {
  const map = useMap();

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [lastGeocodeTime, setLastGeocodeTime] = useState(0);

  // Use a ref to store the timeout ID
  const geocodeTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const getReverseGeocoding = useCallback(
    (lat: number, lng: number, markerId: string) => {
      const now = Date.now();
      const timeSinceLastGeocode = now - lastGeocodeTime;

      const throttledGeocode = async () => {
        try {
          setIsGeocoding(true);
          const geocoder = L.Control.Geocoder.nominatim();
          const results = await geocoder
            .reverse(L.latLng(lat, lng), map.options.crs.scale(map.getZoom()))
            .catch((err) => {
              console.error("Geocoding error", err);
              return null;
            });

          if (results) {
            console.log(results, "results");
            // Update the address for the specific marker ID
            setMarkers((prevMarkers) =>
              prevMarkers.map((marker) =>
                marker.id === markerId
                  ? { ...marker, address: results?.[0]?.name }
                  : marker
              )
            );
          } else {
            setMarkers((prevMarkers) =>
              prevMarkers.map((marker) =>
                marker.id === markerId
                  ? { ...marker, address: "Address Not Found" }
                  : marker
              )
            );
          }
        } finally {
          setIsGeocoding(false);
          setLastGeocodeTime(Date.now());
        }
      };

      if (timeSinceLastGeocode < 2000 && lastGeocodeTime !== 0) {
        const timeout = 2000 - timeSinceLastGeocode;
        console.warn(`Rate limiting geocoding. Retrying in ${timeout}ms`);
        geocodeTimeoutId.current = setTimeout(throttledGeocode, timeout);
      } else {
        throttledGeocode();
      }
    },
    [lastGeocodeTime, map, setMarkers]
  );

  const handleMapDblClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;

    const newMarker = {
      lat,
      lng,
      address: null, // Set to null initially, will be updated by geocoding
      id: Date.now().toString(),
      risk: "Low",
    };

    setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
    getReverseGeocoding(lat, lng, newMarker.id);
  };

  useEffect(() => {
    // Attach the event listener directly to the map instance
    map.on("dblclick", handleMapDblClick);

    // Clean up the event listener when the component unmounts
    return () => {
      map.off("dblclick", handleMapDblClick);
      if (geocodeTimeoutId.current) {
        clearTimeout(geocodeTimeoutId.current);
      }
    };
  }, [handleMapDblClick, map]);

  return null;
}

export default MarkerHandler;
