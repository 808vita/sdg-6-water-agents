// lib/hooks/useChat.ts
import { useState, useEffect } from "react";

interface Message {
  sender: string;
  text: string;
  mapCommands?: { command: string; location: string }[];
  role?: string;
  content?: any;
}

interface ChatHookOptions {
  initialMessages?: Message[];
  onSend?: (message: Message[]) => Promise<Message | void>;
}

const useChat = (options: ChatHookOptions = {}) => {
  const [messages, setMessages] = useState<Message[]>(
    options.initialMessages || [
      { sender: "bot", text: "Hello! How can I help you today?" },
    ]
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load messages from local storage
    if (typeof window !== "undefined") {
      const storedMessages = localStorage.getItem("chatMessages");
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    }
  }, []);

  useEffect(() => {
    // Save messages to local storage
    if (typeof window !== "undefined") {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (options.onSend) {
        const botMessage = await options.onSend([...messages, userMessage]);
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
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ sender: "bot", text: "Hello! How can I help you today?" }]); // Clear the messages state
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
