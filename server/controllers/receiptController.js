const getOpenAIClient = require('../config/openai');

const ALLOWED_CATEGORIES = [
    'Food & Dining',
    'Groceries',
    'Travel & Fuel',
    'Shopping',
    'Utilities & Bills',
    'Entertainment',
    'Healthcare',
    'Other'
];

// Helper to call Gemini 1.5 Flash via REST API
const scanWithGemini = async (rawBase64, mimeType, apiKey) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are an expert financial receipt and invoice scanner. 
Analyze this receipt/invoice/bill image with high precision.
Extract all key transaction fields and return a single valid JSON object matching this exact structure:
{
    "merchant": "Name of store, restaurant, or vendor (e.g. Swiggy, Starbucks, DMart, Shell)",
    "amount": 450.00,
    "date": "YYYY-MM-DD",
    "category": "One of: Food & Dining, Groceries, Travel & Fuel, Shopping, Utilities & Bills, Entertainment, Healthcare, Other",
    "paymentMethod": "One of: UPI, Card, Cash, NetBanking, Other",
    "taxAmount": 0.00,
    "lineItems": [
        { "name": "Item description", "quantity": 1, "price": 0.00 }
    ],
    "notes": "Short summary of the purchase (e.g. 2 items from Starbucks)",
    "confidence": 0.95
}
Rules:
1. "amount" must be the final total payable amount as a pure number without any currency symbols (₹, $, Rs).
2. "date" must be formatted as YYYY-MM-DD. If unclear, use the current date ${new Date().toISOString().split('T')[0]}.
3. "category" must strictly be one of the permitted categories listed above.
4. If items are visible, list them in "lineItems". If tax/GST is shown, include it in "taxAmount".
5. Return ONLY the JSON object, with no markdown code blocks or additional conversational text.`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType || 'image/jpeg',
                            data: rawBase64
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
        throw new Error('Gemini API returned an empty vision response.');
    }

    return JSON.parse(candidate);
};

// Fallback helper to call OpenAI GPT-4o-mini Vision if needed
const scanWithOpenAI = async (fullDataUrl) => {
    const openai = getOpenAIClient();
    if (!openai) {
        throw new Error('Neither Gemini nor OpenAI API key is configured.');
    }

    const prompt = `Analyze this receipt image. Return ONLY a valid JSON object matching:
{
    "merchant": "Vendor name",
    "amount": 0.00,
    "date": "YYYY-MM-DD",
    "category": "One of: Food & Dining, Groceries, Travel & Fuel, Shopping, Utilities & Bills, Entertainment, Healthcare, Other",
    "paymentMethod": "UPI | Card | Cash | NetBanking | Other",
    "taxAmount": 0.00,
    "lineItems": [{ "name": "Item", "quantity": 1, "price": 0.00 }],
    "notes": "Short summary",
    "confidence": 0.90
}`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: fullDataUrl, detail: 'high' } }
                ]
            }
        ],
        response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    return JSON.parse(content);
};

// POST /api/receipts/scan
const scanReceipt = async (req, res) => {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
        return res.status(400).json({ message: 'No image data provided for receipt scan.' });
    }

    // Extract pure base64 (strip data:image/...;base64, prefix if present)
    const rawBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const cleanMimeType = mimeType || (imageBase64.match(/^data:([^;]+);base64,/)?.[1]) || 'image/jpeg';
    const fullDataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${cleanMimeType};base64,${rawBase64}`;

    let parsedResult = null;
    let engineUsed = '';

    // Primary: Try Gemini 1.5 Flash Vision
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            parsedResult = await scanWithGemini(rawBase64, cleanMimeType, geminiKey);
            engineUsed = 'Gemini 1.5 Flash Vision';
        } catch (geminiError) {
            console.warn('Gemini vision scan failed, falling back to OpenAI:', geminiError.message);
        }
    }

    // Secondary Fallback: OpenAI GPT-4o-mini
    if (!parsedResult) {
        try {
            parsedResult = await scanWithOpenAI(fullDataUrl);
            engineUsed = 'OpenAI GPT-4o-mini Vision';
        } catch (openaiError) {
            console.error('All vision OCR engines failed:', openaiError.message);
            return res.status(500).json({ 
                message: 'Failed to extract receipt details. Please ensure the image is clear and your AI API keys are active.' 
            });
        }
    }

    // Sanitize and normalize parsed fields
    const sanitized = {
        merchant: parsedResult.merchant || 'Unknown Store',
        amount: Math.max(Number(parsedResult.amount) || 0, 0),
        date: parsedResult.date || new Date().toISOString().split('T')[0],
        category: ALLOWED_CATEGORIES.includes(parsedResult.category) ? parsedResult.category : 'Other',
        paymentMethod: parsedResult.paymentMethod || 'Other',
        taxAmount: Math.max(Number(parsedResult.taxAmount) || 0, 0),
        lineItems: Array.isArray(parsedResult.lineItems) ? parsedResult.lineItems : [],
        notes: parsedResult.notes || `Scanned receipt from ${parsedResult.merchant || 'merchant'}`,
        confidence: Number(parsedResult.confidence) || 0.90,
        engine: engineUsed
    };

    res.json({
        success: true,
        data: sanitized
    });
};

module.exports = {
    scanReceipt
};
