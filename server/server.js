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
    });

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


// model: model,
//       prompt: `${prompt}`,
//       temperature: 0.8, // Higher values means the model will take more risks.
//       max_tokens: 3000, // The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).
//       top_p: 1, // alternative to sampling with temperature, called nucleus sampling
//       frequency_penalty: 0.5, // Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
//       presence_penalty: 0, // Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.