import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiTiktok } from "react-icons/si";

interface TikTokEmbedProps {
  url: string;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : null;
}

function extractUsername(url: string): string | null {
  const match = url.match(/@([^/]+)/);
  return match ? match[1] : null;
}

export function TikTokEmbed({ url }: TikTokEmbedProps) {
  const videoId = extractVideoId(url);
  const username = extractUsername(url);
  const [isHovered, setIsHovered] = useState(false);

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
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="relative aspect-[9/16] max-w-[200px] rounded-xl overflow-hidden bg-gradient-to-br from-[#ff0050] via-[#00f2ea] to-[#000] cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
        style={{ boxShadow: isHovered ? "0 8px 30px rgba(0,0,0,0.3)" : "0 4px 15px rgba(0,0,0,0.2)" }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
          <div className="bg-black/30 backdrop-blur-sm rounded-full p-4 mb-3">
            <SiTiktok className="h-8 w-8" />
          </div>
          
          <div className="text-center">
            {username && (
              <p className="text-xs opacity-80 mb-1">@{username}</p>
            )}
            <p className="text-sm font-medium mb-3">TikTok Video</p>
          </div>
          
          <div className={`flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${isHovered ? "scale-105" : ""}`}>
            <Play className="h-4 w-4 fill-current" />
            Watch on TikTok
          </div>
        </div>
        
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center">
          <span className="text-[10px] text-white/60 truncate max-w-full">
            ID: {videoId.slice(0, 10)}...
          </span>
        </div>
      </div>
    </a>
  );
}
