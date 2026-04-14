"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface SankeyData {
  incomes: { name: string; amount: number; color: string }[];
  expenses: { name: string; amount: number; color: string }[];
  totalIncome: number;
  totalExpense: number;
}

interface SankeyChartProps {
  data: SankeyData;
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 500;
const NODE_WIDTH = 20;
const NODE_GAP = 8;
const LEFT_X = 60;
const RIGHT_X = CHART_WIDTH - 80;
const CENTER_X = CHART_WIDTH / 2;
const MARGIN_TOP = 40;
const USABLE_HEIGHT = CHART_HEIGHT - MARGIN_TOP - 40;

export function SankeyChart({ data }: SankeyChartProps) {
  const { incomes, expenses, totalIncome, totalExpense } = data;

  const chart = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return null;

    const maxTotal = Math.max(totalIncome, totalExpense, 1);

    // Calculate node positions for incomes (left side)
    const incomeNodes: { name: string; y: number; height: number; amount: number; color: string }[] = [];
    let incomeY = MARGIN_TOP;
    for (const inc of incomes) {
      const height = Math.max((inc.amount / maxTotal) * USABLE_HEIGHT, 4);
      incomeNodes.push({ name: inc.name, y: incomeY, height, amount: inc.amount, color: inc.color });
      incomeY += height + NODE_GAP;
    }

    // Calculate node positions for expenses (right side)
    const expenseNodes: { name: string; y: number; height: number; amount: number; color: string }[] = [];
    let expenseY = MARGIN_TOP;
    for (const exp of expenses) {
      const height = Math.max((exp.amount / maxTotal) * USABLE_HEIGHT, 4);
      expenseNodes.push({ name: exp.name, y: expenseY, height, amount: exp.amount, color: exp.color });
      expenseY += height + NODE_GAP;
    }

    // Build flow paths (each income flows proportionally to each expense)
    const flows: {
      sourceY: number;
      sourceHeight: number;
      targetY: number;
      targetHeight: number;
      color: string;
      amount: number;
      sourceName: string;
      targetName: string;
    }[] = [];

    // Track current Y offsets for stacking flows within nodes
    const incomeOffsets = incomeNodes.map(() => 0);
    const expenseOffsets = expenseNodes.map(() => 0);

    for (let i = 0; i < incomeNodes.length; i++) {
      for (let j = 0; j < expenseNodes.length; j++) {
        // Each income contributes proportionally to each expense
        const flowAmount = (incomeNodes[i].amount / totalIncome) * expenseNodes[j].amount;
        const sourceFlowHeight = (flowAmount / incomeNodes[i].amount) * incomeNodes[i].height;
        const targetFlowHeight = (flowAmount / expenseNodes[j].amount) * expenseNodes[j].height;

        flows.push({
          sourceY: incomeNodes[i].y + incomeOffsets[i],
          sourceHeight: sourceFlowHeight,
          targetY: expenseNodes[j].y + expenseOffsets[j],
          targetHeight: targetFlowHeight,
          color: expenseNodes[j].color,
          amount: flowAmount,
          sourceName: incomeNodes[i].name,
          targetName: expenseNodes[j].name,
        });

        incomeOffsets[i] += sourceFlowHeight;
        expenseOffsets[j] += targetFlowHeight;
      }
    }

    // Surplus flow (if income > expenses)
    const surplus = totalIncome - totalExpense;

    return { incomeNodes, expenseNodes, flows, surplus };
  }, [incomes, expenses, totalIncome, totalExpense]);

  if (!chart) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No data to display. Upload transactions to see your cash flow.
        </CardContent>
      </Card>
    );
  }

  function flowPath(
    sourceY: number,
    sourceHeight: number,
    targetY: number,
    targetHeight: number
  ): string {
    const sx = LEFT_X + NODE_WIDTH;
    const tx = RIGHT_X;
    const cx = (sx + tx) / 2;

    return `
      M ${sx} ${sourceY}
      C ${cx} ${sourceY}, ${cx} ${targetY}, ${tx} ${targetY}
      L ${tx} ${targetY + targetHeight}
      C ${cx} ${targetY + targetHeight}, ${cx} ${sourceY + sourceHeight}, ${sx} ${sourceY + sourceHeight}
      Z
    `;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Cash Flow</CardTitle>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">Income: {formatCurrency(totalIncome)}</span>
            <span className="text-red-600">Expenses: {formatCurrency(totalExpense)}</span>
            {chart.surplus > 0 && (
              <span className="font-semibold text-primary">Surplus: {formatCurrency(chart.surplus)}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" style={{ maxHeight: 500 }}>
          {/* Flow paths */}
          {chart.flows.map((flow, i) => (
            <path
              key={i}
              d={flowPath(flow.sourceY, flow.sourceHeight, flow.targetY, flow.targetHeight)}
              fill={flow.color}
              opacity={0.3}
              className="transition-opacity hover:opacity-60"
            >
              <title>
                {flow.sourceName} → {flow.targetName}: {formatCurrency(flow.amount)}
              </title>
            </path>
          ))}

          {/* Income nodes (left) */}
          {chart.incomeNodes.map((node) => (
            <g key={`inc-${node.name}`}>
              <rect
                x={LEFT_X}
                y={node.y}
                width={NODE_WIDTH}
                height={node.height}
                fill="#22c55e"
                rx={3}
              />
              <text
                x={LEFT_X - 8}
                y={node.y + node.height / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-foreground text-[11px]"
              >
                {node.name}
              </text>
              <text
                x={LEFT_X - 8}
                y={node.y + node.height / 2 + 14}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatCurrency(node.amount)}
              </text>
            </g>
          ))}

          {/* Expense nodes (right) */}
          {chart.expenseNodes.map((node) => (
            <g key={`exp-${node.name}`}>
              <rect
                x={RIGHT_X}
                y={node.y}
                width={NODE_WIDTH}
                height={node.height}
                fill={node.color}
                rx={3}
              />
              <text
                x={RIGHT_X + NODE_WIDTH + 8}
                y={node.y + node.height / 2}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-foreground text-[11px]"
              >
                {node.name}
              </text>
              <text
                x={RIGHT_X + NODE_WIDTH + 8}
                y={node.y + node.height / 2 + 14}
                textAnchor="start"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatCurrency(node.amount)}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}
