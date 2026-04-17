"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";

interface PreviewTransaction {
  hash: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  confidence: number;
  isDuplicate: boolean;
  duplicateSource: "existing" | "file" | null;
}

interface UploadResponse {
  format: string;
  count: number;
  duplicateCount: number;
  errors: string[];
  preview: PreviewTransaction[];
  categories: { id: string; name: string; icon: string | null; color: string | null; type: string }[];
}

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setResult(data);
    } catch {
      setError("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }, []);

  async function handleCommit() {
    if (!result) return;
    setCommitting(true);

    // Filter out duplicates marked for skipping
    const nonDuplicates = result.preview.filter((tx) => !tx.isDuplicate);

    try {
      const res = await fetch("/api/upload/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: nonDuplicates.map((tx) => ({
            hash: tx.hash,
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            categoryId: tx.categoryId,
          })),
        }),
      });

      if (res.ok) {
        router.push(`/transactions`);
      }
    } finally {
      setCommitting(false);
    }
  }

  function handleCategoryChange(hash: string, newCategoryId: string) {
    if (!result) return;
    const cat = result.categories.find((c) => c.id === newCategoryId);
    setResult({
      ...result,
      preview: result.preview.map((tx) =>
        tx.hash === hash
          ? { ...tx, categoryId: newCategoryId, categoryName: cat?.name || "Uncategorized", categoryIcon: cat?.icon || null }
          : tx
      ),
    });
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Upload Statement</h1>
        <p className="text-sm text-muted-foreground">Import transactions from your bank CSV</p>
      </div>

      {!result && (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              {uploading ? (
                <p className="text-muted-foreground">Parsing file...</p>
              ) : isDragActive ? (
                <p className="text-primary">Drop your CSV file here</p>
              ) : (
                <>
                  <p className="font-medium">Drag & drop your CSV file here</p>
                  <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Supports Chase, generic bank formats, and debit/credit column formats
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Preview: {result.count} transactions
                  </CardTitle>
                  <CardDescription>
                    Format detected: {result.format}
                    {result.duplicateCount > 0 && (
                      <span className="ml-2 text-amber-600">
                        {result.duplicateCount} duplicate{result.duplicateCount > 1 ? "s" : ""} found — will be skipped
                      </span>
                    )}
                    {result.errors.length > 0 && ` (${result.errors.length} warnings)`}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setResult(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCommit} disabled={committing} className="gap-2">
                    <Check className="h-4 w-4" />
                    {committing
                      ? "Importing..."
                      : `Import ${result.count - result.duplicateCount}`}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((tx, i) => (
                      <tr
                        key={`${tx.hash}-${i}`}
                        className={`border-b last:border-0 ${
                          tx.isDuplicate
                            ? "bg-amber-50 opacity-60 dark:bg-amber-950/20"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <td className="p-3 text-sm">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="max-w-[200px] p-3 text-sm font-medium">
                          <span className="truncate">{tx.description}</span>
                          {tx.isDuplicate && (
                            <Badge variant="outline" className="ml-2 border-amber-500 text-amber-600">
                              {tx.duplicateSource === "existing" ? "Already imported" : "Duplicate in file"}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <select
                            value={tx.categoryId}
                            onChange={(e) => handleCategoryChange(tx.hash, e.target.value)}
                            className="rounded border bg-background px-2 py-1 text-xs"
                            disabled={tx.isDuplicate}
                          >
                            {result.categories
                              .filter((c) => c.type === tx.type)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.icon} {c.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="p-3 text-right text-sm font-semibold">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-3">
                          <Badge variant={tx.type === "INCOME" ? "default" : "secondary"}>
                            {tx.type}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
