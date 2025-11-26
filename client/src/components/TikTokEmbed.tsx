import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TikTokEmbedProps {
  url: string;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : null;
}

export function TikTokEmbed({ url }: TikTokEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoId = extractVideoId(url);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    const scriptId = "tiktok-embed-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.tiktok.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const checkAndLoad = () => {
      if ((window as any).tiktokEmbed) {
        (window as any).tiktokEmbed.lib.render();
      }
    };

    if ((window as any).tiktokEmbed) {
      checkAndLoad();
    } else {
      script.onload = checkAndLoad;
    }
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
        <span className="text-sm text-muted-foreground truncate flex-1">{url}</span>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="tiktok-embed-container">
      <blockquote
        className="tiktok-embed"
        cite={url}
        data-video-id={videoId}
        style={{ maxWidth: "325px", minWidth: "280px" }}
      >
        <section>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Loading TikTok video...
          </a>
        </section>
      </blockquote>
    </div>
  );
}
