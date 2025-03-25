// app/api/watsonx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/ai/agent";
import { Message, UserMessage } from "beeai-framework/backend/core";

interface RequestBody {
  messages?: { sender: string; text: string }[];
}

type ValidMessageRole = "user" | "assistant" | "system" | "tool";

const mapSenderRole = (sender: string): ValidMessageRole => {
  switch (sender) {
    case "user":
      return "user";
    case "bot":
      return "assistant";
    default:
      return "system"; // Or handle the default case as needed
  }
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { messages } = (await req.json()) as RequestBody;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing or invalid messages array" },
        { status: 400 }
      );
    }

    const finalMessages = messages.map((msg) => {
      return Message.of({
        role: mapSenderRole(msg.sender),
        text: msg.text,
      });
    });
    const promptMessage = finalMessages.slice(-1)[0];
    if (!(promptMessage instanceof UserMessage)) {
      throw new Error(
        "This code only handles the recent user prompt and make sure the last message is from an user"
      );
    }

    // Create AI agent with tools and watsonx setup
    const agent = await createAgent(finalMessages);

    const response = await agent.run({ prompt: promptMessage.text });

    return NextResponse.json({ data: response.result.text });
  } catch (error) {
    console.error("watsonx AI Error", error);
    return NextResponse.json(
      { error: "Failed to interact with watsonx.ai" },
      { status: 500 }
    );
  }
}
