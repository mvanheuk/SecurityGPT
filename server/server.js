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
  { role: 'system', content: 'Analyze the user input, which may consist of text or image context (Recognized Text, Labels, Web Data, etc.) provided by the Google Cloud Vision API. When an image is submitted, use all aspects of the image for a comprehensive description, unless the user specifies otherwise (Do not simply list labels, but rather use them as context for describing the images content). For text inputs, engage in a conversation addressing user concerns or questions related to security and other topics. In all cases, be sure to offer any additional information the user might need in relation to their input.'},
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
    const recognizedWeb = req.body.webDetectionResults;

    // Add the TesseractImage2Text role to the conversation history if the recognized text is present
    if (recognizedText) {
      conversationHistory.push({ role: 'user', content: `RecognizedTextFromImage: ${recognizedText}` });
    }

    if (recognizedLabels) {
      conversationHistory.push({ role: 'user', content: `recognizedLabels: ${recognizedLabels}` });
    }

    if (recognizedWeb) {
      conversationHistory.push({ role: 'user', content: `recognizedWeb: ${recognizedWeb}` });
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

    const [webResults] = await client.webDetection({image: {content: imageBase64}});
    const webEntities = webResults.webDetection.webEntities.map(entity => entity.description).join(', ');

    console.log('Recognized text to be sent to the client:', recognizedText);
    console.log('Recognized labels to be sent to the client:', labels);
    console.log('Web Detection', webEntities);
    res.status(200).send({ recognizedImageText: recognizedText, recognizedLabels: labels, webDetectionResults: webEntities });
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
    { role: 'system', content: 'Analyze the user input, which may consist of text or image context (Recognized Text, Labels, Web Data, etc.) provided by the Google Cloud Vision API. When an image is submitted, use all aspects of the image for a comprehensive description, unless the user specifies otherwise (Do not simply list labels, but rather use them as context for describing the images content). For text inputs, engage in a conversation addressing user concerns or questions related to security and other topics. In all cases, be sure to offer any additional information the user might need in relation to their input.' },
  ];
  res.sendStatus(200); // Send a success status code
});

app.listen(5000, () => console.log('AI server started on http://localhost:5000'));