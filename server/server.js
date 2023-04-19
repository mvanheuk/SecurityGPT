import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { Configuration, OpenAIApi } from 'openai';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from CodeX!',
  });
});

// Create a variable to store the conversation history
let conversationHistory = [
  { role: 'system', content: 'You are a helpful Security focused assistant called SecurityGPT.' },
];

function truncateConversation(history, maxTokens) {
  let currentTokens = 0;
  let truncatedHistory = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const messageTokens = history[i].content.length + 2; // Add 2 for role and content keys
    if (currentTokens + messageTokens > maxTokens) {
      break;
    }
    truncatedHistory.unshift(history[i]);
    currentTokens += messageTokens;
  }

  return truncatedHistory;
}


app.post('/', async (req, res) => {
  try {
    const userMessage = req.body.prompt;
    const model = 'gpt-3.5-turbo';

    // Add the user's message to the conversation history
    conversationHistory.push({ role: 'user', content: userMessage });

    // Truncate the conversation history to stay within the token limit
    const maxTokens = 4096 - 100; // Reserve some tokens for the API response
    const truncatedHistory = truncateConversation(conversationHistory, maxTokens);

    const response = await openai.createChatCompletion({
      model: model,
      messages: truncatedHistory,
      max_tokens: 4000,
    });

    console.log('API response:', response);

    // Add the bot's message to the conversation history
    conversationHistory.push({ role: 'assistant', content: response.data.choices[0].message.content });

    res.status(200).send({
      bot: response.data.choices[0].message.content,
    });
  } catch (error) {
    console.error('Error during API call:', error.message, error.response?.data);
    res.status(500).send('Something went wrong');
  }
});

app.post('/clear_conversation', (req, res) => {
  // Reset the conversationHistory variable
  conversationHistory = [
    { role: 'system', content: 'You are a helpful Security focused assistant called SecurityGPT.' },
  ];
  res.sendStatus(200); // Send a success status code
});

app.listen(5000, () => console.log('AI server started on http://localhost:5000'));