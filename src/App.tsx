import React, { useState } from "react";
import * as XLSX from 'xlsx';

type AddressRow = {
  Straße: string;
  PLZ: string;
  Ort: string;
  [key: string]: string;
};

export default function AddressSplitter() {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [splitColumn, setSplitColumn] = useState<string | null>(null);
  const [processed, setProcessed] = useState<AddressRow[]>([]);

  // --- Datei einlesen ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

    setData(json);
    setColumns(Object.keys(json[0] || {}));
    setSplitColumn(autoDetectAddressColumn(json));
  };

  // --- Automatische Spaltenerkennung ---
  const autoDetectAddressColumn = (rows: any[]): string | null => {
    let candidates: { col: string; count: number }[] = [];
    for (const col of Object.keys(rows[0] || {})) {
      const sample = rows.slice(0, 10).map((r) => String(r[col]));
      const plzCount = sample.filter((v) => /\b\d{5}\b/.test(v)).length;
      if (plzCount >= 1) candidates.push({ col, count: plzCount });
    }
    if (candidates.length > 0) {
      return candidates.sort((a, b) => b.count - a.count)[0].col;
    }
    return null;
  };

  // --- Adresse splitten ---
  const splitAddress = (rows: any[], col: string): AddressRow[] => {
    return rows.map((r) => {
      const val = String(r[col] || "").trim().replace(/,$/, "");
      const match = val.match(/(\d{5})\s*(.*)/);
      if (match) {
        const [, plz, city] = match;
        const street = val.replace(/\s*\d{5}.*$/, "").trim().replace(/,$/, "");
        return { ...r, Straße: street, PLZ: plz, Ort: city.trim().replace(/,$/, "") };
      } else {
        return { ...r, Straße: val.replace(/,$/, ""), PLZ: "", Ort: "" };
      }
    });
  };

  const handleSplit = () => {
    if (!splitColumn) return;
    const newData = splitAddress(data, splitColumn);
    setProcessed(newData);
  };

  // --- Download als Excel ---
  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(processed);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Adressen");
    XLSX.writeFile(wb, "adressen_split.xlsx");
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Adress-Splitter</h1>

      {/* Upload */}
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />

      {data.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold">Spalte wählen:</h2>
          <select
            value={splitColumn ?? ""}
            onChange={(e) => setSplitColumn(e.target.value)}
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            className="ml-2 px-4 py-1 bg-blue-500 text-white rounded"
            onClick={handleSplit}
          >
            Splitten
          </button>
        </div>
      )}

      {/* Vorschau */}
      {processed.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Vorschau (erste 5 Zeilen)</h2>
          <table className="border-collapse border border-gray-400">
            <thead>
              <tr>
                {Object.keys(processed[0]).map((c) => (
                  <th key={c} className="border px-2 py-1">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processed.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="border px-2 py-1">
                      {String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <button
            className="mt-4 px-4 py-1 bg-green-600 text-white rounded"
            onClick={handleDownload}
          >
            Excel herunterladen
          </button>
        </div>
      )}
    </div>
  );
}
