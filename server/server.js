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

app.post('/', async (req, res) => {
  try {
    const userMessage = req.body.prompt;
    const model = 'gpt-3.5-turbo';

    // Add the user's message to the conversation history
    conversationHistory.push({ role: 'user', content: userMessage });

    const response = await openai.createChatCompletion({
      model: model,
      messages: conversationHistory,
      max_tokens: 3500,
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

app.listen(5000, () => console.log('AI server started on http://localhost:5000'));

// import express from 'express'
// import * as dotenv from 'dotenv'
// import cors from 'cors'
// import { Configuration, OpenAIApi } from 'openai'

// dotenv.config()

// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const openai = new OpenAIApi(configuration);

// const app = express()
// app.use(cors())
// app.use(express.json())

// app.get('/', async (req, res) => {
//   res.status(200).send({
//     message: 'Hello from CodeX!'
//   })
// })

// app.post('/', async (req, res) => {
//   try {
//     const userMessage = req.body.prompt;
//     const model = "gpt-3.5-turbo";

//     const response = await openai.createChatCompletion({
//       model: model,
//       messages: [
//         { role: 'system', content: 'You are a helpful Security focused assistant called SecurityGPT.' },
//         { role: 'user', content: userMessage },
//       ],
//       max_tokens: 3500,
//     });

//     console.log('API response:', response);

//     res.status(200).send({
//       bot: response.data.choices[0].message.content
//     });

//   } catch (error) {
//     console.error('Error during API call:', error.message, error.response?.data);
//     res.status(500).send('Something went wrong');
//   }
// });

// app.listen(5000, () => console.log('AI server started on http://localhost:5000'))
