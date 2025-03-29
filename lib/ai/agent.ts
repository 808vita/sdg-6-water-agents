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
import { jsonrepair } from "jsonrepair";
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

  abstract run(input: any, chatHistory?: Message[]): Promise<AgentResponse>; // Modified for chat history
}

// 1. Orchestrator Agent - Router and Coordinator
class OrchestratorAgent extends BaseAgent {
  private weatherAgent: WeatherAgent;
  private newsAgent: NewsAgent;
  private climateResearcher: ClimateResearcher;
  private waterShortageForecastAgent: WaterShortageForecastAgent;
  private generalKnowledgeAgent: GeneralKnowledgeAgent; // NEW
  private memory: UnconstrainedMemory; // Agent-level memory

  constructor() {
    super();
    this.weatherAgent = new WeatherAgent();
    this.newsAgent = new NewsAgent();
    this.climateResearcher = new ClimateResearcher();
    this.waterShortageForecastAgent = new WaterShortageForecastAgent();
    this.generalKnowledgeAgent = new GeneralKnowledgeAgent(); // Initialize
    this.memory = new UnconstrainedMemory(); // Initialize memory
  }

  async run(
    userPrompt: string,
    chatHistory: Message[]
  ): Promise<AgentResponse> {
    try {
      // Add user message to memory
      await this.memory.add(
        Message.of({ sender: "user", text: userPrompt, role: "user" })
      );

      // 1. Intent Recognition
      const intent = await this.recognizeIntent(userPrompt, chatHistory);
      console.log("Recognized intent:", intent); // ADDED

      let response: AgentResponse;

      switch (intent.agent) {
        case "weather":
          console.log("Calling WeatherAgent"); //ADDED
          const location =
            intent.location ||
            (await this.extractLocation(userPrompt, chatHistory)).data;
          if (!location) {
            return {
              success: false,
              data: null,
              error: "Could not determine location for weather.",
            };
          }
          response = await this.weatherAgent.run(location);
          break;
        case "waterShortage":
          console.log("Calling WaterShortageForecastAgent"); //ADDED
          // Extract location (if not already provided)
          const locationForWaterShortage =
            intent.location ||
            (await this.extractLocation(userPrompt, chatHistory)).data;

          if (!locationForWaterShortage) {
            return {
              success: false,
              data: null,
              error:
                "Could not determine location for water shortage forecast.",
            };
          }

          //Run data collecting agents only in this case.
          console.log("calling weather agent for water shortage");
          const weatherResponse = await this.weatherAgent.run(
            locationForWaterShortage
          );
          console.log("Weather response:", weatherResponse);
          console.log("calling news agent for water shortage");
          const newsResponse = await this.newsAgent.run(
            locationForWaterShortage
          );
          console.log("news response:", newsResponse);
          console.log("calling climate agent for water shortage");
          const climateResponse = await this.climateResearcher.run(
            locationForWaterShortage
          );
          console.log("climate response", climateResponse);

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
          response = await this.waterShortageForecastAgent.run({
            weather: weatherResponse.data,
            news: newsResponse.data,
            climate: climateResponse.data,
            location: locationForWaterShortage,
          });
          break;
        case "general":
          console.log("Calling GeneralKnowledgeAgent"); //ADDED
          response = await this.generalKnowledgeAgent.run(userPrompt);
          break;
        default:
          response = {
            success: false,
            data: null,
            error: "Could not determine the intent of your request.",
          };
      }

      if (!response.success) {
        return response;
      }

      // Add bot message to memory (adjust as needed based on agent response)
      await this.memory.add(
        Message.of({
          sender: "bot",
          text: response.data.messageText || JSON.stringify(response.data), //Adjust data property names if needed
          role: "assistant",
        })
      );

      return response;
    } catch (error: any) {
      return this.handleAgentError("OrchestratorAgent", error);
    }
  }

