const botMouth = document.getElementById('botMouth');
const chatHistory = document.getElementById('chatHistory');
const userInput = document.getElementById('userInput');
const themeToggle = document.getElementById('themeToggle');

// OpenAI Configuration
const ENCODED_KEY = 'c2stcHJvai00OXdDTmw5RWtIcmR1YXJOT1V0dDB5bFFDNVlQTnBBV09takUySXBDcVdRYmZ3MFo2c09QeG43Nnl5elNidnhpLXg2Y2xqUUZmWlQzQmxia0ZKcWhTU2FFZ1VYQUZyM25pWnNCVVdxcWZQVmluRFFLbW1kZlN0TVJ5VmFZY2FZQk9IZEQtRHBwSHZ0ekJuQ0t1amdtZUJoZ3lSSUE=';
const OPENAI_API_KEY = atob(ENCODED_KEY);
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Store conversations for context
let conversationHistory = [];

// Updated prompts to better use training data
const TRAINER_PROMPT = `You are helping me train my digital twin. Your tasks:
1. Have natural conversations while learning my personality
2. Note my speaking style, opinions, and typical responses
3. Ask follow-up questions to understand my thought process
4. Help me build a comprehensive personality profile`;

function setApiKey(key) {
    return true;
}

function getApiKey() {
    return OPENAI_API_KEY;
}

function getPublicPrompt() {
    const validConversations = conversationHistory
        .filter(conv => conv.myResponse)
        .slice(-5);

    const trainedResponses = validConversations
        .map(conv => `User: ${conv.user}\nYour Response: ${conv.myResponse}`)
        .join('\n\n');

    return `You are an AI assistant with creative freedom. IMPORTANT GUIDELINES:
1. Use the conversation history as inspiration but don't be limited by it
2. Combine your knowledge with any relevant training examples
3. Generate natural, helpful responses even for topics not in training
4. Be creative while maintaining a consistent, friendly tone

Previous conversations for context (if relevant):
${trainedResponses}

Style guidelines:
- Be helpful and informative
- Use a natural, conversational tone
- Draw from your broad knowledge base
- Feel free to discuss any topic appropriately

Remember: You should use both your training and the conversation history to provide helpful responses.`;
}

// Function to find the most similar trained response
function findBestMatch(message) {
    if (conversationHistory.length === 0) {
        return null;
    }

    const cleanMessage = message.toLowerCase().trim();
    
    // First try exact matches
    const exactMatch = conversationHistory.find(conv => 
        conv.user.toLowerCase().trim() === cleanMessage && conv.myResponse
    );
    
    if (exactMatch) {
        console.log('Found exact match:', exactMatch);
        return exactMatch;
    }

    // Then try partial matches
    let bestMatch = null;
    let highestSimilarity = 0;

    conversationHistory.forEach(conv => {
        if (!conv.myResponse) return; // Skip entries without your response

        const trainedMessage = conv.user.toLowerCase().trim();
        let similarity = 0;

        // Check for word matches
        const messageWords = cleanMessage.split(' ');
        const trainedWords = trainedMessage.split(' ');
        const commonWords = messageWords.filter(word => trainedWords.includes(word));
        
        similarity = commonWords.length / Math.max(messageWords.length, trainedWords.length);

        // Boost similarity for partial matches
        if (trainedMessage.includes(cleanMessage) || cleanMessage.includes(trainedMessage)) {
            similarity += 0.3;
        }

        if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = conv;
        }
    });

    console.log('Best match similarity:', highestSimilarity);
    return highestSimilarity > 0.3 ? bestMatch : null;  // Lowered threshold
}

// Update getBotResponse function
async function getBotResponse(message) {
    const isTrainer = isTrainerMode();
    
    try {
        const requestBody = {
            model: 'gpt-3.5-turbo',
            messages: [
                { 
                    role: 'system', 
                    content: isTrainer ? TRAINER_PROMPT : getPublicPrompt()
                },
                ...getRecentConversations(),
                { role: 'user', content: message }
            ],
            temperature: isTrainer ? 0.7 : 0.8,
            max_tokens: 150
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenAI API');
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error('Detailed error in getBotResponse:', error);
        throw error;
    }
}

function getRecentConversations() {
    return conversationHistory
        .filter(conv => conv.myResponse) // Only include conversations with your responses
        .slice(-5)
        .flatMap(conv => [
            { role: 'user', content: conv.user },
            { role: 'assistant', content: conv.myResponse }
        ]);
}

// Load saved conversations on startup
function loadConversationHistory() {
    const saved = localStorage.getItem('conversationHistory');
    conversationHistory = saved ? JSON.parse(saved) : [];
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadConversationHistory();
    // Force public mode on startup
    localStorage.setItem('chatMode', 'public');
    const toggleBtn = document.getElementById('modeToggle');
    if (toggleBtn) {
        toggleBtn.textContent = '🔒 Switch to Trainer Mode';
    }
    chatHistory.innerHTML = '';
});

// Function to determine which chatbot to use
function isTrainerMode() {
    // You can implement authentication here
    return localStorage.getItem('chatMode') === 'trainer';
}

// Add a function to update the knowledge base
function updateKnowledgeBase(category, subcategory, content) {
    if (!MY_PERSONALITY.knowledge[category]) {
        MY_PERSONALITY.knowledge[category] = {};
    }
    MY_PERSONALITY.knowledge[category][subcategory] = content;
    
    // Update the system prompt with new knowledge
    updateSystemPrompt();
}

// Function to update system prompt
function updateSystemPrompt() {
    // Reconstruct the system prompt with updated knowledge
    SYSTEM_PROMPT = `...updated prompt with new knowledge...`;
}

