import bot from './assets/bot.svg'
import user from './assets/user.svg'

import { clearImageUpload } from './processImage.js';
import { getImageFromMod } from './processImage.js';
import { getRITfromMod } from './processImage.js';
import { getRLfromMod } from './processImage.js';
import { getWDRfromMod } from './processImage.js';

import {extractCveId, fetchCveData, detectRssKeyword, generateUniqueId} from './chatFunctions.js';

const form = document.querySelector('form')
const chatContainer = document.querySelector('#chat_container')
const gpt3Button = document.getElementById('gpt3-btn');
const gpt4Button = document.getElementById('gpt4-btn');

gpt4Button.style.backgroundColor = 'gray';

let loadInterval
let currentModel = 'gpt-3.5-turbo'; // Initialize the currentModel variable

let recognizedImageText = ''; // Store the recognized text from the image
let recognizedLabels = ''; // Store the recognized labels from the image
let webDetectionResults = '';
let ImageBase64;

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

// function typeText(element, text) {
//   let index = 0;

//   const typeCharacter = () => {
//       if (index < text.length) {
//           const currentChar = text[index++];
//           if (currentChar === '\n') {
//               const newParagraph = document.createElement('p');
//               element.appendChild(newParagraph);
//           } else {
//               if (!element.lastElementChild || element.lastElementChild.tagName !== 'P') {
//                   const newParagraph = document.createElement('p');
//                   element.appendChild(newParagraph);
//               }
//               element.lastElementChild.innerHTML += currentChar;
//           }
//           chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
//           setTimeout(typeCharacter, 20);
//       }
//   };

//   typeCharacter();
// }

function typeText(element, text) {
  let index = 0;
  
  const typeCharacter = () => {
      const currentChar = text[index++];
        
      if (currentChar === '\n') {
         element.appendChild(document.createElement('p'));
      } else {
         if (!element.lastElementChild || element.lastElementChild.tagName !== 'P') {
             element.appendChild(document.createElement('p'));
         }
         element.lastElementChild.innerHTML += currentChar;
      }
        
      chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
      
      if(index < text.length){
        requestAnimationFrame(typeCharacter);
      }
   };

   requestAnimationFrame(typeCharacter);
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

    ImageBase64 = getImageFromMod();
    recognizedImageText = getRITfromMod();
    recognizedLabels = getRLfromMod();
    webDetectionResults = getWDRfromMod();

    // Extract CVE ID from user input
    const cveId = extractCveId(userMessage);
    let cveInfo = '';

    if (cveId) {
      const jsonCveData = await fetchCveData(cveId);
      console.log('jsonCveData:', jsonCveData);
      if (jsonCveData) {
        // Extract CVE information (customize this as needed)
        cveInfo = `CVE ID: ${jsonCveData?.result?.CVE_Items[0]?.cve?.CVE_data_meta?.ID}\nDescription: ${jsonCveData?.result?.CVE_Items[0]?.cve?.description?.description_data[0]?.value}\nPublished Date: ${jsonCveData?.result?.CVE_Items[0]?.publishedDate}\nLast Modified Date: ${jsonCveData?.result?.CVE_Items[0]?.lastModifiedDate}\nCVSSv3 Score: ${jsonCveData?.result?.CVE_Items[0]?.impact?.baseMetricV3?.cvssV3?.baseScore}`;

        // cveInfo = `CVE ID: ${jsonCveData?.result?.CVE_Items[0]?.cve?.CVE_data_meta?.ID}\nDescription: ${jsonCveData?.result?.CVE_Items[0]?.cve?.description?.description_data[0]?.value}\nPublished Date: ${jsonCveData?.result?.CVE_Items[0]?.publishedDate}\nLast Modified Date: ${jsonCveData?.result?.CVE_Items[0]?.lastModifiedDate}`;
    
        // Check if the extracted information is valid
        if (!cveInfo.includes("undefined")) {
          // Pass the CVE information as a separate field
          // requestBody.cveInfo = cveInfo;
        }
      }
    }

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

    // Detect "rss" keyword in user input
    const hasRssKeyword = detectRssKeyword(userMessage);
    let rssInfo = '';

    if (hasRssKeyword) {
      const response = await fetch('https://securitygpt.onrender.com/getFeed', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const rssData = await response.json();
        // Extract title, link, pubDate, author, and summary of each item
        rssInfo = rssData.items.slice(0, 10).map(item => 
          `Title: ${item.title}\nLink: ${item.link}\nPublished Date: ${item.pubDate}\nAuthor: ${item.author}\nSummary: ${item.summary.trim()}`
        ).join('\n\n');
        console.log(rssInfo);
      }
    }

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
            webDetectionResults: webDetectionResults,
            cveInfo: cveInfo, // Pass the CVE information as a separate field
            rssInfo: rssInfo // Pass the RSS information as a separate field
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
    cveInfo = '';
    rssInfo = '';
    clearImageUpload();

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