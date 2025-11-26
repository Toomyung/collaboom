import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PlacementImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export function PlacementImageUpload({ value = [], onChange, maxImages = 6 }: PlacementImageUploadProps) {
  const [images, setImages] = useState<string[]>(value || []);
  const { toast } = useToast();

  useEffect(() => {
    const propsArray = value || [];
    if (JSON.stringify(propsArray) !== JSON.stringify(images)) {
      setImages(propsArray);
    }
  }, [value]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const remainingSlots = maxImages - images.length;
    const filesToProcess = acceptedFiles.slice(0, remainingSlots);

    if (acceptedFiles.length > remainingSlots) {
      toast({
        title: "Too many files",
        description: `Only ${remainingSlots} more image(s) can be added. Maximum is ${maxImages}.`,
        variant: "destructive"
      });
    }

    filesToProcess.forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please upload image files only (JPG, PNG, WebP)",
          variant: "destructive"
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 5MB per image",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImages(prev => {
          const newImages = [...prev, dataUrl];
          onChange(newImages);
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    });
  }, [images.length, maxImages, onChange, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]
    },
    disabled: images.length >= maxImages
  });

  const handleRemove = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      onChange(newImages);
      return newImages;
    });
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages(prev => {
      const newImages = [...prev];
      const [removed] = newImages.splice(from, 1);
      newImages.splice(to, 0, removed);
      onChange(newImages);
      return newImages;
    });
  };

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted border group"
            >
              <img
                src={img}
                alt={`Placement ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveImage(index, index - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemove(index)}
                  data-testid={`button-remove-image-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                {index < images.length - 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveImage(index, index + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                  Main
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
            ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          `}
          data-testid="dropzone-placement"
        >
          <input {...getInputProps()} data-testid="input-placement-file" />
          
          <div className="flex flex-col items-center justify-center py-4">
            {isDragActive ? (
              <>
                <Upload className="h-10 w-10 text-primary mb-3" />
                <p className="text-sm font-medium text-primary">Drop images here</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {images.length === 0 ? "Drag & drop placement images" : "Add more images"}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse ({images.length}/{maxImages})
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-2">
        <div>
          <p className="font-medium text-foreground">Image Guidelines:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Upload up to <span className="font-medium">{maxImages} images</span></li>
            <li>Recommended: <span className="font-medium">1200 x 900 px</span> (4:3 ratio)</li>
            <li>First image will be the main thumbnail</li>
            <li>Images auto-adapt to mobile and desktop views</li>
          </ul>
        </div>
        <p>Supports JPG, PNG, WebP (max 5MB each)</p>
      </div>
    </div>
  );
}
