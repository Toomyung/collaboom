import { useState } from "react";
import { ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TikTokEmbedProps {
  url: string;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : null;
}

export function TikTokEmbed({ url }: TikTokEmbedProps) {
  const videoId = extractVideoId(url);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0);

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

  const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1`;

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setKey(prev => prev + 1);
  };

  return (
    <div className="relative">
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-xl z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Loading TikTok video...</span>
          </div>
        </div>
      )}
      
      {hasError ? (
        <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-xl min-h-[400px]">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Unable to load TikTok video
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="default" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open in TikTok
              </Button>
            </a>
          </div>
        </div>
      ) : (
        <iframe
          key={key}
          src={embedUrl}
          className="rounded-xl"
          style={{
            width: "325px",
            height: "575px",
            border: "none",
            overflow: "hidden",
          }}
          allow="autoplay; encrypted-media"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
}