// Add back the mouth animation function
function animateMouth(duration) {
    let startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
            botMouth.style.height = `${3 + Math.sin(elapsed / 50) * 5}px`;
            requestAnimationFrame(animate);
        } else {
            botMouth.style.height = '3px';
        }
    }
    
    animate();
}

// Keep the basic UI functions
function addMessage(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Update sendMessage function to use getBotResponse for both modes
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, true);
    userInput.value = '';
    animateMouth(1500);

    try {
        if (isTrainerMode()) {
            // Trainer mode
            const botResponse = await getBotResponse(message);
            if (botResponse) {
                addMessage(botResponse, false);
            }
            addResponseInput(message);
        } else {
            // Public mode
            const botResponse = await getBotResponse(message);
            if (botResponse) {
                setTimeout(() => {
                    addMessage(botResponse, false);
                }, 500);
            }
        }
    } catch (error) {
        console.error('Error in sendMessage:', error);
        if (error.message.includes('429')) {
            addMessage("Too many requests. Please wait a moment and try again.", false);
        } else {
            addMessage("Sorry, I'm having trouble connecting to OpenAI. Please try again.", false);
        }
    }
}

// Allow sending message with Enter key
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Check for saved theme preference
const currentTheme = localStorage.getItem('theme');
if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        themeToggle.checked = true;
    }
}

// Theme switch handler
themeToggle.addEventListener('change', function() {
    if (this.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
});

// Add mode toggle function
function toggleMode() {
    const currentMode = localStorage.getItem('chatMode') || 'public';
    
    if (currentMode === 'public') {
        // Switching to trainer mode requires passcode
        if (checkTrainerPasscode()) {
            localStorage.setItem('chatMode', 'trainer');
            const toggleBtn = document.getElementById('modeToggle');
            toggleBtn.textContent = '👥 Switch to Public Mode';
            chatHistory.innerHTML = '';
        } else {
            alert('Incorrect passcode. Staying in public mode.');
        }
    } else {
        // Switching back to public mode doesn't require passcode
        localStorage.setItem('chatMode', 'public');
        const toggleBtn = document.getElementById('modeToggle');
        toggleBtn.textContent = '🔒 Switch to Trainer Mode';
        chatHistory.innerHTML = '';
    }
}

// Add this function to detect topics in messages
function detectTopic(message) {
    const topics = {
        greeting: ['hi', 'hello', 'hey', 'sup'],
        technical: ['code', 'programming', 'software', 'bug'],
        personal: ['feel', 'think', 'believe', 'like'],
        // Add more topics as needed
    };

    message = message.toLowerCase();
    for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(keyword => message.includes(keyword))) {
            return topic;
        }
    }
    return 'general';
}

// Add function to load training data
function loadTrainingData() {
    const saved = localStorage.getItem('trainingData');
    if (saved) {
        const parsed = JSON.parse(saved);
        trainingConversations = {
            ...parsed,
            vocabulary: new Set(parsed.vocabulary || [])
        };
    }
}

// Initialize training data structure if empty
if (!localStorage.getItem('trainingData')) {
    trainingConversations = {
        myResponses: {},
        conversationHistory: [],
        vocabulary: new Set(),
        responsePatterns: {}
    };
    localStorage.setItem('trainingData', JSON.stringify(trainingConversations));
}

// Add these functions to view and manage training data
function toggleTrainingViewer() {
    const viewer = document.getElementById('trainingViewer');
    if (viewer.style.display === 'none') {
        updateTrainingViewer();
        viewer.style.display = 'block';
    } else {
        viewer.style.display = 'none';
    }
}

function updateTrainingViewer() {
    const trainingList = document.getElementById('trainingList');
    trainingList.innerHTML = '';

    conversationHistory.forEach((conv, index) => {
        const entry = document.createElement('div');
        entry.className = 'training-entry';
        entry.innerHTML = `
            <div class="timestamp">${new Date(conv.timestamp).toLocaleString()}</div>
            <div><strong>User Message:</strong> ${conv.user}</div>
            <div><strong>Your Response:</strong> ${conv.myResponse}</div>
            <button onclick="deleteTrainingEntry(${index})">Delete</button>
        `;
        trainingList.appendChild(entry);
    });
}

function deleteTrainingEntry(index) {
    conversationHistory.splice(index, 1);
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
    updateTrainingViewer();
}

function clearTrainingData() {
    if (confirm('Are you sure you want to clear all training data?')) {
        conversationHistory = [];
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
        updateTrainingViewer();
    }
}

// Add a response input field in trainer mode
function addResponseInput(originalMessage) {
    const inputDiv = document.createElement('div');
    inputDiv.className = 'response-input';
    inputDiv.innerHTML = `
        <p>How would you respond to this message?</p>
        <textarea id="userResponse" placeholder="Type your response..."></textarea>
        <button onclick="saveUserResponse('${originalMessage}')">Save My Response</button>
    `;
    chatHistory.appendChild(inputDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Update saveUserResponse to properly save your response
function saveUserResponse(originalMessage) {
    const responseInput = document.getElementById('userResponse');
    const yourResponse = responseInput.value.trim();
    
    if (yourResponse) {
        // Save the original message and your response
        conversationHistory.push({
            user: originalMessage,
            myResponse: yourResponse,
            timestamp: new Date().toISOString()
        });
        
        // Save to localStorage
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));

        // Show your response in the chat
        addMessage(yourResponse, true);
        
        // Remove the response input
        const inputDiv = responseInput.closest('.response-input');
        inputDiv.remove();
    }
}

// Add this function to check the passcode
function checkTrainerPasscode() {
    const passcode = prompt("Please enter the trainer mode passcode:");
    return passcode === "0321";
} 