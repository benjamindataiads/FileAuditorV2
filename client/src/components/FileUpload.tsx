import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onUpload: (file: File) => void;
  accept?: string;
  loading?: boolean;
}

export function FileUpload({ onUpload, accept, loading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8">
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        className="hidden"
      />
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Drag and drop your file here, or
        </p>
        <Button
          variant="link"
          onClick={handleClick}
          disabled={loading}
          className="text-sm"
        >
          click to browse
        </Button>
      </div>
    </div>
  );
}
