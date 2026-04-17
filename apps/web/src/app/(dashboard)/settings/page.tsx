"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Plus, Trash2 } from "lucide-react";
import { RulesManager } from "@/components/settings/rules-manager";

interface Assumption {
  id?: string;
  key: string;
  name: string;
  value: number;
  unit: string;
  categoryId?: string;
}

const DEFAULT_ASSUMPTIONS: Assumption[] = [
  { key: "milk_shelf_life", name: "Milk shelf life", value: 10, unit: "DAYS" },
  { key: "bread_shelf_life", name: "Bread shelf life", value: 7, unit: "DAYS" },
  { key: "eggs_shelf_life", name: "Eggs shelf life", value: 21, unit: "DAYS" },
  { key: "tv_lifespan", name: "TV lifespan", value: 5, unit: "YEARS" },
  { key: "phone_lifespan", name: "Phone lifespan", value: 3, unit: "YEARS" },
  { key: "laptop_lifespan", name: "Laptop lifespan", value: 4, unit: "YEARS" },
  { key: "car_registration_spread", name: "Car registration spread", value: 1, unit: "YEARS" },
  { key: "grocery_default_spread", name: "Grocery default spread", value: 7, unit: "DAYS" },
  { key: "category_housing_spread", name: "Housing cost spread", value: 30, unit: "DAYS" },
  { key: "category_utilities_spread", name: "Utilities spread", value: 30, unit: "DAYS" },
  { key: "category_insurance_spread", name: "Insurance spread", value: 30, unit: "DAYS" },
  { key: "category_subscriptions_spread", name: "Subscriptions spread", value: 30, unit: "DAYS" },
];

export default function SettingsPage() {
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string | null; type: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newAssumption, setNewAssumption] = useState({ key: "", name: "", value: 1, unit: "DAYS" });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchAssumptions();
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }

  async function fetchAssumptions() {
    const res = await fetch("/api/assumptions");
    const data = await res.json();
    if (data.length === 0) {
      setAssumptions(DEFAULT_ASSUMPTIONS);
    } else {
      setAssumptions(data);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    await fetch("/api/assumptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assumptions }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateAssumption(index: number, field: keyof Assumption, value: string | number) {
    setAssumptions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  }

  function removeAssumption(index: number) {
    setAssumptions((prev) => prev.filter((_, i) => i !== index));
  }

  function addAssumption() {
    if (!newAssumption.key || !newAssumption.name) return;
    setAssumptions((prev) => [...prev, { ...newAssumption }]);
    setNewAssumption({ key: "", name: "", value: 1, unit: "DAYS" });
    setShowAdd(false);
  }

  const shelfLifeAssumptions = assumptions.filter((a) => a.key.includes("shelf_life") || a.key.includes("lifespan"));
  const spreadAssumptions = assumptions.filter((a) => a.key.includes("spread"));
  const otherAssumptions = assumptions.filter(
    (a) => !a.key.includes("shelf_life") && !a.key.includes("lifespan") && !a.key.includes("spread")
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Adjust your assumptions to fine-tune your daily drip calculations
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 sm:self-start">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <RulesManager categories={categories} />

      <AssumptionGroup
        title="Item Shelf Life & Lifespan"
        description="How long items last before needing replacement"
        items={shelfLifeAssumptions}
        assumptions={assumptions}
        onUpdate={updateAssumption}
        onRemove={removeAssumption}
      />

      <AssumptionGroup
        title="Category Spread Periods"
        description="How many days to spread category expenses over"
        items={spreadAssumptions}
        assumptions={assumptions}
        onUpdate={updateAssumption}
        onRemove={removeAssumption}
      />

      {otherAssumptions.length > 0 && (
        <AssumptionGroup
          title="Other"
          description="Custom assumptions"
          items={otherAssumptions}
          assumptions={assumptions}
          onUpdate={updateAssumption}
          onRemove={removeAssumption}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Add Custom Assumption</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardHeader>
        {showAdd && (
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Key (e.g., coffee_beans_shelf_life)"
                value={newAssumption.key}
                onChange={(e) => setNewAssumption((p) => ({ ...p, key: e.target.value }))}
                className="w-64"
              />
              <Input
                placeholder="Display name"
                value={newAssumption.name}
                onChange={(e) => setNewAssumption((p) => ({ ...p, name: e.target.value }))}
                className="w-48"
              />
              <Input
                type="number"
                min={1}
                value={newAssumption.value}
                onChange={(e) => setNewAssumption((p) => ({ ...p, value: parseInt(e.target.value) || 1 }))}
                className="w-24"
              />
              <select
                value={newAssumption.unit}
                onChange={(e) => setNewAssumption((p) => ({ ...p, unit: e.target.value }))}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="DAYS">Days</option>
                <option value="WEEKS">Weeks</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </select>
              <Button onClick={addAssumption}>Add</Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function AssumptionGroup({
  title,
  description,
  items,
  assumptions,
  onUpdate,
  onRemove,
}: {
  title: string;
  description: string;
  items: Assumption[];
  assumptions: Assumption[];
  onUpdate: (index: number, field: keyof Assumption, value: string | number) => void;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((a) => {
            const globalIndex = assumptions.indexOf(a);
            return (
              <div key={a.key} className="flex items-center gap-3">
                <span className="w-48 text-sm font-medium">{a.name}</span>
                <Input
                  type="number"
                  min={1}
                  value={a.value}
                  onChange={(e) => onUpdate(globalIndex, "value", parseInt(e.target.value) || 1)}
                  className="w-24"
                />
                <select
                  value={a.unit}
                  onChange={(e) => onUpdate(globalIndex, "unit", e.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="DAYS">Days</option>
                  <option value="WEEKS">Weeks</option>
                  <option value="MONTHS">Months</option>
                  <option value="YEARS">Years</option>
                </select>
                <Button variant="ghost" size="icon" onClick={() => onRemove(globalIndex)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
