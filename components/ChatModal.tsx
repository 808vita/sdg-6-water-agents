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
    setInput: baseSetInput,
    handleSend: baseHandleSend,
    sendPrompt,
    clearChat,
    isLoading, // Added isLoading from useChat hook
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
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false); // New state for custom prompt input
  const [customPrompt, setCustomPrompt] = useState(""); // State for custom prompt text

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
  }, [messages, setLastMessage, selectedPlace]); //Added selectedPlace to dependencies

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
    setCustomPrompt(""); // Clear custom prompt input as well
    setShowCustomPromptInput(false); // hide input after send
  };

  const [processingMessage, setProcessingMessage] = useState("Thinking");

  useEffect(() => {
    if (isLoading) {
      const processingWords = [
        "Thinking",
        "Consulting Watsonx",
        "Searching",
        "Reading",
        "Extracting",
        "Reading Tea Leaves",
        "Analyzing",
        "Generating",
        "Debating with Itself",
        "Forecasting",
        "Calculating",
        "Consulting the Magic 8-Ball",
        "Predicting",
        "Assessing",
        "Evaluating",
        "Gathering Data",
        "Compiling Results",
        "Avoiding Skynet Activation",
        "Interpreting Data",
        "Formulating Response",
        "Channeling Alan Turing",
        "Consulting Sources",
        "Wrangling Data",
        "Retrieving Information",
        "Validating Information",
        "Estimating Risk",
        "Investigating",
        "Brewing Coffee (for the AI)",
      ];
      let i = 0;
      const intervalId = setInterval(() => {
        setProcessingMessage(processingWords[i % processingWords.length]);
        i++;
      }, 1500);

      return () => clearInterval(intervalId); // Clear interval on unmount or isLoading change
    } else {
      setProcessingMessage("Thinking"); // Reset to default message when not loading
    }
  }, [isLoading]);

  const handleCustomPromptSend = () => {
    if (customPrompt.trim()) {
      sendPrompt(customPrompt); // Use sendPrompt
      setCustomPrompt("");
      setShowCustomPromptInput(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-[28rem] bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col overflow-y-auto max-h-3/4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-100 rounded-t-lg">
        <h2 className="font-semibold text-lg text-gray-800">Chat With AI Agent</h2>
        <button
          onClick={handleClearChat}
          className="bg-red-500 hover:bg-red-600 text-white text-sm rounded px-3 py-2 transition-colors duration-200"
        >
          Clear Chat
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-lg py-2 px-3 max-w-fit break-words ${
              message.sender === "user"
                ? "bg-blue-100 text-blue-800 ml-auto"
                : "bg-gray-100 text-gray-800 mr-auto"
            }`}
          >
            <span className="font-semibold mr-1">
              {message.sender === "user" ? "You:" : "Bot:"}
            </span>
            {message.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="flex items-center space-x-2 animate-pulse text-blue-700">
            <p>{processingMessage}</p>
            <div className="animate-bounce h-2 w-2 bg-blue-700 rounded-full"></div>
            <div className="animate-bounce h-2 w-2 bg-blue-700 rounded-full delay-100"></div>
            <div className="animate-bounce h-2 w-2 bg-blue-700 rounded-full delay-200"></div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        {!navigationDone ? (
          // Initial Navigation Prompt
          <>
            {!showPlaceNameInput ? (
              <button
                onClick={() => handleSend(initialPrompt)}
                className="w-full bg-blue-500 hover:bg-blue-700 text-white rounded py-2 px-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {initialPrompt}
              </button>
            ) : (
              // Place Selection Input
              <div className="flex items-center space-x-2">
                <select
                  value={selectedPlace}
                  onChange={(e) => {
                    setSelectedPlace(e.target.value);
                    setInput(`Navigate to ${e.target.value}`); // Set input for display purposes
                  }}
                  className="flex-1 border rounded py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="bg-blue-500 hover:bg-blue-700 text-white rounded py-2 px-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            )}
          </>
        ) : (
          // Subsequent Prompts and Custom Prompt
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
                      className="bg-blue-500 hover:bg-blue-700 text-white rounded py-1 px-2 text-xs transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      {prompt.replace("[Place Name]", selectedPlace)}
                    </button>
                  ))}
                <button
                  onClick={() =>
                    setShowCustomPromptInput(!showCustomPromptInput)
                  }
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 rounded py-1 px-2 text-xs transition-colors duration-200 mb-2"
                >
                  {showCustomPromptInput
                    ? "Hide Custom Prompt"
                    : "Custom Prompt"}
                </button>

                {showCustomPromptInput && (
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="text"
                      placeholder="Enter your custom prompt"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="flex-1 border rounded py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleCustomPromptSend}
                      disabled={isLoading || !customPrompt.trim()}
                      className="bg-blue-500 hover:bg-blue-700 text-white rounded py-2 px-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Changing Location Input
              <>
                {showPlaceNameInput ? (
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedPlace}
                      onChange={(e) => {
                        setSelectedPlace(e.target.value);
                        setInput(`Navigate to ${e.target.value}`); // Set input for display purposes
                      }}
                      className="flex-1 border rounded py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="bg-blue-500 hover:bg-blue-700 text-white rounded py-2 px-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPlaceNameInput(true)}
                    className="w-full bg-blue-500 hover:bg-blue-700 text-white rounded py-2 px-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    Change Map Location
                  </button>
                )}
              </>
            )}
            {/* Conditionally render these buttons */}
            {navigationDone && !isChangingLocation && (
              <button
                onClick={() => {
                  setIsChangingLocation(true);
                  setShowPlaceNameInput(true); // Show the location input
                  setInput("Change map location to [New Place Name]"); // Optionally set the input
                }}
                className="w-full bg-blue-500 hover:bg-blue-700 text-white rounded py-2 px-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
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
