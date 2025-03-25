// lib/ai/agent.ts
import { AgentWorkflow } from "beeai-framework/workflows/agent";
import { WatsonxChatModel } from "beeai-framework/adapters/watsonx/backend/chat";
import { WikipediaTool } from "beeai-framework/tools/search/wikipedia";
import { DuckDuckGoSearchTool } from "beeai-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";

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
    name: "Researcher",
    role: "A diligent researcher specializing in environmental science",
    instructions:
      "You look up and provide detailed information about climate, weather patterns, and water resources.Please be very concise.",
    tools: [new WikipediaTool(), new DuckDuckGoSearchTool()],
    llm,
  });

  // Add a WeatherForecaster agent to provide weather reports
  workflow.addAgent({
    name: "WeatherForecaster",
    role: "A skilled weather reporter who delivers very concise reports and forecasts.",
    instructions:
      "You provide very concise & precise weather reports and forecasts. Use only celcius values. Please be very concise. Word limit of 80 words.",
    tools: [new OpenMeteoTool()],
    llm,
  });

  // Add a MapNavigationAgent to understand navigation requests
  workflow.addAgent({
    name: "MapNavigator",
    role: "An assistant specialized in map navigation",
    instructions:
      "You understand user requests to navigate to specific locations and respond with structured data for the frontend to use. Always return a JSON object with the follow structure  {`coordinates`:{latitude:number, longitude:number}, `message`: string}. This needs to be the only job for this tool",
    tools: [], // Map navigation might not require tools or may use Geocoding APIs, etc.
    llm,
  });

  // Add a DataSynthesizer agent to combine information
  workflow.addAgent({
    name: "DataSynthesizer",
    role: "A meticulous and creative data synthesizer",
    instructions:
      "You combine disparate information into a final, coherent, and user-friendly summary.Please be very concise.",
    llm,
  });

  return workflow;
};
