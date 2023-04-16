import bot from './assets/bot.svg';
import user from './assets/user.svg';

const form = document.querySelector('#chat_form');
const chatContainer = document.querySelector('#chat_container');
const chatHistoryContainer = document.querySelector('#chat_history_container');
const clearButton = document.getElementById('clear_chat_button');

let loadInterval;
let isNewConversation = true;

let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

function loader(element) {
    element.textContent = '';
    scrollToBottom();

    loadInterval = setInterval(() => {
        element.textContent += '.';

        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);
}

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
            scrollToBottom();
            setTimeout(typeCharacter, 20);
        }
    };

    typeCharacter();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight - chatContainer.clientHeight;
}

function chatStripe(isAi, value, uniqueId) {
    scrollToBottom();
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
    );
}

function updateChatHistoryDisplay() {
    chatHistoryContainer.innerHTML = '';
    chatHistory.forEach((history, index) => {
        const chatHistoryRow = document.createElement('div');
        chatHistoryRow.classList.add('chat-history-row');
        chatHistoryRow.textContent = history.prompts[0].substring(0, 50) + (history.prompts[0].length > 50 ? '...' : '');
        chatHistoryContainer.appendChild(chatHistoryRow);

        chatHistoryRow.addEventListener('click', () => {
            showChatHistoryPopup(history);
        });
    });
}

function addChatHistory(prompt, response) {
    const conversationId = generateUniqueId();

    chatHistory.unshift({
        conversationId,
        prompts: [prompt],
        responses: [response],
    });

    saveChatHistory();
    updateChatHistoryDisplay();
}

function showChatHistoryPopup(history) {
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');

    const popup = document.createElement('div');
    popup.classList.add('popup');

    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.float = 'right';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '20px';
    closeButton.style.fontWeight = 'bold';

    history.prompts.forEach((prompt, index) => {
        const promptElement = document.createElement('div');
        promptElement.innerHTML = '<strong>User:</strong><br>' + prompt.replace(/\n/g, '<br>');
        const responseElement = document.createElement('div');
        responseElement.innerHTML = '<br><strong>Bot:</strong><br>' + history.responses[index].replace(/\n/g, '<br>');

        popup.appendChild(promptElement);
        popup.appendChild(responseElement);
    });

    popup.appendChild(closeButton);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
}

function loadChatHistory() {
    if (chatHistory.length > 0) {
        updateChatHistoryDisplay();
    }
}

function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const prompt = data.get('prompt');

    chatContainer.innerHTML += chatStripe(false, prompt);
    form.reset();

    const uniqueId = generateUniqueId();
    chatContainer.innerHTML += chatStripe(true, ' ', uniqueId);
    const messageDiv = document.getElementById(uniqueId);
    loader(messageDiv);

    const response = await fetch('https://securitygpt.onrender.com', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
        }),
    });

    clearInterval(loadInterval);
    messageDiv.innerHTML = '';

    if (response.ok) {
        const { bot } = await response.json();
        const parsedData = bot.trim();

        typeText(messageDiv, parsedData);

        addChatHistory(prompt, parsedData);
    } else {
        const err = await response.text();
        messageDiv.innerHTML = 'Something went wrong';
        alert(err);
    }
};

const handleClearChat = () => {
    chatContainer.innerHTML = '';
    isNewConversation = true;
};

form.addEventListener('submit', handleSubmit);
form.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
        handleSubmit(e);
    }
});

clearButton.addEventListener('click', handleClearChat);

loadChatHistory();
