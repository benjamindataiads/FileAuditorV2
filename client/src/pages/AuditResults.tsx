import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuditReport } from "@/components/AuditReport";
import type { Audit } from "@/lib/types";

export function AuditResults() {
  const { id } = useParams<{ id: string }>();

  const [page, setPage] = useState(1);
  const { data: audit, isLoading } = useQuery<Audit>({
    queryKey: [`/api/audits/${id}`, page],
    queryFn: () => fetch(`/api/audits/${id}?page=${page}&limit=100`).then(res => res.json()),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!audit) {
    return <div>Audit not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Audit Results</h1>
        <div className="text-sm text-muted-foreground">
          {new Date(audit.createdAt).toLocaleString()}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{audit.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditReport audit={audit} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
