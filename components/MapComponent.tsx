// components/MapComponent.tsx
"use client";

import React from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

// Temporary fix for leaflet marker issue
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});

interface MapProps {
  locations: {
    lat: number;
    lng: number;
    risk: string;
  }[];
}

const MapComponent: React.FC<MapProps> = ({ locations }) => {
  const position = { lat: 51.5074, lng: 0.1278 }; // Default center of the map (adjust as needed)

  return (
    <MapContainer
      center={position}
      zoom={2}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((location, index) => (
        <Marker key={index} position={[location.lat, location.lng]}>
          <Popup>
            Location: {location.lat}, {location.lng} <br />
            Water Shortage Risk: {location.risk}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
