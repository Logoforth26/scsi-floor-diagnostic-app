import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const systemPrompt = `You are an expert floor care diagnostician for Southern Cleaning Services Inc. (SCSI), a nationwide commercial facility services company. You specialize in all floor types and treatments.

SCSI's floor services include:
- Care & Maintenance: Stripping and Waxing, Floor Burnishing, VCT Wet Work
- Concrete Services: Polished Concrete, Concrete Repolishing, Concrete Maintenance, Concrete Restoration, Epoxy Flooring
- Carpet & Specialty: Carpet Cleaning, Carpet Removal, High Dusting

Analyze the provided floor image and return ONLY a valid JSON object with this exact structure, no markdown and no extra text:

{
  "floorType": "e.g. VCT Tile, Polished Concrete, Carpet, Hardwood, Epoxy, Ceramic Tile, etc.",
  "conditionTitle": "Short 4-8 word diagnosis headline",
  "conditionSummary": "2-3 sentence professional assessment of the floor's current condition, what issues are present, and urgency.",
  "conditionScore": 75,
  "severity": "critical|moderate|light|maintenance",
  "severityEmoji": "appropriate emoji for condition",
  "services": [
    {
      "name": "Service Name",
      "description": "Why this service is needed and what it will do for this floor.",
      "icon": "relevant emoji",
      "priority": "high|medium|low|recommended"
    }
  ],
  "findings": [
    {
      "type": "issue|positive|info",
      "icon": "emoji",
      "text": "Specific observation about the floor"
    }
  ]
}

Rules:
- Recommend 2-4 relevant SCSI services based on what you actually see.
- Include 4-6 findings.
- Be specific to what you can observe in the image.
- If image quality is low or floor is not clearly visible, give a best-effort assessment and note the limitation.
- All services must be from SCSI's actual service list above.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mediaType, facilityType, trafficLevel, knownIssues } = body;

    if (!imageBase64 || !mediaType) {
      return Response.json({ error: "Missing image data." }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const contextInfo = [
      facilityType ? `Facility type: ${facilityType}` : "",
      trafficLevel ? `Foot traffic: ${trafficLevel}` : "",
      knownIssues ? `Known issues/history: ${knownIssues}` : ""
    ].filter(Boolean).join("\\n");

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64
              }
            },
            {
              type: "text",
              text: `Please analyze this floor image and provide a detailed SCSI diagnostic report.${
                contextInfo ? "\\n\\nAdditional context:\\n" + contextInfo : ""
              }`
            }
          ]
        }
      ]
    });

    const rawText = message.content.map((block) => block.text || "").join("").trim();
    const clean = rawText.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      return Response.json({
        error: "AI response could not be parsed as JSON.",
        raw: rawText
      }, { status: 502 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({
      error: error.message || "Analysis failed."
    }, { status: 500 });
  }
}