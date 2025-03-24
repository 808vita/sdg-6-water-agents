// lib/ai/agent.ts
import {
  ToolCallingAgent,
  ToolCallingAgentInput,
} from "beeai-framework/agents/toolCalling/agent";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { ChatModel } from "beeai-framework/backend/core";
import { WatsonxChatModel } from "beeai-framework/adapters/watsonx/backend/chat";
import { WikipediaTool } from "beeai-framework/tools/search/wikipedia";
import { DuckDuckGoSearchTool } from "beeai-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";

export const createAgent = async () => {
  const llm = new WatsonxChatModel("ibm/granite-3-8b-instruct"); // Uses default model and takes care of API keys
  //const llm = ChatModel.fromName("watsonx"); // This can replace with what's defined above

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
