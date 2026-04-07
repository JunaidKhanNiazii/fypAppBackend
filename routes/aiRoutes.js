const express = require('express');
const router = express.Router();
const axios = require('axios');

const GROQ_API_KEY = process.env.groqApi;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Chat with AI fitness assistant
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: 'Groq API key not configured' });
        }

        // System prompt for fitness guidance
        const systemPrompt = {
            role: 'system',
            content: `You are FitZone AI, a friendly and expert fitness assistant for FitZone gym members.

PRIMARY ROLE:
- Provide guidance on gym exercises, proper form, and workout techniques
- Answer questions about fitness, training, and healthy lifestyle
- Give advice on workout routines and exercise programs
- Help with exercise form corrections and injury prevention
- Motivate and encourage users in their fitness journey
- Explain gym equipment usage and safety

CONVERSATION STYLE:
- Be warm, friendly, and approachable
- Respond to greetings naturally (hello, hi, hey, etc.)
- Keep responses concise but helpful (2-4 sentences typically)
- Use simple, clear language
- Be motivating and positive

IMPORTANT GUIDELINES:
- You CAN respond to basic greetings and small talk, but gently guide conversation toward fitness
- Focus primarily on gym, fitness, and exercise topics
- For medical conditions or injuries, advise consulting healthcare professionals
- Prioritize safety and proper form in all advice
- If asked about non-fitness topics, politely redirect to fitness-related questions

EXAMPLES:
- "Hey" → "Hey there! Welcome to FitZone AI. I'm here to help with your workouts and fitness goals. What would you like to know?"
- "How are you?" → "I'm doing great, thanks for asking! More importantly, how's your fitness journey going? Any questions about your workouts?"
- "Tell me about squats" → [Provide detailed squat guidance]

Remember: You're a helpful gym companion who keeps members motivated and informed!`
        };

        // Build messages array with conversation history
        const messages = [
            systemPrompt,
            ...conversationHistory.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            })),
            {
                role: 'user',
                content: message
            }
        ];

        // Call Groq API
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: 'llama-3.3-70b-versatile', // Updated to current model
                messages: messages,
                temperature: 0.7,
                max_tokens: 500,
                top_p: 0.9
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiResponse = response.data.choices[0].message.content;

        res.json({
            success: true,
            response: aiResponse,
            model: 'llama-3.3-70b-versatile'
        });

    } catch (error) {
        console.error('AI chat error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to get AI response',
            details: error.response?.data?.error?.message || error.message
        });
    }
});

module.exports = router;
