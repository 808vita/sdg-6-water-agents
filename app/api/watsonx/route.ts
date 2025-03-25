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
const idetifiers = ["navigate", "map", "move to", "set", "show", "locate"];
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
      // promptMessage.text.includes("navigate") ||
      // promptMessage.text.includes("map") ||
      // promptMessage.text.includes("move to") ||
      // promptMessage.text.includes("set")
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
      const workflow = await createWaterForecastingAgent();
      const response = await workflow.run([
        { prompt: promptMessage.text }, // all to create to one prompt.
      ]);
      return NextResponse.json({ data: response.result.finalAnswer });
    }
  } catch (error) {
    console.error("watsonx AI Error", error);
    return NextResponse.json(
      { error: "Failed to interact with watsonx.ai" },
      { status: 500 }
    );
  }
}
