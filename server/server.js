import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import { Configuration, OpenAIApi } from 'openai'

dotenv.config()

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Hello from CodeX!'
  })
})

app.post('/', async (req, res) => {
  try {
    const userMessage = req.body.prompt;
    console.log("Received data:", req.body);
    const context = req.body.context;
    const model = "gpt-3.5-turbo";

    // Separate the context into individual messages
    const messages = context.split('\n').map(content => {
      const [role, ...messageParts] = content.split(' ');
      const messageContent = messageParts.join(' ');

      return {
        role: role.slice(0, -1).toLowerCase(),
        content: messageContent,
      };
    }).filter(msg => msg.content.trim() !== ''); // Filter out any empty messages

    // Add the latest user message to the messages array
    messages.push({ role: 'user', content: userMessage });

    const response = await openai.createChatCompletion({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful Security focused assistant called SecurityGPT.' },
        ...messages,
      ],
      max_tokens: 3500,
    });
    
    console.log('API response:', response);

    res.status(200).send({
      bot: response.data.choices[0].message.content
    });

  } catch (error) {
    console.error('Error during API call:', error.message);
    res.status(500).send('Something went wrong');
  }
});

app.listen(5000, () => console.log('AI server started on http://localhost:5000'))
