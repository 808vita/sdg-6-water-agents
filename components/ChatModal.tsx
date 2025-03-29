// components/ChatModal.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import useChat from "@/lib/hooks/useChat";
import { useMapContext } from "@/lib/context/MapContext";
import { Message } from "beeai-framework/backend/core";

// Extend the Message interface to include mapCommands
interface ChatMessage extends Message {
  mapCommands?: { command: string; location: string }[];
}

const ChatModal = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    input,
    isLoading,
    setInput: baseSetInput,
    handleSend: baseHandleSend,
    sendPrompt,
    clearChat,
  } = useChat({
    onSend: async (messages) => {
      try {
        const response = await fetch("/api/watsonx", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages }), // Send the chat history
        });

        if (!response.ok) {
          const errorData = await response.json(); // Parse error response
          throw new Error(errorData.error || "Failed to send message.");
        }

        const data = await response.json();

        // Create a ChatMessage object
        const chatMessage: ChatMessage = {
          sender: "bot",
          text:
            data?.data?.messageText || "Sorry, I received an empty response.",
          mapCommands: data?.data?.mapCommands,
          role: "assistant", // Ensure role is always provided
          content: [], // Provide a default value of content
        } as ChatMessage;

        return chatMessage;
      } catch (error: any) {
        return {
          sender: "bot",
          text: "Sorry, I could not connect to the AI backend. Please try again later.",
          role: "assistant",
          content: [],
        };
      }
    },
  });

  const { setLastMessage, setMarkers } = useMapContext();

  const [navigationDone, setNavigationDone] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState("");
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");

  const [showPlaceNameInput, setShowPlaceNameInput] = useState(false);

  const predefinedPlaces = ["Mumbai", "Hyderabad", "Chennai", "Delhi"];

  const subsequentPrompts = [
    "Get current weather for [Place Name]",
    "Water shortage risk in [Place Name]",
    "Change map location to [New Place Name]",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage?.sender === "bot" &&
        typeof lastMessage === "object" &&
        lastMessage !== null &&
        "mapCommands" in lastMessage &&
        Array.isArray((lastMessage as ChatMessage).mapCommands)
      ) {
        setLastMessage(lastMessage as ChatMessage);
        selectedPlace !== "" && setNavigationDone(true); // Enable subsequent prompts
      }
    }
  }, [messages, setLastMessage]);

  const handleClearChat = () => {
    clearChat();
    setMarkers([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("mapMarkers");
    }
    setNavigationDone(false); // Reset state
    setSelectedPlace("");
  };

  const initialPrompt = "Navigate to [Place Name]";

  // Wrap setInput to ensure it always receives a string
  const setInput = (value: string) => {
    baseSetInput(value);
  };

  const handleSend = async (message?: string) => {
    // Ensure finalMessage is always a string
    let finalMessage = String(message || input || "");

    if (!finalMessage.trim()) return;

    if (finalMessage === initialPrompt && !showPlaceNameInput) {
      setShowPlaceNameInput(true);
      return;
    }
    if (showPlaceNameInput && selectedPlace === "") {
      alert("Please select a place.");
      return;
    }

    if (finalMessage.includes("[Place Name]")) {
      finalMessage = finalMessage.replace("[Place Name]", selectedPlace);
    }

    if (finalMessage.includes("[New Place Name]")) {
      finalMessage = finalMessage.replace("[New Place Name]", newPlaceName);
    }

    // Check if changing location
    if (finalMessage.startsWith("Change map location to")) {
      setIsChangingLocation(true);
    } else {
      setIsChangingLocation(false);
    }

    baseHandleSend();
    setInput("");

    // Reset input after sending
    setNewPlaceName("");
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-50 border border-gray-300 rounded-lg shadow-xl flex flex-col overflow-y-scroll max-h-3/4">
      <div className="flex items-center justify-between p-4 border-b bg-gray-100">
        <h2 className="font-semibold text-gray-800">Customer Support</h2>
        <button
          onClick={handleClearChat}
          className="bg-red-500 hover:bg-red-600 text-white text-xs rounded p-2 cursor-pointer"
        >
          Clear Chat
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 ">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`text-sm rounded-lg p-3 max-w-fit ${
              message.sender === "user"
                ? "bg-blue-100 text-blue-800 justify-self-end"
                : "bg-gray-100 text-gray-800 justify-self-start"
            }`}
          >
            <span className="font-semibold mx-0.5">
              {message.sender === "user" ? "You" : "Bot"}:
            </span>
            {message.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="flex space-x-2 animate-pulse text-blue-700">
            Thinking
            <div>.</div>
            <div>.</div>
            <div>.</div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        {!navigationDone ? (
          <>
            {!showPlaceNameInput ? (
              <button
                onClick={() => handleSend(initialPrompt)}
                className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 disabled:opacity-50"
              >
                {initialPrompt}
              </button>
            ) : (
              <>
                <select
                  value={selectedPlace}
                  onChange={(e) => {
                    setSelectedPlace(e.target.value);
                    setInput(`Navigate to ${e.target.value}`); // Set input for display purposes
                  }}
                  className="flex-1 border rounded p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a place</option>
                  {predefinedPlaces.map((place) => (
                    <option key={place} value={place}>
                      {place}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || selectedPlace === ""}
                  className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 disabled:opacity-50 ml-2"
                >
                  Send
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {!isChangingLocation ? (
              <div className="flex flex-wrap gap-2">
                {subsequentPrompts
                  .filter((prompt) => !prompt.startsWith("Change map location"))
                  .map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        sendPrompt(
                          prompt.replace("[Place Name]", selectedPlace)
                        );
                      }}
                      className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 disabled:opacity-50"
                    >
                      {prompt.replace("[Place Name]", selectedPlace)}
                    </button>
                  ))}
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  placeholder="Enter new place name..."
                  className="flex-1 border rounded p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() =>
                    handleSend(
                      subsequentPrompts.find((prompt) =>
                        prompt.startsWith("Change map location")
                      ) || ""
                    )
                  }
                  disabled={isLoading || newPlaceName === ""}
                  className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 disabled:opacity-50 ml-2"
                >
                  Change Location
                </button>
              </>
            )}
            {navigationDone && !isChangingLocation && (
              <button
                onClick={() => {
                  setIsChangingLocation(true);
                  setInput("Change map location to [New Place Name]");
                }}
                className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 disabled:opacity-50"
              >
                Change Map Location
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatModal;
