import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import * as XLSX from 'xlsx';
export default function AddressSplitter() {
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [splitColumn, setSplitColumn] = useState(null);
    const [processed, setProcessed] = useState([]);
    // --- Datei einlesen ---
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        setData(json);
        setColumns(Object.keys(json[0] || {}));
        setSplitColumn(autoDetectAddressColumn(json));
    };
    // --- Automatische Spaltenerkennung ---
    const autoDetectAddressColumn = (rows) => {
        let candidates = [];
        for (const col of Object.keys(rows[0] || {})) {
            const sample = rows.slice(0, 10).map((r) => String(r[col]));
            const plzCount = sample.filter((v) => /\b\d{5}\b/.test(v)).length;
            if (plzCount >= 1)
                candidates.push({ col, count: plzCount });
        }
        if (candidates.length > 0) {
            return candidates.sort((a, b) => b.count - a.count)[0].col;
        }
        return null;
    };
    // --- Adresse splitten ---
    const splitAddress = (rows, col) => {
        return rows.map((r) => {
            const val = String(r[col] || "").trim().replace(/,$/, "");
            const match = val.match(/(\d{5})\s*(.*)/);
            if (match) {
                const [, plz, city] = match;
                const street = val.replace(/\s*\d{5}.*$/, "").trim().replace(/,$/, "");
                return { ...r, Straße: street, PLZ: plz, Ort: city.trim().replace(/,$/, "") };
            }
            else {
                return { ...r, Straße: val.replace(/,$/, ""), PLZ: "", Ort: "" };
            }
        });
    };
    const handleSplit = () => {
        if (!splitColumn)
            return;
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
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-xl font-bold mb-2", children: "Adress-Splitter" }), _jsx("input", { type: "file", accept: ".xlsx,.xls,.csv", onChange: handleFileUpload }), data.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx("h2", { className: "font-semibold", children: "Spalte w\u00E4hlen:" }), _jsx("select", { value: splitColumn ?? "", onChange: (e) => setSplitColumn(e.target.value), children: columns.map((c) => (_jsx("option", { value: c, children: c }, c))) }), _jsx("button", { className: "ml-2 px-4 py-1 bg-blue-500 text-white rounded", onClick: handleSplit, children: "Splitten" })] })), processed.length > 0 && (_jsxs("div", { className: "mt-6", children: [_jsx("h2", { className: "font-semibold mb-2", children: "Vorschau (erste 5 Zeilen)" }), _jsxs("table", { className: "border-collapse border border-gray-400", children: [_jsx("thead", { children: _jsx("tr", { children: Object.keys(processed[0]).map((c) => (_jsx("th", { className: "border px-2 py-1", children: c }, c))) }) }), _jsx("tbody", { children: processed.slice(0, 5).map((row, i) => (_jsx("tr", { children: Object.values(row).map((val, j) => (_jsx("td", { className: "border px-2 py-1", children: String(val) }, j))) }, i))) })] }), _jsx("button", { className: "mt-4 px-4 py-1 bg-green-600 text-white rounded", onClick: handleDownload, children: "Excel herunterladen" })] }))] }));
}
