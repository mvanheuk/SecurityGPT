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
    const prompt = req.body.prompt;
    let prePrompt = `Does the question in quotes following this sentence pertain to any of the following subjects (Computers, Technology, Data, Cyber Security, Information Security, Programming, Business)? "${prompt}"? Please only respond to this prompt with yes or no.`;

    const responsePrePrompt = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `${prePrompt}`,
      temperature: 0,
      max_tokens: 60,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const prePromptAnswer = responsePrePrompt.data.choices[0].text.trim().toLowerCase();

    if (prePromptAnswer === "yes") {
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `${prompt}`,
        temperature: 0,
        max_tokens: 3000,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0,
      });

      res.status(200).send({
        bot: response.data.choices[0].text
      });
    } else if (prePromptAnswer === "no") {
      res.status(200).send({
        bot: "This question can not be answered by SecurityGPT due to Prompt Policy settings."
      });
    } else {
      res.status(200).send({
        bot: "I'm sorry, I didn't understand your question."
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error || 'Something went wrong');
  }
});


app.listen(5000, () => console.log('AI server started on http://localhost:5000'))

