// app/page.tsx
"use client";
import dynamic from "next/dynamic";
import ChatModal from "@/components/ChatModal";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

const dummyLocations = [
  { lat: 34.0522, lng: -118.2437, risk: "High", id: 0, address: "---" }, // Los Angeles
  { lat: 51.5074, lng: 0.1278, risk: "Medium", id: 1, address: "---" }, // London
  { lat: -33.8688, lng: 151.2093, risk: "Low", id: 2, address: "---" }, // Sydney
  { lat: 4.2105, lng: 101.9758, risk: "Critical", id: 3, address: "---" }, // Malaysia
  { lat: -30.5595, lng: 22.9375, risk: "Low", id: 4, address: "---" }, // South Africa
  { lat: 64.9631, lng: -19.0208, risk: "High", id: 5, address: "---" }, // Iceland
];

export default function Home() {
  return (
    <div className="flex flex-col max-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Water Shortage Forecast
          </h1>
          <p className="text-sm text-gray-500">
            Using AI to predict and visualize water scarcity.
          </p>
        </div>
      </header>
      <main className="flex-grow">
        <div className="max-w-11/12 mx-0 py-4 px-2 sm:px-0 lg:px-2 grid grid-cols-3 gap-0.5">
          <div className="col-span-2">
            <MapComponent initialLocations={dummyLocations} />
          </div>
          <div className="col-span-1">
            <ChatModal />
          </div>
        </div>
      </main>
    </div>
  );
}
