// UI Injection
const container = document.createElement('div');
container.id = 'student-helper-container';
container.innerHTML = `
    <button class="sh-floating-btn" id="sh-toggle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
    </button>
    <div class="sh-panel" id="sh-panel">
        <div class="sh-header">
            <h3>Student Helper AI</h3>
            <span class="sh-close" id="sh-close">&times;</span>
        </div>
        <div class="sh-content">
            <div id="sh-status">Ready to assist...</div>
            <div id="sh-result-area"></div>
        </div>
        <div class="sh-chat-box">
            <label for="sh-file-upload" class="sh-attach-btn" title="Attach Document/Image">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
            </label>
            <input type="file" id="sh-file-upload" style="display: none;" accept="image/*,.pdf,.txt">
            <input type="text" class="sh-chat-input" id="sh-chat-input" placeholder="Ask or explain material...">
            <button class="sh-chat-send" id="sh-chat-send">Ask</button>
        </div>
        <div class="sh-actions">
            <button class="sh-btn sh-btn-primary" id="sh-scan-form">Scan Form</button>
            <button class="sh-btn" id="sh-auto-fill" style="background: #10b981">Auto Fill</button>
            <button class="sh-btn" id="sh-scan-screen">Super Scan</button>
            <button class="sh-btn" id="sh-clear-all" style="background: rgba(255,255,255,0.1)">Clear</button>
        </div>
    </div>
`;
document.body.appendChild(container);

const panel = document.getElementById('sh-panel');
const toggleBtn = document.getElementById('sh-toggle');
const closeBtn = document.getElementById('sh-close');
const scanFormBtn = document.getElementById('sh-scan-form');
const scanScreenBtn = document.getElementById('sh-scan-screen');
const statusDiv = document.getElementById('sh-status');
const resultArea = document.getElementById('sh-result-area');

// Toggle Panel
toggleBtn.onclick = () => panel.classList.toggle('active');
closeBtn.onclick = () => panel.classList.remove('active');

// Draggable Logic
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

container.onmousedown = (e) => {
    if (e.target.closest('.sh-floating-btn') || e.target.closest('.sh-header')) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
    }
};

document.onmousemove = (e) => {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    }
};

document.onmouseup = () => isDragging = false;

// Stealth Mode (Alt + X)
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'x') {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
});

// Auto-Fill Logic (God Mode)
document.getElementById('sh-auto-fill').onclick = async () => {
    statusDiv.innerText = 'God Mode: Filling Form...';
    const items = Array.from(document.querySelectorAll('[role="listitem"]'));
    
    for (const item of items) {
        const questionText = item.innerText.split('\n')[0];
        const result = await GeminiAPI.generateContent(await getApiKey(), `Give ONLY the exact text or option name for this question: ${questionText}`);
        
        // 1. Fill Text Inputs
        const input = item.querySelector('input[type="text"], textarea');
        if (input) {
            input.value = result.trim();
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // 2. Click Radio Buttons (MCQs)
        const options = Array.from(item.querySelectorAll('[role="radio"], [role="checkbox"]'));
        for (const opt of options) {
            if (opt.innerText.toLowerCase().includes(result.toLowerCase().trim())) {
                opt.click();
            }
        }
    }
    statusDiv.innerText = 'Form Auto-Filled!';
};


async function getApiKey(index = -1) {
    return new Promise((resolve) => {
        if (index !== -1 && index < KEY_POOL.length) {
            return resolve(KEY_POOL[index]);
        }
        chrome.storage.local.get(['gemini_api_key'], (result) => {
            if (result && result.gemini_api_key) return resolve(result.gemini_api_key);
            const randomKey = KEY_POOL[Math.floor(Math.random() * KEY_POOL.length)];
            resolve(randomKey);
        });
    });
}





async function solveWithAI(prompt, imageDataUrl = null, retryCount = 0) {
    const key = await getApiKey(retryCount);
    
    statusDiv.innerHTML = `<span style="color: #a855f7">Attempting with Key #${retryCount+1}...</span>`;


    try {
        const result = await GeminiAPI.generateContent(key, prompt, imageDataUrl);
        
        if (!result) {
            statusDiv.innerText = 'AI returned no response. Try again.';
            return;
        }

        // If the result contains a Quota or Limit error, we trigger an internal retry
        if (result.includes('[429]') || result.includes('quota') || result.includes('limit')) {
            if (retryCount < KEY_POOL.length) {
                console.log(`Key ${retryCount} failed. Rotating...`);
                return solveWithAI(prompt, imageDataUrl, retryCount + 1);
            }
        }

        const resultDiv = document.createElement('div');
        resultDiv.className = 'sh-result';
        
        let formattedResult = result
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/\n/g, '<br>');
            
        resultDiv.innerHTML = `
            <div class="sh-result-actions">
                <button class="sh-copy-btn">Copy</button>
                <button class="sh-human-btn">Humanize</button>
            </div>
            <strong>Answer:</strong><br>
            <div class="sh-result-text">${formattedResult}</div>
        `;
        
        resultDiv.querySelector('.sh-human-btn').onclick = () => {
            solveWithAI(`Rewrite this answer to sound like a human student wrote it (simple language, slightly informal). Original: ${result}`);
        };
        
        resultDiv.querySelector('.sh-copy-btn').onclick = (e) => {
            navigator.clipboard.writeText(result);
            e.target.innerText = 'Copied!';
            setTimeout(() => e.target.innerText = 'Copy', 2000);
        };

        resultArea.prepend(resultDiv);
        statusDiv.innerText = 'Solved!';
    } catch (e) {
        if (retryCount < KEY_POOL.length) {
            return solveWithAI(prompt, imageDataUrl, retryCount + 1);
        }
        statusDiv.innerText = 'All keys are exhausted. Try again in a minute.';
    }
}




