import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface PlacementImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function PlacementImageUpload({ value, onChange }: PlacementImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(value || "");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(value || "");
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (JPG, PNG, WebP)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onChange, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]
    },
    maxFiles: 1
  });

  const handleRemove = () => {
    onChange("");
    setPreviewUrl("");
    setUrlInput("");
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      setPreviewUrl(urlInput.trim());
      onChange(urlInput.trim());
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-3">
      {showUrlInput ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
              data-testid="input-placement-url"
            />
            <Button type="button" variant="default" onClick={handleUrlSubmit}>
              Set
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowUrlInput(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
              ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            `}
            data-testid="dropzone-placement"
          >
            <input {...getInputProps()} data-testid="input-placement-file" />
            
            {previewUrl ? (
              <div className="relative">
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm font-medium text-foreground">Preview</p>
                  
                  <div className="flex gap-6 justify-center flex-wrap">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Monitor className="h-3 w-3" />
                        <span>Desktop</span>
                      </div>
                      <div className="w-48 h-28 rounded-md overflow-hidden bg-muted border">
                        <img
                          src={previewUrl}
                          alt="Desktop Preview"
                          className="w-full h-full object-cover"
                          onError={() => {
                            toast({
                              title: "Image Load Error",
                              description: "Could not load the image. Please check the URL.",
                              variant: "destructive"
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Smartphone className="h-3 w-3" />
                        <span>Mobile</span>
                      </div>
                      <div className="w-20 h-28 rounded-md overflow-hidden bg-muted border">
                        <img
                          src={previewUrl}
                          alt="Mobile Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-0 right-0 h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  data-testid="button-remove-placement"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                {isDragActive ? (
                  <>
                    <Upload className="h-10 w-10 text-primary mb-3" />
                    <p className="text-sm font-medium text-primary">Drop the image here</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Drag & drop your placement image
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {!previewUrl && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowUrlInput(true)}
              data-testid="button-use-url"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Use Image URL Instead
            </Button>
          )}
        </>
      )}

      <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-2">
        <div>
          <p className="font-medium text-foreground">Recommended Size:</p>
          <p className="mt-1">
            <span className="font-medium">1200 x 900 px</span> (4:3 ratio)
          </p>
        </div>
        <p className="text-muted-foreground">
          This single image will automatically adapt to both mobile and desktop views. 
          Make sure the main subject is centered so it looks good when cropped.
        </p>
        <p>Supports JPG, PNG, WebP (max 5MB)</p>
      </div>
    </div>
  );
}
