// lib/ai/agent.ts
import { AgentWorkflow } from "beeai-framework/workflows/agent";
import { WatsonxChatModel } from "beeai-framework/adapters/watsonx/backend/chat";
import { WikipediaTool } from "beeai-framework/tools/search/wikipedia";
import { DuckDuckGoSearchTool } from "beeai-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";
import { ToolCallingAgent } from "beeai-framework/agents/toolCalling/agent";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";

// Define the workflow name
const workflowName = "WaterForecastingAssistant";

// Export the function to create the agent workflow
export const createWaterForecastingAgent = async () => {
  // Create a new agent workflow with the defined name
  const workflow = new AgentWorkflow(workflowName);

  // Define the LLM (now using WatsonxChatModel directly)
  const llm = new WatsonxChatModel("ibm/granite-3-8b-instruct");

  // Add a Researcher agent to look up information
  workflow.addAgent({
    name: "WaterResourceResearcher",
    role: "An environmental scientist specializing in water resources",
    instructions:
      "You research and provide concise, accurate information about water availability, climate change impacts on water resources, and potential water shortage risks. Focus on factual data and reliable sources. Use a word limit of 70 words.",
    tools: [new WikipediaTool(), new DuckDuckGoSearchTool()],
    llm,
  });

  // Add a WeatherForecaster agent to provide weather reports
  workflow.addAgent({
    name: "LocalizedWeatherForecaster",
    role: "A skilled weather reporter providing concise, location-specific forecasts",
    instructions:
      "You provide very concise & precise weather reports and forecasts, specifically tailored to the user's requested location. Use only Celsius values. Use a word limit of 60 words. If there is information asked out of your expertise, you should tell me politely i can't. Always return the results as an JSON which the properties 'message' describes the information and a property named 'highrisk : boolean'.",
    tools: [new OpenMeteoTool()],
    llm,
  });

  // Add a DataSynthesizer agent to combine information
  workflow.addAgent({
    name: "WaterShortageRiskAssessor",
    role: "A water resources analyst specializing in risk asessment",
    instructions:
      "You assess the risk of water shortages based on weather data, resource availability, and other relevant factors. You will give your conclusions with a json which `riskLevel` can only be one of the three option (high, medium, low), it should give the information as a property called the `assessment`. You must be friendly with the users",
    llm,
  });

  return workflow;
};

// Export the function to create the Map Navigation agent
export const createMapNavigationAgent = async () => {
  // Define the LLM
  const llm = new WatsonxChatModel("ibm/granite-3-8b-instruct");

  return new ToolCallingAgent({
    llm,
    memory: new UnconstrainedMemory(),
    tools: [],
    meta: {
      name: "MapNavigationAgent",
      description:
        "Extracts a location from user prompts related to navigation or map requests.",
    },
    templates: {
      system: (template) =>
        template.fork((config) => {
          config.defaults.instructions = `You are an expert at identifying locations from user prompts. 
          Your sole task is to extract the location. Do not provide any additional information or conversational text.
          The output can only be the location.`;
        }),
    },
  });
};
