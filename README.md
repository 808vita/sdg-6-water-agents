
![AquaForecaster-cover](https://github.com/user-attachments/assets/417b2022-2f27-48b1-9f44-469178bd0adc)
# Aqua Forecaster

## Introduction

AquaForecaster uses AI, powered by IBM watsonx.ai and the `beeai-framework`, to simplify access to and understanding of information related to water resources.

**Problem:** Accessing and understanding information related to water resources can be challenging due to the distribution and collection of relevant facts, news and data.

**Solution:** AquaForecaster provides a simplified solution for accessing this information.

## Key Technologies

*   **`beeai-framework`:** Used for AI agent orchestration.
*   **IBM watsonx.ai:** Powers AI insights and data analysis using the Granite Series models to translate the data into human text in the chat.

## Features

*   **Orchestrated Information:** The `OrchestratorAgent` manages key components.
*   **Automated Data Collection:** Agents gather data (Weather, News, Climate) using various tools.
*   **Actionable insights:** The `WaterShortageForecastAgent` combines data, and presents these insights. The agent uses IBM Granite Series models to provide action in the chat. The recommendations and summary is in the chat.
*   **Accessibility:** Presents its results via the chat system.

## Setup Instructions

1.  **Clone the repository**

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment variables:**

    Create a `.env` file in the project root with the following variables:

    ```
    WATSONX_API_KEY=[YOUR_WATSONX_API_KEY]
    WATSONX_PROJECT_ID=[YOUR_WATSONX_PROJECT_ID]
    WATSONX_REGION=[YOUR_WATSONX_REGION]
    ```

    *   Obtain these credentials from your IBM Cloud account.


## Commands

*   **Local Development Server:**

    ```bash
    npm run dev
    ```

*   **Build for Production:**

    ```bash
    npm run build
    ```

*   **Start in Production:**

    ```bash
    npm run start
    ```

*   **Update / Generate Docs:**

    ```bash
    npm run docs
    ```
    Visit docs by navigating to `/docs/index.html` (when the server is running).

## AI Agent Details (from AquaForecaster):
![aquaforecaster-agents](https://github.com/user-attachments/assets/ffac3a70-ea52-4b31-8ed3-1246163cc925)

AquaForecaster leverages both the `beeai-framework` and IBM watsonx.ai through a multi-agent structure. This structure enables the user to better consume and understand water resources through its design of its AI agents.

*   **Core agents include:**
    *   `OrchestratorAgent` using the `beeai-framework`: This agent receives user requests, directs requests, manages the key workflows.

    *   Data gathering agents: Weather, climate, news agents perform this action and feed results to the other agents. They are able to retrieve the data given certain tool, which are public and easily accessible.

    *   `WaterShortageForecastingAgent`: This takes insight the data from the agents.

The IBM Granite Series models are used to translate the data into human text in the chat.
The goal is to deliver relevant insights based on credible facts.

