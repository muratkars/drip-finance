"use client";

import { useEffect, useState } from "react";
import { DripIcon } from "@/components/ui/drip-icons";
import {
  DripCard, DripButton, DripSelect, DripLabel, SectionHead, dripInputClass,
} from "@/components/ui/drip-primitives";
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
    <div style={{ padding: "28px 32px 60px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex justify-between items-end mb-7">
        <div>
          <div className="drip-eyebrow mb-2" style={{ color: "var(--ink-3)" }}>Settings</div>
          <h1
            className="font-display m-0"
            style={{ fontSize: 40, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Assumptions & rules
          </h1>
        </div>
        <DripButton variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </DripButton>
      </div>

      {/* Transaction Rules */}
      <RulesManager categories={categories} />

      {/* Shelf Life */}
      <div className="mt-8">
        <SectionHead eyebrow="Assumptions" title="Item shelf life & lifespan">
          <div className="text-xs italic" style={{ color: "var(--ink-3)" }}>How long does a thing last?</div>
        </SectionHead>
        <AssumptionGroup
          items={shelfLifeAssumptions}
          assumptions={assumptions}
          onUpdate={updateAssumption}
          onRemove={removeAssumption}
        />
      </div>

      {/* Category spreads */}
      <div className="mt-8">
        <SectionHead eyebrow="Assumptions" title="Category spread periods" />
        <AssumptionGroup
          items={spreadAssumptions}
          assumptions={assumptions}
          onUpdate={updateAssumption}
          onRemove={removeAssumption}
        />
      </div>

      {/* Other */}
      {otherAssumptions.length > 0 && (
        <div className="mt-8">
          <SectionHead eyebrow="Custom" title="Other assumptions" />
          <AssumptionGroup
            items={otherAssumptions}
            assumptions={assumptions}
            onUpdate={updateAssumption}
            onRemove={removeAssumption}
          />
        </div>
      )}

      {/* Add custom */}
      <div className="mt-8">
        <DripCard padding={0}>
          <div
            className="flex items-center justify-between px-[18px] py-3"
            style={{ borderBottom: showAdd ? "1px solid var(--line)" : "none" }}
          >
            <div className="font-display text-lg" style={{ letterSpacing: "-0.01em" }}>
              Add custom assumption
            </div>
            <DripButton variant="ghost" size="sm" icon="plus" onClick={() => setShowAdd(!showAdd)}>
              Add
            </DripButton>
          </div>
          {showAdd && (
            <div className="px-[18px] py-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <DripLabel>Key</DripLabel>
                  <input
                    placeholder="e.g., coffee_beans"
                    value={newAssumption.key}
                    onChange={(e) => setNewAssumption((p) => ({ ...p, key: e.target.value }))}
                    className={dripInputClass + " mt-1.5 w-52"}
                  />
                </div>
                <div>
                  <DripLabel>Name</DripLabel>
                  <input
                    placeholder="Display name"
                    value={newAssumption.name}
                    onChange={(e) => setNewAssumption((p) => ({ ...p, name: e.target.value }))}
                    className={dripInputClass + " mt-1.5 w-40"}
                  />
                </div>
                <div>
                  <DripLabel>Value</DripLabel>
                  <input
                    type="number"
                    min={1}
                    value={newAssumption.value}
                    onChange={(e) => setNewAssumption((p) => ({ ...p, value: parseInt(e.target.value) || 1 }))}
                    className={dripInputClass + " mt-1.5 w-20"}
                  />
                </div>
                <div>
                  <DripLabel>Unit</DripLabel>
                  <div className="mt-1.5">
                    <DripSelect
                      value={newAssumption.unit}
                      onChange={(v) => setNewAssumption((p) => ({ ...p, unit: v }))}
                      options={[
                        { value: "DAYS", label: "Days" },
                        { value: "WEEKS", label: "Weeks" },
                        { value: "MONTHS", label: "Months" },
                        { value: "YEARS", label: "Years" },
                      ]}
                    />
                  </div>
                </div>
                <DripButton variant="primary" size="sm" onClick={addAssumption}>
                  Add
                </DripButton>
              </div>
            </div>
          )}
        </DripCard>
      </div>
    </div>
  );
}

function AssumptionGroup({
  items,
  assumptions,
  onUpdate,
  onRemove,
}: {
  items: Assumption[];
  assumptions: Assumption[];
  onUpdate: (index: number, field: keyof Assumption, value: string | number) => void;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <DripCard padding={0}>
      {items.map((a, i) => {
        const globalIndex = assumptions.indexOf(a);
        return (
          <div
            key={a.key}
            className="grid items-center gap-3.5 px-[18px] py-2.5"
            style={{
              gridTemplateColumns: "1fr 100px 120px 40px",
              borderBottom: i < items.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <input
              value={a.name}
              onChange={(e) => onUpdate(globalIndex, "name", e.target.value)}
              className="text-[13px] font-medium bg-transparent border-0 p-0 outline-none"
              style={{ color: "var(--ink)" }}
            />
            <input
              type="number"
              min={1}
              value={a.value}
              onChange={(e) => onUpdate(globalIndex, "value", parseInt(e.target.value) || 1)}
              className={dripInputClass + " !py-1 !px-2 text-xs"}
            />
            <DripSelect
              value={a.unit}
              onChange={(v) => onUpdate(globalIndex, "unit", v)}
              options={[
                { value: "DAYS", label: "Days" },
                { value: "WEEKS", label: "Weeks" },
                { value: "MONTHS", label: "Months" },
                { value: "YEARS", label: "Years" },
              ]}
            />
            <button
              onClick={() => onRemove(globalIndex)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
            >
              <DripIcon name="trash" size={13} />
            </button>
          </div>
        );
      })}
    </DripCard>
  );
}
