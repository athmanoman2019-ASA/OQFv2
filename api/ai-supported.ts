
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // Check for the presence of the GEMINI_API_KEY environment variable.
    // The !! operator converts the string (or undefined) to a boolean.
    const isSupported = !!process.env.GEMINI_API_KEY;
    res.status(200).json({ supported: isSupported });
  } catch (error) {
    console.error("Error in /api/ai-supported:", error);
    res.status(500).json({ supported: false, error: "Internal Server Error" });
  }
}
