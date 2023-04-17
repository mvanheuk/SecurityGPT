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


function createChatHistoryEntry(question) {
    const chatHistoryContainer = document.querySelector('#chat_history_container');
    const chatHistoryRow = document.createElement('div');
    chatHistoryRow.classList.add('chat-history-row');
    chatHistoryRow.textContent = question;
    chatHistoryContainer.appendChild(chatHistoryRow);

    chatHistoryRow.addEventListener('click', () => {
        showConversationPopup(chatHistoryRow.conversationHistory);
      });
    
    return chatHistoryRow;
  }


function showConversationPopup(conversation) {
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');

    const popup = document.createElement('div');
    popup.classList.add('popup');

    const closeButton = document.createElement('button');
    closeButton.classList.add('close-popup-button');
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    popup.appendChild(closeButton);

    conversation.forEach((message) => {
        const messageParagraph = document.createElement('p');
        messageParagraph.classList.add(message.role);
        messageParagraph.textContent = message.content;
        popup.appendChild(messageParagraph);
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}


const handleSubmit = async (e) => {
    e.preventDefault()

    const data = new FormData(form)

    // user's chatstripe
    const userMessage = data.get('prompt');
    chatContainer.innerHTML += chatStripe(false, userMessage);

    // Create a new conversation entry in the chat history container
    const chatHistoryRow = createChatHistoryEntry(userMessage);

    // Add the user's message to the current conversation
    currentConversation.push({ role: 'user', content: userMessage });

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

        typeText(messageDiv, parsedData);

        // Add the bot's message to the current conversation
        //currentConversation.push({ role: 'assistant', content: parsedData });

        // Store the conversation history in the chatHistoryRow
        //chatHistoryRow.conversationHistory = [...currentConversation];
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