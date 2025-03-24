// lib/ai/agent.ts
import {
  ToolCallingAgent,
  ToolCallingAgentInput,
} from "beeai-framework/agents/toolCalling/agent";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { ChatModel } from "beeai-framework/backend/core";
import { WatsonxChatModel } from "beeai-framework/adapters/watsonx/backend/chat";
import { WatsonxClient } from "beeai-framework/adapters/watsonx/backend/client";
import { WikipediaTool } from "beeai-framework/tools/search/wikipedia";
import { DuckDuckGoSearchTool } from "beeai-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";

interface CreateAgentOptions {
  watsonxApiKey: string;
  watsonxProjectId: string;
  watsonxModelId: string;
}

export const createAgent = async (options: CreateAgentOptions) => {
  const client = new WatsonxClient({
    // construct watsonx client here
    apiKey: options.watsonxApiKey,
    projectId: options.watsonxProjectId,
  });
  const llm = new WatsonxChatModel(options.watsonxModelId, client); //uses the client here

  const agentInput: ToolCallingAgentInput = {
    llm: llm,
    memory: new UnconstrainedMemory(),
    tools: [
      new WikipediaTool(),
      new DuckDuckGoSearchTool(),
      new OpenMeteoTool(),
    ], // Configured with basic tools
  };
  return new ToolCallingAgent(agentInput);
};
