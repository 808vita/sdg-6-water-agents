// components/MapComponent.tsx
"use client";

import React, { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { LatLngExpression } from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerHandler, { MarkerState } from "./MarkerHandler";
import { useMapContext } from "@/lib/context/MapContext";

import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";
import L from "leaflet";

// Temporary fix for leaflet marker issue
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import MapActions from "./MapActions";

// Issue fix to prevent errors
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});

interface MapProps {}

const MapComponent: React.FC<MapProps> = () => {
  const position: LatLngExpression = [51.5074, 0.1278];
  const { markers, removeMarker, setMarkers } = useMapContext();

  useEffect(() => {
    console.log("markers", markers);
  }, [markers]);

  return (
    <MapContainer
      center={position}
      zoom={2}
      className="map-container" // Apply the CSS class
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]}>
          <Popup>
            Location: {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
            <br />
            Address: {marker.address || "Fetching..."}
            <br />
            Water Shortage Risk: {marker.risk}
            <br />
            <button onClick={() => removeMarker(marker.id)}>
              Remove Marker
            </button>
          </Popup>
        </Marker>
      ))}
      <MarkerHandler setMarkers={setMarkers} markers={markers} />
      <MapActions />
    </MapContainer>
  );
};

export default MapComponent;