  // INTENT RECOGNITION Agent
  private async recognizeIntent(
    prompt: string,
    chatHistory: Message[]
  ): Promise<{ agent: string; location?: string }> {
    try {
      const response = await this.llm.create({
        messages: [
          ...chatHistory.slice(-3), // Include last 3 messages from chat history
          Message.of({
            role: "system",
            text: `You are an expert at determining the user's intent from their prompts.
                   Possible intents:
                   - weather:  The user is asking about the weather in a specific location.
                   - waterShortage: The user is asking about water shortage risks or information in a specific location.
                   - general: The user is asking a general question, greeting, or requesting help.

                   Respond ONLY with a JSON object with the 'agent' key set to the appropriate intent.  If a location is clearly specified, include a 'location' key.
                   Examples:
                   {"agent": "weather", "location": "London"}
                   {"agent": "waterShortage"}
                   {"agent": "general"}

                   Do not provide any additional information or conversational text.`,
          }),
          Message.of({ role: "user", text: prompt }),
        ],
      });

      const intent = JSON.parse(jsonrepair(response.getTextContent().trim()));
      return intent;
    } catch (error: any) {
      console.error("Intent Recognition error:", error);
      return { agent: "general" }; // Default to general if intent recognition fails
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

  async run(location: string, chatHistory?: Message[]): Promise<AgentResponse> {
    // Modified
    try {
      // Use the 'getWeatherForecast' method from the OpenMeteoTool
      const locationObject = { name: location };
      const currentDate = new Date().toISOString().slice(0, 10);
      console.log("Calling OpenMeteoTool with location:", locationObject); // ADDED
      const weatherData = await this.openMeteoTool.run({
        location: locationObject,
        start_date: currentDate,
        end_date: currentDate,
      });

      console.log("OpenMeteoTool response:", weatherData); // ADDED

      const { current, daily } = weatherData.result;

      const messageText = `Current weather in ${location}:
      Temperature: ${current.temperature_2m}°C
      Relative Humidity: ${current.relative_humidity_2m}%
      Wind Speed: ${current.wind_speed_10m} km/h
      Rainfall Today: ${daily.rain_sum[0]} mm
      Maximum Temperature Today: ${daily.temperature_2m_max[0]}°C
      Minimum Temperature Today: ${daily.temperature_2m_min[0]}°C
      `;
      return {
        success: true,
        data: { messageText, weatherData: weatherData.result },
      }; // Enhanced data
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

  async run(location: string, chatHistory?: Message[]): Promise<AgentResponse> {
    try {
      // Use the 'search' method from the DuckDuckGoSearchTool
      console.log(
        "Calling DuckDuckGoSearchTool with query:",
        `water shortage in ${location}`
      ); // ADDED
      const searchResults = await this.duckDuckGoSearchTool.run({
        query: `water shortage in ${location}`,
      });
      console.log("DuckDuckGoSearchTool response:", searchResults); // ADDED
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

  async run(location: string, chatHistory?: Message[]): Promise<AgentResponse> {
    try {
      console.log("Calling WikipediaTool with query:", `${location} climate`); // ADDED
      let climateData = await this.wikipediaTool.run({
        query: `${location} climate`,
      });
      console.log("WikipediaTool response:", climateData); // ADDED
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

// NEW: 6. Risk Assessment Agent
class RiskAssessmentAgent extends BaseAgent {
  async run(
    input: {
      weather: any;
      news: any;
      climate: any;
      location: string;
    },
    chatHistory?: Message[]
  ): Promise<AgentResponse> {
    try {
      const riskAssessmentPrompt = `You are an expert at assessing water shortage risk based on weather, news, and climate data for a given location.
            Analyze the following data and determine the water shortage risk level (Low, Medium, or High). Provide a detailed explanation of your reasoning, citing specific evidence from the data.
            Also provide links to relevant source

            Weather Data: ${JSON.stringify(input.weather)}
            News Data: ${JSON.stringify(input.news)}
            Climate Data: ${JSON.stringify(input.climate)}
            Location: ${input.location}

            Respond with a JSON object containing:
            - "risk": (Low, Medium, or High)
            - "summary": A short summary of the risk assessment.
            - "reasoning": A detailed explanation of your reasoning, citing evidence.
            - "sources": An array of URLs to relevant sources.

            Example:
            {
                "risk": "Medium",
                "summary": "The water shortage risk in London is medium due to low rainfall and some concerning news reports.",
                "reasoning": "Rainfall has been low in the past week (cite weather data). News reports indicate potential water restrictions (cite news articles).",
                "sources": ["url1", "url2"]
            }
            `;

      const response = await this.llm.create({
        messages: [
          Message.of({
            role: "system",
            text: riskAssessmentPrompt,
          }),
        ],
      });

      const assessment = JSON.parse(
        jsonrepair(response.getTextContent().trim())
      );
      return { success: true, data: assessment };
    } catch (error: any) {
      return this.handleAgentError("RiskAssessmentAgent", error);
    }
  }
}

// NEW: Define a type for the Risk Assessment Data for better type safety
interface RiskAssessmentData {
  risk: string;
  summary: string;
  reasoning: any; // Or potentially `any` or a specific type if the structure is well-defined
  sources: string[];
}

// 5. Water Shortage Forecast Agent (Modified)
class WaterShortageForecastAgent extends BaseAgent {
  private riskAssessmentAgent: RiskAssessmentAgent;

  constructor() {
    super();
    this.riskAssessmentAgent = new RiskAssessmentAgent();
  }

  async run(
    input: {
      weather: any;
      news: any;
      climate: any;
      location: string;
    },
    chatHistory?: Message[]
  ): Promise<AgentResponse> {
    try {
      let details = "Data Collection:\n"; // Start building detailed explanation

      // Summarize Weather Data
      let weatherSummary = "No weather data available.\n";
      if (
        input.weather &&
        input.weather.weatherData &&
        input.weather.weatherData.daily
      ) {
        const rainSum = input.weather.weatherData.daily.rain_sum[0];
        weatherSummary = `Rainfall sum today is ${rainSum}mm.\n`;
        details += `Weather: ${weatherSummary}`;
      } else {
        details += "Weather: No weather data available.\n";
      }

      // Summarize News Data
      let newsSummary = "No news articles found related to water shortage.\n";
      let newsSources: string[] = [];
      if (input.news && input.news.length > 0) {
        newsSummary = `Found ${input.news.length} news articles.\n`;
        newsSources = input.news.map((result: { url: string }) => result.url);
        details += `News: ${newsSummary}`;
      } else {
        details += "News: No news articles found related to water shortage.\n";
      }

      // Summarize Climate Data
      let climateSummary = "No climate data available.\n";
      if (input.climate && input.climate.length > 0) {
        climateSummary = `Climate data available.\n`;
        details += `Climate: ${climateSummary}`;
      } else {
        details += "Climate: No climate data available.\n";
      }

      // Call Risk Assessment Agent
      const assessmentResponse = await this.riskAssessmentAgent.run({
        weather: weatherSummary,
        news: input.news,
        climate: input.climate,
        location: input.location,
      });

      if (!assessmentResponse.success) {
        return assessmentResponse;
      }

      //  Safely parse the assessment data using the type and JSON.stringify
      let assessment: RiskAssessmentData;
      try {
        assessment = JSON.parse(
          jsonrepair(JSON.stringify(assessmentResponse.data))
        );
      } catch (parseError: any) {
        console.error("Error parsing assessment data:", parseError);
        return {
          success: false,
          data: null,
          error: `Failed to parse risk assessment data: ${parseError.message}`,
        };
      }

      const { risk, summary, reasoning, sources } = assessment;

      const messageText = `The water shortage risk in ${
        input.location
      } is ${risk}. ${summary}\n\n${details}\n\nReasoning: ${
        typeof reasoning === "string" ? reasoning : JSON.stringify(reasoning)
      }\n\nSources: ${sources.join(", ")}`;

      const mapCommands = [
        {
          command: "UPDATE_MARKER",
          location: input.location,
          risk: risk,
          summary: summary,
        },
      ];

      return {
        success: true,
        data: {
          risk: risk,
          summary: summary,
          messageText: messageText,
          mapCommands: mapCommands,
          reasoning: reasoning,
          sources: sources,
        },
      };
    } catch (error: any) {
      return this.handleAgentError("WaterShortageForecastAgent", error);
    }
  }
}

// 6. General Knowledge Agent - Handles greetings, help, etc.
class GeneralKnowledgeAgent extends BaseAgent {
  async run(prompt: string, chatHistory?: Message[]): Promise<AgentResponse> {
    try {
      const response = await this.llm.create({
        messages: [
          Message.of({
            role: "system",
            text: `You are a helpful and friendly AI assistant. You can answer general questions, provide greetings, and offer assistance. If you don't know the answer, say you don't know.`,
          }),
          Message.of({ role: "user", text: prompt }),
        ],
      });

      const messageText = response.getTextContent().trim();
      return { success: true, data: { messageText } };
    } catch (error: any) {
      return this.handleAgentError("GeneralKnowledgeAgent", error);
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
