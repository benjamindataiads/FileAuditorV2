import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { getFieldNames, getFrenchFieldName } from "@/lib/fieldMappings";
import { Badge } from "@/components/ui/badge";
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
}

export function ColumnMapping({ file, onMappingComplete }: ColumnMappingProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const availableFields = getFieldNames();

  useEffect(() => {
    const readHeaders = async () => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const lines = content.split('\n');
          if (lines.length > 0) {
            const headers = lines[0].split('\t').map(h => h.trim());
            setHeaders(headers);
          }
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Error reading file headers:', error);
      }
    };

    if (file) {
      readHeaders();
    }
  }, [file]);

  const handleMappingChange = (header: string, value: string) => {
    const newMapping = { ...mapping };
    if (value === "_unmapped") {
      delete newMapping[header];
    } else {
      newMapping[header] = value;
    }
    setMapping(newMapping);
    onMappingComplete(newMapping);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {headers.map((header) => (
          <div key={header} className="space-y-2">
            <Label>{header}</Label>
            <Select
              value={mapping[header] || "_unmapped"}
              onValueChange={(value) => handleMappingChange(header, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a field">
                  {mapping[header] 
                    ? `${mapping[header]} (${getFrenchFieldName(mapping[header])})`
                    : "Do not map this column"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_unmapped">Do not map this column</SelectItem>
                {availableFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field} ({getFrenchFieldName(field)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {Object.keys(mapping).length > 0 && (
        <div className="rounded-md border p-4 bg-background">
          <h3 className="font-medium mb-2">Current Mappings</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(mapping).map(([header, field]) => (
              <Badge key={header} variant="secondary">
                {header} → {field}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}