// Scanning Logic
scanFormBtn.onclick = () => {
    // Better Google Forms question detection - focus only on the actual question text
    const items = Array.from(document.querySelectorAll('.geS54f, .M7eMe, [role="listitem"]'));
    const questions = items.map(q => {
        // Remove "Enter your Nickname" or header noise
        return q.innerText.replace(/Enter your Nickname|Nickname|Your answer|Required/gi, '').trim();
    }).filter(t => t.length > 5);
    
    if (questions.length === 0) {
        statusDiv.innerText = 'No questions found on this page.';
        return;
    }
    const prompt = `Solve these specific exam questions. Provide ONLY the correct answer for each. IGNORE any text about 'Nicknames' or personal info. Questions: \n${questions.join('\n')}`;
    solveWithAI(prompt);
};

scanScreenBtn.onclick = () => {
    statusDiv.innerText = 'Super-Scanning Page...';
    const allText = document.body.innerText;
    const prompt = `If there are academic questions or MCQs here, solve them. Otherwise, provide a concise summary of what is on this screen. Context: ${allText.substring(0, 5000)}`;
    solveWithAI(prompt);
};

// Interactive Chat Logic
const chatInput = document.getElementById('sh-chat-input');
const chatSend = document.getElementById('sh-chat-send');

// File Attachment Logic
const fileUpload = document.getElementById('sh-file-upload');
let attachedFileData = null;

fileUpload.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    statusDiv.innerText = `Attaching ${file.name}...`;
    
    const reader = new FileReader();
    reader.onload = (f) => {
        attachedFileData = f.target.result;
        statusDiv.innerHTML = `<span class="sh-file-indicator">📎 Attached: ${file.name}</span>`;
    };
    
    if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
    } else {
        reader.readAsText(file); // Handle PDF/TXT as text for now
    }
};

chatSend.onclick = () => {
    const userMessage = chatInput.value.trim();
    if (!userMessage && !attachedFileData) return;
    
    const context = document.body.innerText.substring(0, 5000);
    let fullPrompt = `Based on this page: "${context}", answer: ${userMessage}`;
    
    if (attachedFileData && !attachedFileData.startsWith('data:image')) {
        fullPrompt = `Study Material: "${attachedFileData.substring(0, 5000)}"\n\nQuestion: ${userMessage}`;
    }

    statusDiv.innerText = 'Analyzing material...';
    solveWithAI(fullPrompt, attachedFileData && attachedFileData.startsWith('data:image') ? attachedFileData : null);
    
    // Reset
    attachedFileData = null;
    chatInput.value = '';
    fileUpload.value = '';
};

chatInput.onkeypress = (e) => {
    if (e.key === 'Enter') chatSend.click();
};




// Inline "Solve" buttons for Google Forms
function injectInlineButtons() {
    const questionBlocks = document.querySelectorAll('[role="listitem"]');
    questionBlocks.forEach(block => {
        if (!block.querySelector('.sh-inline-btn')) {
            const btn = document.createElement('button');
            btn.className = 'sh-inline-btn';
            btn.innerText = 'AI Solve';
            const clearBtn = document.getElementById('sh-clear-all');
            clearBtn.onclick = () => resultArea.innerHTML = '';

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                solveWithAI(`Solve this specific question. If it is a song lyric, finish it correctly. Question: ${block.innerText}`);
            };
            const header = block.querySelector('[role="heading"]') || block.firstChild;
            header.appendChild(btn);
        }
    });
}

// Auto-inject on Google Forms
if (window.location.href.includes('docs.google.com/forms')) {
    setInterval(injectInlineButtons, 2000);
}
