// app/api/agent/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createWaterForecastingAgent,
  createMapNavigationAgent,
} from "@/lib/ai/agent";
import { Message, UserMessage } from "beeai-framework/backend/core";
import { StringToolOutput } from "beeai-framework/tools/base";

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
      promptMessage.text.includes("navigate") ||
      promptMessage.text.includes("map")
    ) {
      const agent = await createMapNavigationAgent();
      const response = await agent.run({ prompt: promptMessage.text });
      const MockGetCoordinates = new StringToolOutput(
        JSON.stringify({
          coordinates: { latitude: 4.2105, longitude: 101.9758 },
          message: "Navigate to Malaysia",
        })
      );
      return NextResponse.json({ data: JSON.stringify(MockGetCoordinates) });
    } else {
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
