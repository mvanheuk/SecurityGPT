import bot from './assets/bot.svg'
import user from './assets/user.svg'

const form = document.querySelector('form')
const chatContainer = document.querySelector('#chat_container')
const gpt3Button = document.getElementById('gpt3-btn');
const gpt4Button = document.getElementById('gpt4-btn');
const progressPercentage = document.getElementById("progressPercentage");
const imageInput = document.getElementById('imageInput');

gpt4Button.style.backgroundColor = 'gray';

let loadInterval
let currentModel = 'gpt-3.5-turbo'; // Initialize the currentModel variable
let recognizedImageText = ''; // Store the recognized text from the image

imageInput.addEventListener('change', async (event) => {
  imageToBase64(event.target, async (base64) => {
    try {
      const response = await fetch('https://securitygpt.onrender.com/google-vision-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const data = await response.json();
      console.log('Google Cloud Vision API response:', data);
      recognizedImageText = data.recognizedText; // Store the recognized text
    } catch (error) {
      console.error('Error during API call:', error);
    }
  });
});


function switchModel(model) {
    currentModel = model;
  
    // Send the selected model to the server
    fetch('https://securitygpt.onrender.com/change-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model }),
    }).then((response) => {
      if (response.ok) {
        console.log('Model switched to', model);
        updateModelButtons(); // Update the button styles
      } else {
        console.error('Failed to switch model');
      }
    });
}

function imageToBase64(inputElement, callback) {
  const file = inputElement.files[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    const base64 = event.target.result;
    callback(base64);
  };

  reader.readAsDataURL(file);
}

function updateModelButtons() {
    if (currentModel === 'gpt-3.5-turbo') {
      gpt3Button.style.backgroundColor = '#1d3c5c';
      gpt4Button.style.backgroundColor = 'gray';
    } else {
      gpt3Button.style.backgroundColor = 'gray';
      gpt4Button.style.backgroundColor = '#1d3c5c';
    }
  }

function loader(element) {
    element.textContent = ''
    // to focus scroll to the bottom here
    chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;

    loadInterval = setInterval(() => {
        // Update the text content of the loading indicator
        element.textContent += '.';

        // If the loading indicator has reached three dots, reset it
        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);
}

// generate unique ID for each message div of bot
// necessary for typing text effect for that specific reply
// without unique ID, typing text will work on every element
function generateUniqueId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
}


function typeText(element, text) {
  let index = 0;

  const typeCharacter = () => {
      if (index < text.length) {
          const currentChar = text[index++];
          if (currentChar === '\n') {
              const newParagraph = document.createElement('p');
              element.appendChild(newParagraph);
          } else {
              if (!element.lastElementChild || element.lastElementChild.tagName !== 'P') {
                  const newParagraph = document.createElement('p');
                  element.appendChild(newParagraph);
              }
              element.lastElementChild.innerHTML += currentChar;
          }
          chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
          setTimeout(typeCharacter, 20);
      }
  };

  typeCharacter();
}
  
  
function chatStripe(isAi, value, uniqueId) {
    // to focus scroll to the bottom here
    chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
    return (
        `
        <div class="wrapper ${isAi && 'ai'}">
            <div class="chat">
                <div class="profile">
                    <img 
                      src=${isAi ? bot : user} 
                      alt="${isAi ? 'bot' : 'user'}" 
                    />
                </div>
                <div class="message" id=${uniqueId}>${value}</div>
            </div>
        </div>
    `
    )
}

async function clearChat() {
    // Clear the chat container
    chatContainer.innerHTML = '';

    // Send a request to the server to clear the conversation history
    try {
        const response = await fetch('https://securitygpt.onrender.com/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to clear conversation history on the server');
        }
    } catch (error) {
        console.error('Error while clearing conversation history:', error.message);
        alert('Something went wrong while clearing the conversation history');
    }
}


const handleSubmit = async (e) => {
    e.preventDefault()

    const data = new FormData(form)

    let userMessage = data.get('prompt');

    // user's chatstripe
    chatContainer.innerHTML += chatStripe(false, userMessage) // Use userMessage instead of data.get('prompt')

    // to clear the textarea input 
    form.reset()

    // bot's chatstripe
    const uniqueId = generateUniqueId()
    chatContainer.innerHTML += chatStripe(true, " ", uniqueId)

    // specific message div 
    const messageDiv = document.getElementById(uniqueId)

    // messageDiv.innerHTML = "..."
    loader(messageDiv)

    const response = await fetch('https://securitygpt.onrender.com', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: data.get('prompt'),
            model: currentModel, // Pass the currentModel to the server
            recognizedText: recognizedImageText, // Pass the recognized text as a separate field
        })
    })

    // to focus scroll to the bottom here
    chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight; 

    clearInterval(loadInterval)
    messageDiv.innerHTML = ""
    
    //reset recongnizedImageText
    recognizedImageText = '';

    // Clear the file input
    imageInput.value = '';

    //Clear % value
    progressPercentage.textContent = ``;

    if (response.ok) {
        const data = await response.json();
        const parsedData = data.bot.trim(); // trims any trailing spaces/'\n'
        const paragraphs = parsedData.split('\n\n').map((paragraph) => `<p>${paragraph}</p>`).join('');

        typeText(messageDiv, parsedData);
    } else {
        const err = await response.text()

        messageDiv.innerHTML = "Something went wrong"
        alert(err)
    }
};



form.addEventListener('submit', handleSubmit);

const clearButton = document.getElementById('clear_button');
clearButton.addEventListener('click', clearChat);

form.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
        handleSubmit(e)
    }
})

window.addEventListener('load', async (e) => {
    try {
        await fetch('https://securitygpt.onrender.com/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error while clearing conversation history on page unload:', error.message);
    }
});

gpt3Button.addEventListener('click', () => switchModel('gpt-3.5-turbo'));
gpt4Button.addEventListener('click', () => switchModel('gpt-4'));