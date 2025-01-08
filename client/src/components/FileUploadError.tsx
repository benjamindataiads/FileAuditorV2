import { AlertCircle } from "lucide-react";

interface FileUploadErrorProps {
  error: {
    message: string;
    details?: string;
    suggestion?: string;
  };
  onRetry: () => void;
}

export function FileUploadError({ error, onRetry }: FileUploadErrorProps) {
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            File Upload Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.message}</p>
            {error.details && (
              <p className="mt-1 text-sm text-red-600">
                {error.details}
              </p>
            )}
            {error.suggestion && (
              <p className="mt-2 text-sm text-red-600">
                Suggestion: {error.suggestion}
              </p>
            )}
          </div>
          <div className="mt-4">
            <button
              type="button"
              className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
              onClick={onRetry}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 