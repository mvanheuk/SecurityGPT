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
let recognizedLabels = ''; // Store the recognized labels from the image
let webDetectionResults = '';


let ImageBase64;

imageInput.addEventListener('change', (e) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const dataURL = event.target.result;
    // Remove the Data URL prefix
    ImageBase64 = dataURL.split(',')[1];
    console.log(ImageBase64);
    // Call the processImage function after obtaining the ImageBase64 variable
    processImage(ImageBase64);
    // You can now use `ImageBase64` when sending a request to the Google Cloud Vision API
    progressPercentage.textContent = 'Please wait for image to upload...';
  };
  reader.readAsDataURL(e.target.files[0]);
});

async function processImage(imageBase64) {
    try {
      const response = await fetch('https://securitygpt.onrender.com/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          webDetection: true, // Add this line to request web detection
        }),
      });
  
      if (response.ok) {
        const data = await response.json();

        recognizedImageText = data.recognizedImageText;
        recognizedLabels = data.recognizedLabels;
        webDetectionResults = data.webDetectionResults; // Store the web detection results

        console.log('Recognized text:', recognizedImageText);
        console.log('Recognized labels:', recognizedLabels);
        console.log('Web detection results:', webDetectionResults);

        // Update progress percentage to 100% after the data is received
        progressPercentage.textContent = '100%';

      } else {
        throw new Error('Failed to process image');
      }
    } catch (error) {
      console.error('Error during image processing:', error.message);
      alert('Something went wrong while processing the image');
    }
  }
  
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
 
  
function chatStripe(isAi, value, uniqueId, imageBase64) {
  const imageMarkup = imageBase64 ? `<img src="data:image/jpeg;base64,${imageBase64}" class="uploaded-image" />` : '';
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
              <div class="message" id=${uniqueId}>
                  ${imageMarkup}
                  ${value}
              </div>
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
    chatContainer.innerHTML += chatStripe(false, userMessage, null, ImageBase64)

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
            recognizedLabels: recognizedLabels, // Pass the recognized labels as a separate field
            webDetectionResults: webDetectionResults
        })
    })

    // to focus scroll to the bottom here
    chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight; 

    clearInterval(loadInterval)
    messageDiv.innerHTML = ""
    
    //reset recongnizedImageText
    recognizedImageText = '';
    recognizedLabels = '';
    webDetectionResults = '';
    ImageBase64 = '';

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