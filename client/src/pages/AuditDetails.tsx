const handleExport = async () => {
  try {
    const response = await fetch(`/api/audits/${id}/export`);
    if (!response.ok) throw new Error('Export failed');

    // Get the filename from the Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `audit-${id}-results.tsv`;

    // Create a blob from the response
    const blob = await response.blob();
    
    // Create a download link and click it
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (error) {
    console.error('Export error:', error);
    toast({
      title: "Export Failed",
      description: "Failed to export audit results",
      variant: "destructive"
    });
  }
}; 