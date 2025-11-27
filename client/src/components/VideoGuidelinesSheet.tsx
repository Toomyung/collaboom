import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Video, Play, FileText, Key, Link as LinkIcon, ExternalLink } from "lucide-react";
import { TikTokEmbed } from "./TikTokEmbed";
import { Campaign } from "@shared/schema";

interface VideoGuidelinesSheetProps {
  campaign: Campaign;
  children?: React.ReactNode;
}

export function VideoGuidelinesSheet({ campaign, children }: VideoGuidelinesSheetProps) {
  const hasVideoGuidelines =
    campaign.videoEssentialCuts ||
    campaign.videoDetails ||
    campaign.videoKeyPoints ||
    (campaign.videoReferenceUrls && campaign.videoReferenceUrls.length > 0);

  if (!hasVideoGuidelines) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Video className="h-4 w-4" />
            Video Guidelines
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Guidelines
          </SheetTitle>
          <SheetDescription>
            Follow these guidelines to create your content for {campaign.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {campaign.videoEssentialCuts && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <Play className="h-4 w-4 text-primary" />
                Essential Cuts
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                {campaign.videoEssentialCuts}
              </div>
            </div>
          )}

          {campaign.videoDetails && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <FileText className="h-4 w-4 text-primary" />
                Video Details
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                {campaign.videoDetails}
              </div>
            </div>
          )}

          {campaign.videoKeyPoints && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <Key className="h-4 w-4 text-primary" />
                Key Points
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                {campaign.videoKeyPoints}
              </div>
            </div>
          )}

          {campaign.videoReferenceUrls && campaign.videoReferenceUrls.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-sm">
                <LinkIcon className="h-4 w-4 text-primary" />
                Reference Videos
              </h3>
              <div className="space-y-4">
                {campaign.videoReferenceUrls.map((url, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Video {i + 1}</span>
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        Open in TikTok
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <TikTokEmbed url={url} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
