
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
            
            // Auto-map fields where header matches French field name
            const newMapping = { ...mapping };
            headers.forEach(header => {
              availableFields.forEach(field => {
                const frenchName = getFrenchFieldName(field);
                if (header.toLowerCase() === frenchName.toLowerCase()) {
                  newMapping[header] = field;
                }
              });
            });
            setMapping(newMapping);
            onMappingComplete(newMapping);
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
  }, [file, availableFields, onMappingComplete]);

  const handleMappingChange = (field: string, header: string) => {
    const newMapping = { ...mapping };
    if (header === "_unmapped") {
      // Remove any existing mapping for this field
      const existingHeader = Object.entries(newMapping).find(([_, f]) => f === field)?.[0];
      if (existingHeader) {
        delete newMapping[existingHeader];
      }
    } else {
      // Remove any existing mapping for the selected header
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === field) {
          delete newMapping[key];
        }
      });
      newMapping[header] = field;
    }
    setMapping(newMapping);
    onMappingComplete(newMapping);
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div className="grid gap-4">
          {availableFields.map((field) => (
            <div key={field} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{getFrenchFieldName(field)}</Label>
                <div className={`h-2 w-2 rounded-full ${Object.entries(mapping).find(([_, f]) => f === field) ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <Select
                value={Object.entries(mapping).find(([_, f]) => f === field)?.[0] || "_unmapped"}
                onValueChange={(header) => handleMappingChange(field, header)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a column">
                    {Object.entries(mapping).find(([_, f]) => f === field)?.[0] || "No column mapped"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_unmapped">No column mapped</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(mapping).length > 0 && (
        <div className="w-80 rounded-md border p-4 bg-background h-fit sticky top-4">
          <h3 className="font-medium mb-2">Current Mappings</h3>
          <div className="flex justify-between mb-2 text-sm font-medium text-muted-foreground">
            <span>GMC Fields</span>
            <span>File Column Name</span>
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(mapping).map(([header, field]) => (
              <Badge key={header} variant="secondary" className="justify-between">
                <span>{getFrenchFieldName(field)}</span>
                <span className="ml-2 opacity-70">← {header}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
