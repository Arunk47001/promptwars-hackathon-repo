"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { HotspotRow } from "@/app/dashboard/types";

interface Props {
  hotspots: HotspotRow[];
  selectedId: string | null;
  onSelect: (hotspot: HotspotRow) => void;
}

export default function HotspotTable({ hotspots, selectedId, onSelect }: Props) {
  const top15 = hotspots.slice(0, 15);
  const chartData = top15.map((h) => ({
    name: `${h.district} / ${h.category}`,
    demand: h.demand_volume,
    infraGap: h.infra_gap_score,
    investmentOffset: -h.investment_offset
  }));

  return (
    <div>
      <div style={{ width: "100%", height: 300, marginBottom: "1rem" }}>
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="demand" stackId="a" fill="#2563eb" name="Demand volume (z)" />
            <Bar dataKey="infraGap" stackId="a" fill="#dc2626" name="Infra-gap severity (z)" />
            <Bar
              dataKey="investmentOffset"
              stackId="a"
              fill="#16a34a"
              name="Investment offset (−z)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th>Rank</th>
            <th>District</th>
            <th>Category</th>
            <th>Composite score</th>
            <th>Demand (z)</th>
            <th>Infra-gap (z)</th>
            <th>Investment offset (z)</th>
            <th>Submissions</th>
            <th>Duplicates</th>
            <th>Actioned</th>
          </tr>
        </thead>
        <tbody>
          {hotspots.map((h, i) => (
            <tr
              key={h.id}
              onClick={() => onSelect(h)}
              style={{
                cursor: "pointer",
                background: h.id === selectedId ? "#eef2ff" : undefined,
                borderBottom: "1px solid #eee"
              }}
              data-testid="hotspot-row"
            >
              <td>{i + 1}</td>
              <td>{h.district}</td>
              <td>{h.category}</td>
              <td>{h.composite_score.toFixed(2)}</td>
              <td>{h.demand_volume.toFixed(2)}</td>
              <td>{h.infra_gap_score.toFixed(2)}</td>
              <td>{h.investment_offset.toFixed(2)}</td>
              <td>{h.submission_count}</td>
              <td>{h.duplicate_count}</td>
              <td>{h.is_actioned ? "✅" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
