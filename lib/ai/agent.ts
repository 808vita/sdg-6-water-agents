// lib/ai/agent.ts
import { WatsonxChatModel } from "beeai-framework/adapters/watsonx/backend/chat";
import {
  WikipediaTool,
  WikipediaToolOutput,
} from "beeai-framework/tools/search/wikipedia";
import {
  DuckDuckGoSearchTool,
  DuckDuckGoSearchToolOutput,
} from "beeai-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";
import { Message, MessageContentPart } from "beeai-framework/backend/core";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { ToolCallingAgent } from "beeai-framework/agents/toolCalling/agent";

// Define types for agent responses
interface AgentResponse {
  success: boolean;
  data: any;
  error?: string;
}

// Abstract class for common agent functionality (if needed)
abstract class BaseAgent {
  protected llm: any; // WatsonxChatModel or similar

  constructor() {
    this.llm = new WatsonxChatModel("ibm/granite-3-8b-instruct");
  }

  // Helper function to handle agent errors consistently
  protected handleAgentError(agentName: string, error: any): AgentResponse {
    console.error(`${agentName} error:`, error);
    return {
      success: false,
      data: null,
      error: `${agentName} failed: ${error.message}`,
    };
  }

  abstract run(input: any): Promise<AgentResponse>;
}

// 1. Orchestrator Agent
class OrchestratorAgent extends BaseAgent {
  private weatherAgent: WeatherAgent;
  private newsAgent: NewsAgent;
  private climateResearcher: ClimateResearcher;
  private waterShortageForecastAgent: WaterShortageForecastAgent;
  private memory: UnconstrainedMemory; // Agent-level memory

  constructor() {
    super();
    this.weatherAgent = new WeatherAgent();
    this.newsAgent = new NewsAgent();
    this.climateResearcher = new ClimateResearcher();
    this.waterShortageForecastAgent = new WaterShortageForecastAgent();
    this.memory = new UnconstrainedMemory(); // Initialize memory
  }

  async run(
    userPrompt: string,
    chatHistory: Message[]
  ): Promise<AgentResponse> {
    try {
      // 1. Extract Location from user prompt (Delegate to LLM)
      const locationExtractionResponse = await this.extractLocation(
        userPrompt,
        chatHistory
      );
      if (!locationExtractionResponse.success) {
        return locationExtractionResponse;
      }
      const location = locationExtractionResponse.data;

      // Add user message to memory
      await this.memory.add(
        Message.of({ sender: "user", text: userPrompt, role: "user" })
      );

      // 2. Call Data Collection Agents
      const weatherResponse = await this.weatherAgent.run(location);
      const newsResponse = await this.newsAgent.run(location);
      const climateResponse = await this.climateResearcher.run(location);

      if (
        !weatherResponse.success ||
        !newsResponse.success ||
        !climateResponse.success
      ) {
        return {
          success: false,
          data: null,
          error: "Failed to collect data from one or more agents.",
        };
      }

      // 3. Call Water Shortage Forecast Agent
      const forecastResponse = await this.waterShortageForecastAgent.run({
        weather: weatherResponse.data,
        news: newsResponse.data,
        climate: climateResponse.data,
        location: location,
      });

      if (!forecastResponse.success) {
        return {
          success: false,
          data: null,
          error: "Failed to forecast water shortage.",
        };
      }

      // 4. Format Output (This is where you create the map commands)
      const { risk, summary } = forecastResponse.data;

      // Add bot message to memory
      await this.memory.add(
        Message.of({
          sender: "bot",
          text: `Risk ${risk} - Summary ${summary}`,
          role: "assistant",
        })
      );

      const mapCommands = [
        {
          command: "UPDATE_MARKER",
          location: location,
          risk: risk,
          summary: summary,
        },
      ];

      const messageText = `The water shortage risk in ${location} is ${risk}. ${summary}`;

      return {
        success: true,
        data: {
          messageText: messageText,
          mapCommands: mapCommands,
        },
      };
    } catch (error: any) {
      return this.handleAgentError("OrchestratorAgent", error);
    }
  }

  // LOCATION EXTRACTOR Agent
  private async extractLocation(
    prompt: string,
    chatHistory: Message[]
  ): Promise<AgentResponse> {
    try {
      const response = await this.llm.create({
        messages: [
          ...chatHistory.slice(-3), // Include last 3 messages from chat history
          Message.of({
            role: "system",
            text: "You are an expert at identifying locations from user prompts. Your sole task is to extract the location. The output can only be the location. Do not provide any additional information or conversational text.",
          }),
          Message.of({ role: "user", text: prompt }),
        ],
      });
      const extractedLocation = response.getTextContent().trim();
      return { success: true, data: extractedLocation };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: `Location Extraction failed: ${error.message}`,
      };
    }
  }
}

// 2. Weather Agent
class WeatherAgent extends BaseAgent {
  private openMeteoTool: OpenMeteoTool;

  constructor() {
    super();
    this.openMeteoTool = new OpenMeteoTool();
  }

