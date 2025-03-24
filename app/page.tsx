// app/page.tsx

import ChatModal from "@/components/ChatModal";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Water Shortage Forecast
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Using AI to predict and visualize water scarcity.
          </p>
        </div>
      </header>
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Your main content goes here */}
          <p>This is the main content area of the application.</p>
        </div>
      </main>
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>© 2025 Water Shortage Forecast. All rights reserved.</p>
        </div>
      </footer>
      <ChatModal />
    </div>
  );
}
