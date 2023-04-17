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
    console.log("Received data:", req.body);
    const messages = req.body.context.map(({ role, text }) => {
      return {
        role: role,
        message: text,
      };
    });

    const model = "gpt-3.5-turbo";

    const response = await openai.createChatCompletion({
      model: model,
      messages: [
        { role: 'system', message: 'You are a helpful Security focused assistant called SecurityGPT.' },
        ...messages,
      ],
      max_tokens: 3500,
    });

    console.log('API response:', response);

    res.status(200).send({
      bot: response.data.choices[0].message.content,
    });

  } catch (error) {
    console.error('Error during API call:', error.message);
    res.status(500).send('Something went wrong');
  }
});

app.listen(5000, () => console.log('AI server started on http://localhost:5000'))
