import express from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { Configuration, OpenAIApi } from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import bodyParser from 'body-parser';
import Parser from 'rss-parser';

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

// //added this to fix prism.js error.
// app.use(express.static(path.join(__dirname, 'client')));

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'], // Add other HTTP methods if needed
  allowedHeaders: ['Content-Type'], // Add other headers if needed
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '50mb' }));

const client = new vision.ImageAnnotatorClient();

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from CodeX!',
  });
});

// Create a variable to store the conversation history
let conversationHistory = [
  { role: 'system', content: 'Assess user inputs, including text and images, leveraging Google Cloud Vision API data. For images, provide in-depth descriptions, not just label listings, unless otherwise directed by the user. For text, address any security-related queries or other topics. cveInfo and rssInfo are data sources, provide a summary of that data when it gets added or answer questions about it based on user input.'},
];

let currentModel = 'gpt-3.5-turbo'; // Initialize the currentModel variable

function truncateConversation(history, maxCompletionTokens) {
  const maxTokens = 8000 - maxCompletionTokens;
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
    const cveInfo = req.body.cveInfo;
    const rssInfo = req.body.rssInfo;

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

    if (cveInfo) {
      conversationHistory.push({ role: 'user', content: `cveInfo: ${cveInfo}` });
    }

    if (rssInfo) {
      conversationHistory.push({ role: 'user', content: `rssInfo: ${rssInfo}` });
    }

    // Add the user's message to the conversation history
    conversationHistory.push({ role: 'user', content: userMessage });

    const maxCompletionTokens = 1000;
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
    { role: 'system', content: 'Assess user inputs, including text and images, leveraging Google Cloud Vision API data. For images, provide in-depth descriptions, not just label listings, unless otherwise directed by the user. For text, address any security-related queries or other topics. cveInfo and rssInfo are data sources, provide a summary of that data when it gets added or answer questions about it based on user input.' },
  ];
  res.sendStatus(200); // Send a success status code
});

let parser = new Parser();

// define your list of rss feed URLs
let rssUrls = [
  'https://www.cshub.com/rss/categories/attacks',
  'https://www.cisa.gov/cybersecurity-advisories/all.xml'
  // add more URLs as needed
];

app.get('/getFeed', async (req, res) => {
  let feeds = [];
  for (let url of rssUrls) {
    try {
      let feed = await parser.parseURL(url);
      feeds.push(feed);
    } catch (error) {
      console.error(`Error during RSS feed parsing for ${url}:`, error.message);
    }
  }

  // If no feeds could be fetched, send an error response
  if (feeds.length === 0) {
    res.status(500).send('Something went wrong');
  } else {
    res.json(feeds);
  }
});


// // Add a new route to fetch RSS data
// app.get('/getFeed', async (req, res) => {
//   try {
//     let feed = await parser.parseURL('https://www.cshub.com/rss/categories/attacks'); // replace with your RSS feed URL

//     // Do what you want with feed data here
//     // For instance, send it to the client as JSON
//     res.json(feed);
//   } catch (error) {
//     console.error("Error during RSS feed parsing:", error.message);
//     res.status(500).send('Something went wrong');
//   }
// });

app.listen(5000, () => console.log('AI server started on http://localhost:5000'));