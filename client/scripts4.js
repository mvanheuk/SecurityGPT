import bot from './assets/bot.svg'
import user from './assets/user.svg'

const form = document.querySelector('form')
const chatContainer = document.querySelector('#chat_container')

let loadInterval

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
    let currentCharacter = 0; // initialize to 0 for list items
    let currentParagraph = 0;
    const paragraphs = text.split('\n'); // split text into paragraphs based on new line characters
  
    const typeInterval = setInterval(() => {
      if (currentParagraph >= paragraphs.length) {
        clearInterval(typeInterval);
        chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
        return;
      }
  
      const currentParagraphText = paragraphs[currentParagraph];
      if (currentParagraphText.startsWith('- ')) {
        // Handle list items
        const currentText = currentParagraphText.slice(currentCharacter);
        const listItem = document.createElement('li');
        listItem.innerHTML = currentText;
        if (!element.lastElementChild || element.lastElementChild.tagName !== 'UL') {
          const newList = document.createElement('ul'); // create new ul element if there is none
          element.appendChild(newList);
        }
        element.lastElementChild.appendChild(listItem);
        chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
        currentCharacter += currentText.length + 2; // add the length of the list item and the dash to currentCharacter
      } else if (currentParagraphText.startsWith('`')) {
        // Handle code paragraphs
        if (currentCharacter >= currentParagraphText.length) {
          currentCharacter = 0;
          currentParagraph++;
          const newCodeBlock = document.createElement('code');
          element.appendChild(newCodeBlock);
          chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
        } else {
          const currentText = currentParagraphText.slice(0, ++currentCharacter);
          if (!element.lastElementChild || element.lastElementChild.tagName !== 'CODE') {
            const newCodeBlock = document.createElement('code');
            element.appendChild(newCodeBlock);
          }
          element.lastElementChild.innerHTML = currentText;
          chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
        }
      } else {
        // Handle regular paragraphs
        if (currentCharacter >= currentParagraphText.length) {
          currentCharacter = 0;
          currentParagraph++;
          const newParagraph = document.createElement('p');
          element.appendChild(newParagraph);
          chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
        } else {
          const currentText = currentParagraphText.slice(0, ++currentCharacter);
          if (!element.lastElementChild || element.lastElementChild.tagName !== 'P') {
            const newParagraph = document.createElement('p');
            element.appendChild(newParagraph);
          }
          element.lastElementChild.innerHTML = currentText;
          chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
        }
      }
    }, 20);
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


const handleSubmit = async (e) => {
    e.preventDefault()

    const data = new FormData(form)

    // user's chatstripe
    chatContainer.innerHTML += chatStripe(false, data.get('prompt'))

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
            prompt: data.get('prompt')
        })
    })

    // to focus scroll to the bottom here
    chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight; 

    clearInterval(loadInterval)
    messageDiv.innerHTML = ""

    if (response.ok) {
        const data = await response.json();
        const parsedData = data.bot.trim(); // trims any trailing spaces/'\n'
        const paragraphs = parsedData.split('\n\n').map((paragraph) => `<p>${paragraph}</p>`).join('');

        typeText(messageDiv, paragraphs);
    } else {
        const err = await response.text()

        messageDiv.innerHTML = "Something went wrong"
        alert(err)
    }
}

form.addEventListener('submit', handleSubmit)
form.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
        handleSubmit(e)
    }
})
