import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const CaptionInput = z.object({
  image_url: z.string().url(),
  context: z.string().optional().default(""),
});

export const draftGalleryCaption = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CaptionInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false, error: "AI not configured" as const };
    const gateway = createLovableAiGatewayProvider(key);
    try {
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        messages: [
          {
            role: "system",
            content:
              "You write concise, warm social captions for a Sri Lankan high-school media unit (SCC Media Unit at Sivali Central College). Return 3 caption options separated by '---', each under 140 chars, followed by a final line starting 'TAGS:' with 5 relevant hashtags. Mix English + a light Sinhala touch when natural.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Context: ${data.context || "school event photo/video"}` },
              { type: "image", image: new URL(data.image_url) },
            ],
          },
        ],
      });
      return { ok: true as const, text };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "AI request failed" };
    }
  });
