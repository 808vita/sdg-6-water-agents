// components/ChatModal.tsx
"use client";

import React, { useRef, useEffect } from "react";
import useChat from "@/lib/hooks/useChat";
import { useMapContext } from "@/lib/context/MapContext";
import { Message, MessageContentPart } from "beeai-framework/backend/core";

// Extend the Message interface to include mapCommands
interface ChatMessage extends Message {
  mapCommands?: { command: string; location: string }[];
}

const ChatModal = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, input, isLoading, setInput, handleSend, clearChat } =
    useChat({
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
          };
        }
      },
    });

  const { setLastMessage, setMarkers } = useMapContext(); // Access setMarkers from context

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Verify if message can be parsed and there is mapCommands
      if (
        lastMessage?.sender === "bot" &&
        typeof lastMessage === "object" &&
        lastMessage !== null &&
        "mapCommands" in lastMessage &&
        Array.isArray((lastMessage as ChatMessage).mapCommands)
      ) {
        setLastMessage(lastMessage as ChatMessage);
        console.log(lastMessage);
      }
    }
  }, [messages, setLastMessage]);

  const handleClearChat = () => {
    clearChat(); // Clear the messages state
    setMarkers([]); // Clear the map markers
    if (typeof window !== "undefined") {
      localStorage.removeItem("mapMarkers"); // Clear map markers from local storage
    }
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
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 border rounded p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-700 text-white rounded p-2 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
