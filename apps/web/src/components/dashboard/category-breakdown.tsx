"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface CategoryData {
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
  daily: number;
}

interface CategoryBreakdownProps {
  categories: CategoryData[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const maxTotal = Math.max(...categories.map((c) => c.total), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet. Upload a CSV to get started.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(cat.daily)}/day &middot; {formatCurrency(cat.total)} total
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(cat.total / maxTotal) * 100}%`,
                      backgroundColor: cat.color || "#6366f1",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
