// controllers/aiController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.rewriteEmail = async (req, res) => {
  try {
    const { text, tone = 'professional', length = 'similar' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text content is required'
      });
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Rewrite the following email content to be more ${tone} while maintaining the core message. You are only editing the main body so no need for subject line.
      Keep the length ${length} to the original. 
      Focus on clarity, professionalism, and impact.
      The content is being sent by a freelancer to their client.
      Return only the rewritten text, no additional commentary.
       
      Original text: "${text}"

      Rewritten text:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rewrittenText = response.text().trim();

    res.json({
      success: true,
      originalText: text,
      rewrittenText,
      tone,
      length
    });

  } catch (error) {
    console.error('Error in AI rewrite:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing your request',
      error: error.message
    });
  }
};