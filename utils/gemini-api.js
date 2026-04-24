const GeminiAPI = {
    async generateContent(apiKey, prompt, imageDataUrl = null) {
        const url = "https://api.groq.com/openai/v1/chat/completions";
        
        // STEP 1: Find the latest active vision model
        let model = "llama-3.1-8b-instant"; // Default text model
        
        if (imageDataUrl) {
            try {
                const listResponse = await fetch("https://api.groq.com/openai/v1/models", {
                    headers: { "Authorization": `Bearer ${apiKey}` }
                });
                const listData = await listResponse.json();
                const available = listData.data.map(m => m.id);
                // Aggressive discovery: find ANY vision model that is currently listed as active
                model = available.find(id => id.includes('vision') && !id.includes('11b-vision-preview') && !id.includes('90b-vision-preview')) || 
                        available.find(id => id.includes('vision')) || 
                        "llama-3.2-11b-vision"; // Try production name
            } catch (e) {
                model = "llama-3.2-11b-vision";
            }
        }

        let messages = [
            { role: "system", content: "You are a professional assistant. Give the correct answer directly and concisely." }
        ];

        if (imageDataUrl) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: imageDataUrl } }
                ]
            });
        } else {
            messages.push({ role: "user", content: prompt });
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model, messages, temperature: 0.0 })
            });


            const data = await response.json();
            if (response.ok) {
                return data.choices[0].message.content;
            } else {
                return `AI ERROR: ${data.error?.message || 'Key Error'}`;
            }
        } catch (error) {
            return `CONNECTION ERROR: ${error.message}`;
        }
    }
};









