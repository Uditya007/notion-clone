import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePage, getPage } from "@/lib/db/pages";
import { logPageHistory } from "@/lib/db/history";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const pageId = formData.get("pageId") as string;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }
    if (!pageId) {
      return NextResponse.json({ error: "No pageId provided" }, { status: 400 });
    }

    console.log("[MEETING AUDIO API] Processing audio for page:", pageId, "size:", file.size);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    let title = "";
    let htmlContent = "";

    if (!apiKey) {
      // Mock Fallback
      title = "Supabase Schema & Auth Sync";
      htmlContent = `
        <div style="background: rgba(139, 92, 246, 0.03); border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin-bottom: 24px; color: #f3f4f6;">
          <h2 style="margin-top: 0; color: #a78bfa; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>🎙️</span> Supabase Schema & Auth Sync (Mock)
          </h2>
          
          <div style="margin: 16px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 13px; color: #9ca3af; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px;">
            <div><strong>📅 Date:</strong> ${new Date().toLocaleDateString('default', { dateStyle: 'long' })}</div>
            <div><strong>⏱️ Duration:</strong> 42 seconds</div>
            <div><strong>👥 Attendees:</strong> Alex (DB Tech), Sarah (Frontend), Gemini Agent</div>
          </div>

          <h3 style="color: #c084fc; font-size: 16px; margin-top: 24px; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📋 Executive Summary</h3>
          <p style="color: #d1d5db; line-height: 1.6; margin: 0 0 16px 0; font-size: 14.5px;">
            The team sync focused on completing the schema migrations required for our Postgres database. Alex will own building the vector extension support, while Sarah integrates JWT-based authentication across our Next.js API endpoints.
          </p>

          <h3 style="color: #c084fc; font-size: 16px; margin-top: 24px; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">✨ Key Discussion Topics</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #d1d5db; font-size: 14.5px;">
            <li style="margin-bottom: 8px;"><strong style="color: #f3f4f6;">Vector Extensions:</strong> Transitioning database fields to support pgvector to improve AI semantic querying capabilities.</li>
            <li style="margin-bottom: 8px;"><strong style="color: #f3f4f6;">API Protection:</strong> Ensuring Next.js middleware correctly interrogates user authorization headers.</li>
          </ul>

          <h3 style="color: #c084fc; font-size: 16px; margin-top: 24px; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🚀 Action Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13.5px; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid rgba(139, 92, 246, 0.2); color: #a78bfa;">
                <th style="padding: 8px 4px;">Task</th>
                <th style="padding: 8px 4px; width: 100px;">Assignee</th>
                <th style="padding: 8px 4px; width: 100px;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 8px 4px; color: #e5e7eb;">Implement pgvector schemas in migrations directory</td>
                <td style="padding: 8px 4px; color: #a78bfa;">Alex</td>
                <td style="padding: 8px 4px;"><span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-size: 11px;">In Progress</span></td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 8px 4px; color: #e5e7eb;">Verify Next.js middleware token checks</td>
                <td style="padding: 8px 4px; color: #a78bfa;">Sarah</td>
                <td style="padding: 8px 4px;"><span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Todo</span></td>
              </tr>
            </tbody>
          </table>

          <h3 style="color: #c084fc; font-size: 16px; margin-top: 24px; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">💬 Transcript</h3>
          <p style="font-style: italic; color: #9ca3af; font-size: 13.5px; line-height: 1.5; margin: 0; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03);">
            "We need to finalize the database schema migration by Thursday afternoon. Alex will handle the Postgres vector tables, and Sarah will verify that the Next.js API endpoints are fully authenticated."
          </p>
          
          <div style="font-size: 11px; color: #6b7280; margin-top: 16px; text-align: right;">
            🤖 Mock mode active. Configure GOOGLE_GENERATIVE_AI_API_KEY for live Gemini transcription.
          </div>
        </div>
      `;
    } else {
      // Call live Gemini REST API
      const prompt = `
        Please analyze this audio recording. Perform a precise text transcription of the conversation first.
        Based on the transcription, generate high-quality meeting notes. You should output a JSON object containing exactly two keys: "title" and "htmlContent".
        
        "title": A clean, concise title describing the meeting topic (e.g. "Database Schema Sync", "Design Review"). Do not exceed 5 words.
        "htmlContent": A beautifully structured, professionally styled HTML document representing the meeting notes. Use modern typography and a dark mode theme optimized for clearspace app (use background styles like "background: rgba(139, 92, 246, 0.03); border-left: 4px solid #8b5cf6;" for wrappers, cards, list styles, tables for Action Items, etc.). Make it look incredibly premium and clean. Include:
        - Meeting metadata (Date/Time, Suggested Attendees/Speakers)
        - Executive Summary
        - Key Discussion Points
        - Decisions Made
        - Action Items (in a neat HTML Table)
        - The Full Transcript (in an italic blockquote style container)
        
        Return ONLY valid JSON format. Do not surround with markdown blocks. Example format:
        {
          "title": "Meeting Title",
          "htmlContent": "<div>...</div>"
        }
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: file.type || "audio/webm",
                      data: base64Data,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Gemini Meeting API Error]:", errText);
        throw new Error(`Gemini service failed with status ${response.status}`);
      }

      const resJson = await response.json();
      const resultText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      try {
        const parsed = JSON.parse(resultText.trim());
        title = parsed.title || "Meeting Notes";
        htmlContent = parsed.htmlContent || `<p>${resultText}</p>`;
      } catch (err) {
        console.error("Failed to parse Gemini JSON output, raw output:", resultText);
        title = "Meeting Notes";
        htmlContent = resultText;
      }
    }

    // Fetch original page state before updating
    const originalPage = await getPage(supabase, pageId);
    
    // Save to page title & content
    const updatedPage = await updatePage(supabase, pageId, {
      title: title || originalPage?.title || "Meeting Notes",
      content: htmlContent,
    });

    // Log history
    if (originalPage) {
      const email = user.email || 'Contributor';
      logPageHistory(supabase, pageId, user.id, email, 'title', originalPage.title, title).catch(console.error);
      logPageHistory(supabase, pageId, user.id, email, 'content', originalPage.content, htmlContent).catch(console.error);
    }

    return NextResponse.json(updatedPage);

  } catch (err: any) {
    console.error("Meeting Audio API general error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
