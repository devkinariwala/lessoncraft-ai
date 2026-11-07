import axios from "axios";
import type { Source } from "../types.js";

const clean = (v: string) => v.replace(/<[^>]*>/g, "").trim();
export async function researchTopic(
  title: string,
  objective: string,
): Promise<{ sources: Source[]; warnings: string[] }> {
  const query = `${title}: ${objective}`;
  const sources: Source[] = [];
  const warnings: string[] = [];
  if (process.env.TAVILY_API_KEY) {
    try {
      const { data } = await axios.post("https://api.tavily.com/search", {
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 6,
        search_depth: "advanced",
        include_answer: false,
      });
      for (const r of data.results ?? [])
        sources.push({
          title: clean(r.title || "Web resource"),
          url: r.url,
          sourceType: "website",
          description: clean(r.content || "").slice(0, 500),
        });
    } catch {
      warnings.push(
        "Website research via Tavily failed. Retry research or check TAVILY_API_KEY.",
      );
    }
  } else warnings.push("Tavily is not configured; website search was skipped.");
  try {
    const { data } = await axios.get(
      "https://www.googleapis.com/books/v1/volumes",
      {
        params: {
          q: `${title} ${objective}`,
          maxResults: 5,
          printType: "books",
        },
      },
    );
    for (const item of data.items ?? []) {
      const v = item.volumeInfo ?? {};
      const url = v.infoLink || `https://books.google.com/books?id=${item.id}`;
      sources.push({
        title: v.title || "Book resource",
        url,
        sourceType: "book",
        author: (v.authors || []).join(", "),
        description:
          v.description?.slice(0, 450) || v.publisher || "Book reference",
      });
    }
  } catch {
    warnings.push("Google Books lookup failed; check connectivity and retry.");
  }
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const { data } = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            key: process.env.YOUTUBE_API_KEY,
            part: "snippet",
            q: `${title} ${objective}`,
            type: "video",
            maxResults: 5,
            videoEmbeddable: "true",
          },
        },
      );
      for (const item of data.items ?? []) {
        const id = item.id?.videoId;
        if (id)
          sources.push({
            title: clean(item.snippet?.title || "YouTube video"),
            url: `https://www.youtube.com/watch?v=${id}`,
            sourceType: "youtube",
            description: clean(item.snippet?.description || "").slice(0, 350),
          });
      }
    } catch {
      warnings.push(
        "YouTube search failed. Check YOUTUBE_API_KEY and API quota.",
      );
    }
  } else
    warnings.push(
      "YouTube Data API is not configured; YouTube search was skipped.",
    );
  const unique = [
    ...new Map(sources.filter((s) => s.url).map((s) => [s.url, s])).values(),
  ];
  return { sources: unique, warnings };
}
