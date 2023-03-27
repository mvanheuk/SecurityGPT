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

app.post('/', async (req, res) => {
  try {
    const promptCheck = `Does the question in quotes following this sentence pertain to Computers, Technology, Data, Cyber Security, Information Security, Programming, or Business? "${req.body.prompt}" Please only respond with Yes or No.`;
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `${promptCheck}`,
      temperature: 0,
      max_tokens: 3000,
      top_p: 1,
      frequency_penalty: 0.5,
      presence_penalty: 0,
    });

    const botResponse = response.data.choices[0].text;

    if (botResponse.toLowerCase() === 'yes') {
      let prompt = req.body.prompt;
      try {
        response = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt: `${prompt}`,
          temperature: 0,
          max_tokens: 3000,
          top_p: 1,
          frequency_penalty: 0.5,
          presence_penalty: 0,
        });

        res.status(200).send({
          bot: response.data.choices[0].text,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send(error || 'Something went wrong');
      }
    } else if (botResponse.toLowerCase() === 'no') {
      let responseText = 'This question cannot be answered by SecurityGPT due to the limitation in the subjects it can speak on.';
      res.status(200).send({
        bot: responseText,
      });
    } else {
      let responseText2 = 'I am sorry, I did not understand your response.';
      res.status(200).send({
        bot: responseText2,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error || 'Something went wrong');
  }
});

app.listen(5000, () =>
  console.log('AI server started on http://localhost:5000')
);
