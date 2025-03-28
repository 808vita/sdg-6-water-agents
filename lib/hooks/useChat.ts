// lib/hooks/useChat.ts
import { useState, useEffect } from "react";
import {
  Message,
  UserMessage,
  AssistantMessage,
} from "beeai-framework/backend/core";

// Extend the Message interface to include mapCommands
interface ChatMessage extends Message {
  sender: string;
  text: string;
  mapCommands?: { command: string; location: string }[];
}

interface ChatHookOptions {
  initialMessages?: ChatMessage[];
  onSend?: (message: ChatMessage[]) => Promise<ChatMessage | void>;
}

const useChat = (options: ChatHookOptions = {}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const storedMessages =
      typeof window !== "undefined"
        ? localStorage.getItem("chatMessages")
        : null;
    if (storedMessages) {
      try {
        return JSON.parse(storedMessages);
      } catch (e) {
        console.warn("Failed to parse stored messages", e);
        return [];
      }
    }
    return (options.initialMessages || [
      {
        sender: "bot",
        text: "Hello! How can I help you today?",
        role: "assistant",
        content: [],
      },
    ]) as ChatMessage[];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Save messages to local storage
    if (typeof window !== "undefined") {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      sender: "user",
      text: input,
      role: "user",
      content: [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (options.onSend) {
        const botMessage = (await options.onSend([
          ...messages,
          userMessage,
        ])) as ChatMessage;
        if (botMessage) {
          setMessages((prev) => [...prev, botMessage]);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I could not connect to the AI backend. Please try again later.",
          role: "assistant",
          content: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: "bot",
        text: "Hello! How can I help you today?",
        role: "assistant",
        content: [],
      },
    ]); // Clear the messages state
    if (typeof window !== "undefined") {
      localStorage.removeItem("chatMessages"); // Remove messages from local storage
    }
  };

  return {
    messages,
    input,
    isLoading,
    setInput,
    handleSend,
    clearChat,
  };
};

export default useChat;