  async run(location: string): Promise<AgentResponse> {
    try {
      // Use the 'getWeatherForecast' method from the OpenMeteoTool
      const locationObject = { name: location };
      const currentDate = new Date().toISOString().slice(0, 10);
      const weatherData = await this.openMeteoTool.run({
        location: locationObject,
        start_date: currentDate,
        end_date: currentDate,
      });
      return { success: true, data: weatherData.result };
    } catch (error: any) {
      return this.handleAgentError("WeatherAgent", error);
    }
  }
}

// 3. News Agent
class NewsAgent extends BaseAgent {
  private duckDuckGoSearchTool: DuckDuckGoSearchTool;

  constructor() {
    super();
    this.duckDuckGoSearchTool = new DuckDuckGoSearchTool();
  }

  async run(location: string): Promise<AgentResponse> {
    try {
      // Use the 'search' method from the DuckDuckGoSearchTool
      const searchResults = await this.duckDuckGoSearchTool.run({
        query: `water shortage in ${location}`,
      });
      return { success: true, data: searchResults.results };
    } catch (error: any) {
      return this.handleAgentError("NewsAgent", error);
    }
  }
}

// 4. Climate Researcher
class ClimateResearcher extends BaseAgent {
  private wikipediaTool: WikipediaTool;
  private duckDuckGoSearchTool: DuckDuckGoSearchTool; //Added the duckduckgo search tool

  constructor() {
    super();
    this.wikipediaTool = new WikipediaTool();
    this.duckDuckGoSearchTool = new DuckDuckGoSearchTool(); // Intialized here
  }

  async run(location: string): Promise<AgentResponse> {
    try {
      let climateData = await this.wikipediaTool.run({
        query: `${location} climate`,
      });
      //We are creating sanitation since both tools are providing different return for data
      let sanitizedResults;

      if (climateData && "results" in climateData) {
        // ClimateData is Wikipedia Tool
        sanitizedResults = (climateData as WikipediaToolOutput).results;
      } else {
        // ClimateData is DuckDuckGo Tool
        sanitizedResults = (climateData as DuckDuckGoSearchToolOutput).results;
      }

      return { success: true, data: sanitizedResults };
    } catch (error: any) {
      return this.handleAgentError("ClimateResearcher", error);
    }
  }
}

// 5. Water Shortage Forecast Agent
class WaterShortageForecastAgent extends BaseAgent {
  async run(input: {
    weather: any;
    news: any;
    climate: any;
    location: string;
  }): Promise<AgentResponse> {
    try {
      // *** IMPROVED RISK ASSESSMENT LOGIC ***
      let risk = "Low";
      let summary =
        "Based on available data, the risk of water shortage is currently low.";

      // Check weather data (example: low rainfall)
      if (
        input.weather &&
        input.weather.daily &&
        input.weather.daily.rain_sum
      ) {
        const rainSum = input.weather.daily.rain_sum[0];
        if (rainSum < 1) {
          risk = "Medium";
          summary += " Low rainfall is observed.";
        }
      }

      // Check news data (example: reports of shortages)
      if (input.news && input.news.results && input.news.results.length > 0) {
        const newsText = input.news.results
          .map((result: { description: any }) => result.description)
          .join(" ");
        if (newsText.toLowerCase().includes("water restrictions")) {
          risk = "High";
          summary += " News reports indicate water restrictions.";
        } else if (newsText.toLowerCase().includes("water shortage")) {
          risk = "Medium";
          summary += " News reports indicate water shortages.";
        }
      }

      // Check climate data (example: drought conditions)
      if (
        input.climate &&
        input.climate.results &&
        input.climate.results.length > 0
      ) {
        const climateText =
          typeof input.climate === "object"
            ? JSON.stringify(input.climate)
            : input.climate;
        if (climateText.toLowerCase().includes("drought")) {
          risk = "High";
          summary += " Climate reports indicate drought conditions.";
        }
      }

      // Add a more nuanced summary based on the combined data
      if (risk === "Medium") {
        summary =
          `A medium risk of water shortage is predicted in ${input.location}.` +
          summary;
      } else if (risk === "High") {
        summary =
          `A high risk of water shortage is predicted in ${input.location}! ` +
          summary;
      } else {
        summary =
          `A low risk of water shortage is predicted in ${input.location}.` +
          summary;
      }

      return { success: true, data: { risk: risk, summary: summary } };
    } catch (error: any) {
      return this.handleAgentError("WaterShortageForecastAgent", error);
    }
  }
}

// Export the Orchestrator Agent (the main entry point)
export const createWaterForecastingAgent = async () => {
  return new OrchestratorAgent();
};

export const createMapNavigationAgent = async () => {
  // Configuration for the ToolCallingAgent
  const llm = new WatsonxChatModel("ibm/granite-3-8b-instruct");
  return new ToolCallingAgent({
    llm,
    memory: new UnconstrainedMemory(),
    tools: [new DuckDuckGoSearchTool()], // A tool to be used
    meta: {
      name: "MapNavigationAgent",
      description:
        "Extracts a location from user prompts related to navigation or map requests, then can search the map for a specific location.",
    },
    templates: {
      system: (template) =>
        template.fork((config) => {
          config.defaults.instructions = `You are an expert at identifying locations from user prompts.
          Your sole task is to extract the location. After confirmation of extraction, proceed to search tool for the specified map.
          The output can only be the location. Do not provide any additional information or conversational text.`;
        }),
    },
  });
};
