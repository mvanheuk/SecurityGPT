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

let currentModel = 'gpt-3.5-turbo'; // Initialize the currentModel variable

function truncateConversation(history, maxCompletionTokens) {
  const maxTokens = 4096 - maxCompletionTokens;
  let currentTokens = 0;
  let truncatedHistory = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const messageTokens = history[i].content.split(' ').length + 2; // Use word count as a rough estimate for tokens
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
    const model = req.body.model; // Use the model from the request or the currentModel
    const recognizedText = req.body.recognizedText; // Get the recognized text from the request

    // Add the TesseractImage2Text role to the conversation history if the recognized text is present
    if (recognizedText) {
      conversationHistory.push({ role: 'user', content: `RecognizedTextFromImage: ${recognizedText}` });
    }

    // Add the user's message to the conversation history
    conversationHistory.push({ role: 'user', content: userMessage });

    const maxCompletionTokens = 350;
    const truncatedHistory = truncateConversation(conversationHistory, maxCompletionTokens);

    const response = await openai.createChatCompletion({
      model: model,
      messages: truncatedHistory,
      max_tokens: maxCompletionTokens,
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

// Add a new route to handle model changes
app.post('/change-model', (req, res) => {
  const model = req.body.model;
  if (model) {
    currentModel = model;
    res.sendStatus(200);
  } else {
    res.status(400).send('Invalid model');
  }
});

app.post('/clear', (req, res) => {
  // Reset the conversationHistory variable
  conversationHistory = [
    { role: 'system', content: 'You are a helpful Security focused assistant called SecurityGPT.' },
  ];
  res.sendStatus(200); // Send a success status code
});

app.listen(5000, () => console.log('AI server started on http://localhost:5000'));