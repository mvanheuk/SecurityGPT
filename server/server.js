import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { Configuration, OpenAIApi } from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import bodyParser from 'body-parser';


let recognizedImageText = '';

const encodedCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
if (encodedCredentials) {
  const credentialsBuffer = Buffer.from(encodedCredentials, 'base64');
  const credentialsJson = credentialsBuffer.toString('utf-8');
  const tmpDir = os.tmpdir();
  const credentialsPath = path.join(tmpDir, 'google_application_credentials.json');
  fs.writeFileSync(credentialsPath, credentialsJson);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

import vision from '@google-cloud/vision';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const client = new vision.ImageAnnotatorClient();

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from CodeX!',
  });
});

// Create a variable to store the conversation history
let conversationHistory = [
  { role: 'system', content: 'You are a helpful Security focused assistant called SecurityGPT. You have the ability to pull context from images using Google Cloud Vission API, image text or labels are saved as RecognizedTextFromImage or recognizedLabels within conversations.'},
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
    const recognizedLabels = req.body.recognizedLabels;

    // Add the TesseractImage2Text role to the conversation history if the recognized text is present
    if (recognizedText) {
      conversationHistory.push({ role: 'user', content: `RecognizedTextFromImage: ${recognizedText}` });
    }

    if (recognizedLabels) {
      conversationHistory.push({ role: 'user', content: `recognizedLabels: ${recognizedLabels}` });
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

app.post('/process-image', async (req, res) => {
  const imageBase64 = req.body.imageBase64;

  try {
    let [textResult] = await client.textDetection({image: {content: imageBase64}});
    let recognizedText = textResult.fullTextAnnotation?.text;

    const [labelResult] = await client.labelDetection({image: {content: imageBase64}});
    const labels = labelResult.labelAnnotations.map(annotation => annotation.description).join(', ');

    console.log('Recognized text to be sent to the client:', recognizedText);
    console.log('Recognized labels to be sent to the client:', labels);
    res.status(200).send({ recognizedImageText: recognizedText, recognizedLabels: labels });
  } catch (error) {
    console.error('Error during Vision API call:', error.message);
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