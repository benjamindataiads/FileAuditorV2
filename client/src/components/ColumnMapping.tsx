import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFieldNames, getFrenchFieldName } from "@/lib/fieldMappings";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ColumnMappingProps {
  file: File;
  onMappingComplete: (mapping: Record<string, string>) => void;
  isLoading?: boolean;
}

export function ColumnMapping({ file, onMappingComplete, isLoading }: ColumnMappingProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const availableFields = getFieldNames();

  const handleMappingChange = (header: string, field: string) => {
    setMapping(prevMapping => {
      const newMapping = { ...prevMapping };
      
      // If unmapping, remove the field
      if (field === "_unmapped") {
        delete newMapping[header];
      } else {
        // Remove any existing mappings to this field
        Object.entries(newMapping).forEach(([key, value]) => {
          if (value === field) {
            delete newMapping[key];
          }
        });
        // Add new mapping
        newMapping[header] = field;
      }
      
      onMappingComplete(newMapping);
      return newMapping;
    });
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Get list of available (unmapped) fields
  const getAvailableFields = (currentHeader: string) => {
    const currentField = mapping[currentHeader];
    const usedFields = new Set(Object.values(mapping));
    return availableFields.filter(field => 
      field === currentField || !usedFields.has(field)
    );
  };

  return (
    <div className="space-y-4">
      {headers.map((header) => (
        <div key={header} className="grid gap-2">
          <Label>{header}</Label>
          <Select
            key={`${header}-${mapping[header] || "_unmapped"}`}
            value={mapping[header] || "_unmapped"}
            onValueChange={(value) => handleMappingChange(header, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {mapping[header] ? `${mapping[header]} (${getFrenchFieldName(mapping[header])})` : "Do not map this column"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_unmapped">Do not map this column</SelectItem>
              {getAvailableFields(header).map((field) => (
                <SelectItem key={field} value={field}>
                  {field} ({getFrenchFieldName(field)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {Object.keys(mapping).length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Current Mappings:</h3>
          <div className="space-y-2">
            {Object.entries(mapping).map(([header, field]) => (
              <Badge key={header} variant="outline">
                {header} → {field}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
