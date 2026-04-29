// Generate structured interview feedback using tool calling
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, role } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const transcript = (messages ?? [])
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach. Evaluate the following mock interview for a "${role}" role and produce structured, fair, encouraging feedback. Be specific and actionable.

When scoring keyword_relevance_score: identify the key technical terms, tools, methodologies, and concepts that a strong "${role}" candidate would naturally use. Score 0-100 based on how well the candidate's answers used relevant role-specific vocabulary in context (not just name-dropping). List the most important matched and missing keywords.

When scoring clarity_score: evaluate how clearly and concisely the candidate expressed ideas — sentence structure, logical flow, absence of filler/rambling, and ease of understanding. Score 0-100.`,
          },
          { role: "user", content: `Transcript:\n\n${transcript}\n\nProvide your evaluation.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_feedback",
              description: "Submit structured feedback about the candidate's interview performance.",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "0-100 overall performance" },
                  communication_score: { type: "number", description: "0-100 clarity & articulation" },
                  technical_score: { type: "number", description: "0-100 technical/role knowledge" },
                  confidence_score: { type: "number", description: "0-100 confidence & presence" },
                  keyword_relevance_score: { type: "number", description: "0-100 use of role-relevant keywords/terminology" },
                  clarity_score: { type: "number", description: "0-100 clarity, conciseness, and structure of spoken answers" },
                  matched_keywords: { type: "array", items: { type: "string" }, description: "Key role-relevant terms the candidate used well" },
                  missing_keywords: { type: "array", items: { type: "string" }, description: "Important role-relevant terms the candidate should have used" },
                  summary: { type: "string", description: "2-3 sentence overall summary" },
                  strengths: { type: "array", items: { type: "string" }, description: "3-5 concrete strengths" },
                  improvements: { type: "array", items: { type: "string" }, description: "3-5 specific improvements" },
                  next_steps: { type: "array", items: { type: "string" }, description: "3-4 actionable next steps" },
                },
                required: [
                  "overall_score",
                  "communication_score",
                  "technical_score",
                  "confidence_score",
                  "keyword_relevance_score",
                  "clarity_score",
                  "matched_keywords",
                  "missing_keywords",
                  "summary",
                  "strengths",
                  "improvements",
                  "next_steps",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_feedback" } },
      }),
    });

    if (response.status === 429 || response.status === 402) {
      return new Response(
        JSON.stringify({
          error: response.status === 429 ? "Rate limit exceeded." : "AI credits exhausted.",
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured feedback returned");
    const feedback = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("interview-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
