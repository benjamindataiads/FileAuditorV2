import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardActions,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuditReport } from "@/components/AuditReport";
import type { Audit } from "@/lib/types";

export function AuditResults() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const { data: audit, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery<Audit>({
    queryKey: [`/api/audits/${id}`],
    queryFn: ({ pageParam = 1 }) => 
      fetch(`/api/audits/${id}?page=${pageParam}&limit=100`).then(res => res.json()),
    getNextPageParam: (lastPage) => 
      lastPage.pagination?.page < lastPage.pagination?.totalPages ? lastPage.pagination.page + 1 : undefined,
    enabled: !!id,
  });

  // Add intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/audits/${id}/reprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rules: audit?.results?.map(r => r.rule?.id).filter(Boolean) || [],
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reprocess audit');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Audit Reprocessing Started",
        description: "You will be redirected to the new audit results.",
      });
      // Navigate to the new audit results page
      navigate(`/audit/${data.auditId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reprocess audit",
        variant: "destructive",
      });
    },
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
        <div className="flex items-center gap-4">
          <Button
            onClick={() => reprocessMutation.mutate()}
            disabled={reprocessMutation.isPending}
            variant="outline"
          >
            {reprocessMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="w-4 h-4 mr-2" />
            )}
            Reprocess Audit
          </Button>
          <div className="text-sm text-muted-foreground">
            {new Date(audit.createdAt).toLocaleString()}
          </div>
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
