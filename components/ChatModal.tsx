// components/ChatModal.tsx
"use client";

import React, { useRef, useEffect } from "react";
import useChat from "@/lib/hooks/useChat";

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

          const data = await response.json();
          return {
            sender: "bot",
            text: data.data || "Sorry, I received an empty response.",
          };
        } catch (error) {
          return {
            sender: "bot",
            text: "Sorry, I could not connect to the AI backend. Please try again later.",
          };
        }
      },
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-50 border border-gray-300 rounded-lg shadow-xl flex flex-col overflow-y-scroll max-h-3/4">
      <div className="flex items-center justify-between p-4 border-b bg-gray-100">
        <h2 className="font-semibold text-gray-800">Customer Support</h2>
        <button
          onClick={clearChat}
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
