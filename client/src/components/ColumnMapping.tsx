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
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result as string;
          const lines = content.split('\n');
          const headers = lines[0].split('\t');
          setHeaders(headers);
          
          // Get sample values for each column (up to 5 rows)
          const sampleData: Record<string, string[]> = {};
          headers.forEach((header, index) => {
            sampleData[header] = lines.slice(1, 6).map(line => 
              line.split('\t')[index]?.trim() || ''
            ).filter(Boolean);
          });
          
          // Initialize mapping with auto-detected matches
          const initialMapping: Record<string, string> = {};
          const usedFields = new Set<string>();
          
          // First pass: exact matches
          headers.forEach(header => {
            const matchingField = availableFields.find(field => 
              !usedFields.has(field) && 
              field.toLowerCase() === header.toLowerCase()
            );
            
            if (matchingField) {
              initialMapping[header] = matchingField;
              usedFields.add(matchingField);
            }
          });
          
          // Second pass: content-based matches for unmapped headers
          headers.forEach(header => {
            if (initialMapping[header]) return;
            
            const columnValues = sampleData[header].join(' ').toLowerCase();
            let bestMatch = '';
            let bestScore = 0;
            
            availableFields.forEach(field => {
              if (usedFields.has(field)) return;
              
              // Calculate match score based on field name and sample values
              let score = 0;
              const fieldLower = field.toLowerCase();
              const headerLower = header.toLowerCase();
              
              // Check header name similarity
              if (headerLower.includes(fieldLower) || fieldLower.includes(headerLower)) {
                score += 2;
              }
              
              // Check content patterns
              if (field === 'price' && columnValues.match(/[\d.,]+(?:\s*(?:€|\$|EUR|USD))?/)) {
                score += 3;
              } else if (field === 'date' && columnValues.match(/\d{4}[-/]\d{2}[-/]\d{2}/)) {
                score += 3;
              } else if (field === 'url' && columnValues.match(/https?:\/\//)) {
                score += 3;
              }
              
              // Word matching
              const fieldWords = fieldLower.split(/[_\s-]+/);
              const headerWords = headerLower.split(/[_\s-]+/);
              fieldWords.forEach(fieldWord => {
                if (headerWords.some(headerWord => 
                  headerWord.includes(fieldWord) || fieldWord.includes(headerWord)
                )) {
                  score += 1;
                }
              });
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = field;
              }
            });
            
            if (bestScore >= 2) {  // Minimum threshold for auto-mapping
              initialMapping[header] = bestMatch;
              usedFields.add(bestMatch);
            }
          });
          
          setMapping(initialMapping);
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
                    {availableFields
                      .filter(field => !Object.values(mapping).includes(field) || mapping[header] === field)
                      .map((field) => (
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