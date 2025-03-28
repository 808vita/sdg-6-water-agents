// app/api/watsonx/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createWaterForecastingAgent,
  createMapNavigationAgent,
} from "@/lib/ai/agent";
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

const idetifiers = ["navigate", "map", "move to", "set", "show", "locate"];

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { messages } = (await req.json()) as RequestBody;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing or invalid messages array" },
        { status: 400 }
      );
    }

    const finalMessages = messages.map((msg) =>
      Message.of({
        role: mapSenderRole(msg.sender),
        text: msg.text,
      })
    );

    const promptMessage = finalMessages.slice(-1)[0];
    if (!(promptMessage instanceof UserMessage)) {
      throw new Error(
        "This code only handles the recent user prompt and make sure the last message is from an user"
      );
    }

    if (
      idetifiers.some((keyword) =>
        promptMessage.text.toLowerCase().includes(keyword)
      )
    ) {
      // NAVIGATION AGENT
      const agent = await createMapNavigationAgent();
      const response = await agent.run({ prompt: promptMessage.text });

      // Parse structured action from agent's final answer
      const location = response.result.text; // e.g., Malaysia, Chennai, Delhi
      const command = `SET_MARKER|${location}`; // Format: "SET_MARKER|Location"
      return NextResponse.json({ data: command });
    } else {
      // WATER FORECASTING AGENT
      const agent = await createWaterForecastingAgent();
      const response = await agent.run(promptMessage.text, finalMessages); // pass the prompt and the chat history

      if (!response.success) {
        // Handle the error case
        console.error("watsonx AI Error", response.error);
        return NextResponse.json({ error: response.error }, { status: 500 });
      }

      // Extract data and format response
      const { messageText, mapCommands } = response.data;

      return NextResponse.json({
        data: {
          messageText,
          mapCommands,
        },
      });
    }
  } catch (error: any) {
    console.error("watsonx AI Error", error);
    return NextResponse.json(
      { error: `Failed to interact with watsonx.ai: ${error.message}` },
      { status: 500 }
    );
  }
}
