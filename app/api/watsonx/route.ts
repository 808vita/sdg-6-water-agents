// app/api/watsonx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/ai/agent"; // Import the agent we'll create
import { Message } from "beeai-framework/backend/core";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Create AI agent with tools and watsonx setup
    const agent = await createAgent();

    const response = await agent.run({ prompt: prompt });

    return NextResponse.json({ data: response.result.text });
  } catch (error) {
    console.error("watsonx AI Error", error);
    return NextResponse.json(
      { error: "Failed to interact with watsonx.ai" },
      { status: 500 }
    );
  }
}
