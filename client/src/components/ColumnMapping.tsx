import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFieldNames, getFrenchFieldName } from "@/lib/fieldMappings";
import { Skeleton } from "@/components/ui/skeleton";

interface ColumnMappingProps {
  file: File;
  onMappingComplete: (mapping: Record<string, string>) => void;
  isLoading?: boolean;
}

export function ColumnMapping({ file, onMappingComplete, isLoading }: ColumnMappingProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const availableFields = getFieldNames();

  useEffect(() => {
    const readHeaders = async () => {
      try {
        // Read first line of the file to get headers
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const firstLine = content.split('\n')[0];
          const headers = firstLine.split('\t');
          setHeaders(headers);
          
          // Initialize mapping with auto-detected matches
          const initialMapping: Record<string, string> = {};
          headers.forEach(header => {
            // Try exact match first (case insensitive)
            let matchingField = availableFields.find(
              field => field.toLowerCase() === header.toLowerCase()
            );

            // If no exact match, try partial match
            if (!matchingField) {
              matchingField = availableFields.find(field => 
                header.toLowerCase().includes(field.toLowerCase()) ||
                field.toLowerCase().includes(header.toLowerCase())
              );
            }

            // If still no match, try matching words
            if (!matchingField) {
              const headerWords = header.toLowerCase().split(/[_\s-]+/);
              matchingField = availableFields.find(field => {
                const fieldWords = field.toLowerCase().split(/[_\s-]+/);
                return headerWords.some(word => 
                  fieldWords.some(fieldWord => 
                    word.includes(fieldWord) || fieldWord.includes(word)
                  )
                );
              });
            }

            if (matchingField) {
              initialMapping[header] = matchingField;
            }
          });
          setMapping(initialMapping);
          
          // Notify parent of initial mappings
          onMappingComplete(initialMapping);
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Error reading file headers:', error);
      }
    };

    if (file) {
      readHeaders();
    }
  }, [file, availableFields, onMappingComplete]);

  const handleMappingChange = (header: string, field: string) => {
    const newMapping = { ...mapping, [header]: field };
    setMapping(newMapping);
    
    // If all headers are mapped, notify parent
    if (Object.keys(newMapping).length === headers.length) {
      onMappingComplete(newMapping);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {headers.map((header) => (
        <Card key={header}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">File Column:</p>
                <p className="text-base">{header}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Map to Field:</p>
                <Select
                  value={mapping[header] || ""}
                  onValueChange={(value) => handleMappingChange(header, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field} ({getFrenchFieldName(field)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}