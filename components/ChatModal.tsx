"use client";
import React, { useState, useEffect, useRef } from "react";

export default function ChatModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([
    { sender: "bot", text: "Hello! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedMessages = localStorage.getItem("chatMessages");
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/watsonx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: messages.concat(userMessage) }), // Send the chat history
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.data || "Sorry, I received an empty response.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I could not connect to the AI backend. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ sender: "bot", text: "Hello! How can I help you today?" }]); // Clear the messages state
    localStorage.removeItem("chatMessages"); // Remove messages from local storage
  };

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
        <button
          onClick={() => setIsOpen(false)}
          className="focus:outline-none text-gray-500 hover:text-gray-700"
        >
          X
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
}
