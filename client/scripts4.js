import bot from './assets/bot.svg'
import user from './assets/user.svg'

import {clearImageUpload, getImageFromMod, getRITfromMod, getRLfromMod, getWDRfromMod} from './processImage.js';
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

function typeText(element, text) {
  let index = 0;

  const typeCharacter = () => {
    const currentChar = text[index++];

    // Add special handling for code blocks
    if (text.substring(index-3, index) === '```') {
      let endOfCodeBlock = text.indexOf('```', index);
      if (endOfCodeBlock === -1) endOfCodeBlock = text.length;
      
      // Find the language specifier, which is the text between the backticks and the first newline
      const firstNewlineInBlock = text.indexOf('\n', index);
      const languageSpecifier = text.substring(index, firstNewlineInBlock).trim();

      const codeBlock = document.createElement('pre');
      codeBlock.innerHTML = `<code class="language-${languageSpecifier}">${escapeHtml(text.substring(firstNewlineInBlock+1, endOfCodeBlock))}</code>`;
      element.appendChild(codeBlock);
      index = endOfCodeBlock + 3;
    } else {
      // Create new paragraph for newline characters
      if (currentChar === '\n') {
        element.appendChild(document.createElement('p'));
      } else {
        if (!element.lastElementChild || element.lastElementChild.tagName !== 'P') {
          element.appendChild(document.createElement('p'));
        }
        element.lastElementChild.innerHTML += currentChar;
      }
    }
        
    chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
        
    if(index < text.length){
      requestAnimationFrame(typeCharacter);
    } else {
      Prism.highlightAll();
    }
  };

  requestAnimationFrame(typeCharacter);
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function chatStripe(isAi, value, uniqueId, imageBase64) {
  const imageMarkup = imageBase64 ? `<img src="data:image/jpeg;base64,${imageBase64}" class="uploaded-image" />` : '';

  let isCode = false;
  let language = null;

  // Check if value is a code block 
  if (value.trim().startsWith("```") && value.trim().endsWith("```")) {
    value = value.trim().slice(3, -3); // Trim the backticks
    const firstLineEndIndex = value.indexOf("\n");
    language = value.slice(0, firstLineEndIndex).trim(); // Get the language from the first line
    value = value.slice(firstLineEndIndex + 1); // Get the rest of the string after the first line
    isCode = true;
  }

  let valueMarkup;
  if (isCode) {
    valueMarkup = `<pre><code class="language-${language}">${escapeHtml(value)}</code></pre>`;
  } else {
    // If the value is not a code block, convert URLs to clickable links
    value = convertUrlsToLinks(value);
    valueMarkup = value.replace(/\n/g, '<br>');
  }

  // to focus scroll to the bottom here
  chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
  return (
    `
    <div class="wrapper ${isAi ? 'ai' : ''}">
        <div class="chat">
            <div class="profile">
                <img 
                  src=${isAi ? bot : user} 
                  alt="${isAi ? 'bot' : 'user'}" 
                />
            </div>
            <div class="message" id=${uniqueId}>
                ${imageMarkup}
                ${valueMarkup}
            </div>
        </div>
    </div>
    `
  );
}

function convertUrlsToLinks(text) {
  // Match Markdown links: [Link text](URL)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g;
  // Convert Markdown links to HTML links
  text = text.replace(markdownLinkRegex, '<a href="$2" target="_blank">$1</a>');

  // Match raw URLs: http(s)://...
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  // Convert raw URLs to HTML links, but only if they're not already part of an HTML link
  text = text.replace(urlRegex, (url, offset, string) => {
    // Look for the start of an <a> tag before this URL, and the end of an </a> tag after it
    const aTagStart = string.lastIndexOf('<a', offset);
    const aTagEnd = string.indexOf('</a>', offset);
    if (aTagStart !== -1 && aTagEnd !== -1 && aTagStart < aTagEnd) {
      // This URL is already part of an HTML link, so return it as is
      return url;
    } else {
      // This URL is not part of an HTML link, so convert it
      return `<a href="${url}" target="_blank">${url}</a>`;
    }
  });

  return text;
}


// function chatStripe(isAi, value, uniqueId, imageBase64) {
//   const imageMarkup = imageBase64 ? `<img src="data:image/jpeg;base64,${imageBase64}" class="uploaded-image" />` : '';

//   let isCode = false;
//   let language = null;

//   // Check if value is a code block 
//   if (value.trim().startsWith("```") && value.trim().endsWith("```")) {
//     value = value.trim().slice(3, -3); // Trim the backticks
//     const firstLineEndIndex = value.indexOf("\n");
//     language = value.slice(0, firstLineEndIndex).trim(); // Get the language from the first line
//     value = value.slice(firstLineEndIndex + 1); // Get the rest of the string after the first line
//     isCode = true;
//   }

//   const valueMarkup = isCode ? `<pre><code class="language-${language}">${escapeHtml(value)}</code></pre>` : escapeHtml(value).replace(/\n/g, '<br>');

//   // to focus scroll to the bottom here
//   chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
//   return (
//     `
//     <div class="wrapper ${isAi ? 'ai' : ''}">
//         <div class="chat">
//             <div class="profile">
//                 <img 
//                   src=${isAi ? bot : user} 
//                   alt="${isAi ? 'bot' : 'user'}" 
//                 />
//             </div>
//             <div class="message" id=${uniqueId}>
//                 ${imageMarkup}
//                 ${valueMarkup}
//             </div>
//         </div>
//     </div>
//     `
//   );
// }

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
        alert('Something went wrong while clearing the conversation history!');
    }
}

const handleSubmit = async (e) => {
    e.preventDefault()

    const data = new FormData(form)

    let userMessage = data.get('prompt');

    let rssInfo = ''; // move rssInfo declaration here

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
    chatContainer.innerHTML += chatStripe(false, userMessage, null, ImageBase64);

    // to clear the textarea input 
    form.reset();

    // bot's chatstripe
    const uniqueId = generateUniqueId();
    chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

    // specific message div 
    const messageDiv = document.getElementById(uniqueId);

    // messageDiv.innerHTML = "..."
    loader(messageDiv);

    // Detect "rss" keyword in user input
    const hasRssKeyword = detectRssKeyword(userMessage);

    if (hasRssKeyword) {
      const response = await fetch('https://securitygpt.onrender.com/getFeed', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const rssDatas = await response.json();
        let rssInfos = []; // define as an empty array
        rssDatas.forEach((rssData, index) => {
          // Extract title, link, pubDate, author, and summary of each item
          let info = rssData.items.slice(0, 5).map(item => 
            `Feed ${index+1}\nTitle: ${item.title}\nLink: ${item.link}\nPublished Date: ${item.pubDate}\nAuthor: ${item.author}\nSummary: ${item.summary ? item.summary.trim() : 'No summary available'}`
          ).join('\n\n');
          rssInfos.push(info); // push the info of each feed into the array
        });
        rssInfo = rssInfos.join('\n\n'); // join the array into a string with double line breaks in between each feed's info
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