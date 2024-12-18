import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFieldNames, getFrenchFieldName } from "@/lib/fieldMappings";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { ArrowRight } from "lucide-react";

interface ColumnMappingProps {
  file: File;
  onMappingComplete: (mapping: Record<string, string>) => void;
  isLoading?: boolean;
}

interface DraggableItem {
  id: string;
  type: "column" | "field";
  content: string;
}

export function ColumnMapping({ file, onMappingComplete, isLoading }: ColumnMappingProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const availableFields = getFieldNames();
  
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor);
  const sensors = useSensors(mouseSensor, touchSensor);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = active.id as string;
    const overItem = over.id as string;
    
    // Only allow dragging from columns to fields or vice versa
    const activeType = activeItem.startsWith('column-') ? 'column' : 'field';
    const overType = overItem.startsWith('column-') ? 'column' : 'field';
    
    if (activeType === overType) return;

    const columnId = activeType === 'column' ? activeItem : overItem;
    const fieldId = activeType === 'field' ? activeItem : overItem;
    
    const header = columnId.replace('column-', '');
    const field = fieldId.replace('field-', '');
    
    const newMapping = { ...mapping };
    
    // Remove any existing mappings for this field
    Object.entries(newMapping).forEach(([key, value]) => {
      if (value === field) {
        delete newMapping[key];
      }
    });
    
    newMapping[header] = field;
    setMapping(newMapping);
    onMappingComplete(newMapping);
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

  function DraggableColumn({ header }: { header: string }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `column-${header}`,
    });

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`p-3 rounded-md border cursor-move transition-colors ${
          isDragging ? 'opacity-50' : ''
        } ${mapping[header] ? 'bg-primary/10 border-primary/20' : 'bg-card hover:bg-accent/50'}`}
      >
        <div className="font-medium">{header}</div>
        {mapping[header] && (
          <Badge variant="outline" className="mt-1">
            Mapped to: {mapping[header]}
          </Badge>
        )}
      </div>
    );
  }

  function DroppableField({ field }: { field: string }) {
    const { setNodeRef, isOver } = useDroppable({
      id: `field-${field}`,
    });

    const mappedColumn = Object.entries(mapping).find(([_, f]) => f === field)?.[0];

    return (
      <div
        ref={setNodeRef}
        className={`p-3 rounded-md border transition-colors ${
          isOver ? 'bg-primary/20 border-primary' : 
          mappedColumn ? 'bg-primary/10 border-primary/20' : 
          'bg-card hover:bg-accent/50'
        }`}
      >
        <div className="font-medium">{field}</div>
        <div className="text-sm text-muted-foreground">
          {getFrenchFieldName(field)}
        </div>
        {!mappedColumn && (
          <div className="mt-2 border-2 border-dashed border-muted-foreground/20 rounded-md p-2 text-sm text-muted-foreground text-center">
            Drop a column here
          </div>
        )}
        {mappedColumn && (
          <Badge variant="outline" className="mt-2">
            Mapped from: {mappedColumn}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-[1fr,auto,1fr] gap-8">
        {/* File Columns */}
        <Card>
          <CardHeader>
            <CardTitle>File Columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {headers.map((header) => (
              <DraggableColumn key={header} header={header} />
            ))}
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
        </div>

        {/* Available Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Available Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableFields.map((field) => (
              <DroppableField key={field} field={field} />
            ))}
          </CardContent>
        </Card>

        <DragOverlay>
          {activeId ? (
            <div className="p-3 rounded-md border bg-background shadow-lg">
              {activeId.startsWith('column-') ? (
                activeId.replace('column-', '')
              ) : (
                <div>
                  <div className="font-medium">
                    {activeId.replace('field-', '')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getFrenchFieldName(activeId.replace('field-', ''))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}