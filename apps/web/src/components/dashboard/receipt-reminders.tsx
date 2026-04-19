"use client";

import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, Upload, X, Ban, ChevronDown, ChevronUp } from "lucide-react";

interface Reminder {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string | null;
  categoryIcon: string | null;
}

export function ReceiptReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/receipts/reminders")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data && setReminders(data.reminders));
  }, []);

  async function dismiss(id: string) {
    await fetch("/api/receipts/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: id, status: "DISMISSED" }),
    });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  async function markMissing(id: string) {
    await fetch("/api/receipts/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: id, status: "MISSING" }),
    });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  async function uploadReceipt(id: string, file: File) {
    setUploadingId(id);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("transactionId", id);

    const res = await fetch("/api/receipts/ocr", { method: "POST", body: formData });
    if (res.ok) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    }
    setUploadingId(null);
  }

  if (reminders.length === 0) return null;

  const shown = expanded ? reminders : reminders.slice(0, 3);

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-950/10">
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium">
              {reminders.length} large transaction{reminders.length > 1 ? "s" : ""} without receipts
            </p>
          </div>
          {reminders.length > 3 && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Less" : `+${reminders.length - 3} more`}
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {shown.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              uploading={uploadingId === r.id}
              onDismiss={() => dismiss(r.id)}
              onMissing={() => markMissing(r.id)}
              onUpload={(file) => uploadReceipt(r.id, file)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReminderRow({
  reminder,
  uploading,
  onDismiss,
  onMissing,
  onUpload,
}: {
  reminder: Reminder;
  uploading: boolean;
  onDismiss: () => void;
  onMissing: () => void;
  onUpload: (file: File) => void;
}) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) onUpload(files[0]);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"], "application/pdf": [".pdf"] },
    maxFiles: 1,
    noClick: false,
  });

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span>{reminder.categoryIcon || "?"}</span>
        <div>
          <p className="text-sm font-medium">{reminder.description}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(reminder.date)} · {formatCurrency(reminder.amount)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 self-end sm:self-auto">
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <Button size="sm" variant="outline" className="gap-1 text-xs" disabled={uploading}>
            <Upload className="h-3 w-3" />
            {uploading ? "Processing..." : isDragActive ? "Drop here" : "Upload"}
          </Button>
        </div>
        <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={onMissing}>
          <Ban className="h-3 w-3" /> No Receipt
        </Button>
        <Button size="sm" variant="ghost" className="text-xs" onClick={onDismiss}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
