import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useUser, SignIn, UserButton } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./lib/supabase";
import {
  useListNotes,
  getListNotesQueryKey,
  getGetMeQueryKey,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNotePin,
  useGetMe,
  useListUsers,
  getListUsersQueryKey,
  useUpdateUserRole,
} from "@workspace/api-client-react";

interface Note {
  id: number;
  type: "text" | "jsx";
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  createdByClerkId: string | null;
  createdAt: string;
  updatedAt: string;
}

type UserRole = "admin" | "editor" | "viewer";

interface NoteDraft {
  id?: number;
  type: "text" | "jsx";
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
}

interface Settings {
  dark: boolean;
}

interface EditModalData {
  isNew: boolean;
  note: NoteDraft;
}

const APP_KEY = "study_notes_v2";

const DEFAULT_CATEGORIES: string[] = [
  "All Notes",
  "Dravyaguna",
  "Rog Nidan",
  "Swasthavritta",
  "Agadtantra",
  "Ras Shastra",
  "Uncategorized",
];

const DEMO_JSX_SOURCE = `import { useState } from "react";

const diseases = [
{
id: "pneumonia", name: "Pneumonia", color: "#e85d26",
lightColor: "#fff4f0", borderColor: "#f4a07a", icon: "🫁",
definition: "Acute inflammatory condition of the lung parenchyma caused by infection, aspiration, or chemical agents.",
types: [
{ name: "CAP", full: "Community Acquired Pneumonia", note: "Outside hospital / <48h of admission" },
{ name: "HAP", full: "Hospital Acquired Pneumonia", note: ">48h after admission" },
{ name: "Aspiration", full: "Aspiration Pneumonia", note: "Inhalation of oropharyngeal/gastric contents" },
],
causes: [
{ category: "Bacteria (Most Common)", items: ["Streptococcus pneumoniae", "Haemophilus influenzae", "Klebsiella pneumoniae (alcoholics)", "Staphylococcus aureus (post-influenza)"] },
{ category: "Viruses", items: ["Influenza A & B", "RSV (children)", "SARS-CoV-2"] },
],
clinical: [
{ system: "Symptoms", points: ["Fever with chills/rigors (sudden onset)", "Productive cough — purulent / rust-coloured sputum", "Pleuritic chest pain", "Dyspnoea", "Malaise, anorexia, myalgia"] },
{ system: "Chest Examination", points: ["Percussion: Dull note over consolidation", "Auscultation: Bronchial breathing, crepitations (coarse), pleural rub", "TVF: Increased"] },
],
investigations: [
{ name: "CXR (Chest X-Ray)", detail: "Lobar/segmental consolidation; homogeneous opacity; air bronchograms" },
{ name: "CBC", detail: "Neutrophilic leukocytosis (bacterial); Lymphocytosis (viral/atypical)" },
{ name: "Sputum Gram Stain & Culture", detail: "Identifies causative organism; guides antibiotic therapy" },
],
memory: "COPS — Cough, riOrs (chills), Pleuritic pain, Shortness of breath",
},
{
id: "copd", name: "COPD", color: "#1a6eb5",
lightColor: "#f0f6ff", borderColor: "#7ab3e8", icon: "💨",
definition: "Chronic Obstructive Pulmonary Disease — persistent, progressive airflow limitation NOT fully reversible.",
types: [
{ name: "Chronic Bronchitis", full: "Blue Bloater", note: "Productive cough >= 3 months/yr for >= 2 consecutive years" },
{ name: "Emphysema", full: "Pink Puffer", note: "Permanent alveolar destruction; barrel chest, no cyanosis" },
],
causes: [
{ category: "Primary", items: ["Cigarette smoking (85-90%)", "Biomass fuel smoke (India)", "Air pollution"] },
{ category: "Host Factors", items: ["Alpha-1 Antitrypsin Deficiency", "Childhood respiratory infections"] },
],
clinical: [
{ system: "Classic Triad", points: ["Chronic productive cough", "Expectoration (mucoid sputum)", "Progressive dyspnoea on exertion"] },
{ system: "Signs — Emphysema", points: ["Barrel chest", "Pursed-lip breathing", "Hyperresonant percussion", "Reduced breath sounds"] },
],
investigations: [
{ name: "Spirometry (Gold Standard)", detail: "FEV1/FVC < 0.70 post-bronchodilator — confirms obstruction" },
{ name: "CXR", detail: "Hyperinflation, flat diaphragms, bullae" },
{ name: "ABG", detail: "Type II respiratory failure (increased PaCO2, decreased PaO2)" },
],
memory: "COPD = Cough + sputum + Obstruction + Progressive Dyspnoea (irreversible)",
},
];

export default function LungStudyGuide() {
const [activeDisease, setActiveDisease] = useState("pneumonia");
const [activeTab, setActiveTab] = useState("clinical");
const [expandedSection, setExpandedSection] = useState(null);
const disease = diseases.find(function(d) { return d.id === activeDisease; });

return (
<div style={{ fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh", color: "#1a1a2e" }}>
<div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)", color: "white", padding: "20px", textAlign: "center" }}>
<div style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: "#a0c4ff", marginBottom: "4px" }}>NCISM - II BAMS - Topic 16</div>
<h1 style={{ margin: 0, fontSize: "20px" }}>Common Lung Disorders</h1>
<div style={{ fontSize: "11px", color: "#8899aa", marginTop: "4px" }}>CO2 - CO3 - CO4</div>
</div>

  <div style={{ display: "flex", gap: "8px", padding: "12px", background: "#eee9e0", overflowX: "auto" }}>
    {diseases.map(function(d) {
      return (
        <button key={d.id}
          onClick={function() { setActiveDisease(d.id); setActiveTab("clinical"); setExpandedSection(null); }}
          style={{ flex: "1 0 auto", padding: "9px 12px", borderRadius: "10px",
            border: "2px solid " + (activeDisease === d.id ? d.color : "transparent"),
            background: activeDisease === d.id ? d.lightColor : "white",
            color: activeDisease === d.id ? d.color : "#555",
            fontWeight: activeDisease === d.id ? "700" : "500", fontSize: "13px", cursor: "pointer" }}>
          {d.icon} {d.name}
        </button>
      );
    })}
  </div>

  <div style={{ padding: "14px" }}>
    <div style={{ background: disease.lightColor, border: "1.5px solid " + disease.borderColor, borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "26px" }}>{disease.icon}</span>
        <div>
          <div style={{ color: disease.color, fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>{disease.name}</div>
          <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#333" }}>{disease.definition}</div>
        </div>
      </div>
      <div style={{ marginTop: "10px", background: "#fffbeb", border: "1px solid #f5d878", borderRadius: "8px", padding: "8px 12px", fontSize: "12px" }}>
        <span style={{ fontWeight: "700", color: "#b45309" }}>Memory: </span>
        <span style={{ color: "#78350f" }}>{disease.memory}</span>
      </div>
    </div>

    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
      {["clinical", "investigations"].map(function(tab) {
        return (
          <button key={tab} onClick={function() { setActiveTab(tab); }}
            style={{ flex: 1, padding: "9px", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "13px",
              background: activeTab === tab ? disease.color : "white",
              color: activeTab === tab ? "white" : "#666", cursor: "pointer" }}>
            {tab === "clinical" ? "Clinical" : "Investigations"}
          </button>
        );
      })}
    </div>

    {activeTab === "clinical" && disease.clinical.map(function(sec, i) {
      var key = disease.id + "-" + i;
      return (
        <div key={i} style={{ background: "white", borderRadius: "10px", border: "1px solid " + disease.borderColor, marginBottom: "8px", overflow: "hidden" }}>
          <button onClick={function() { setExpandedSection(expandedSection === key ? null : key); }}
            style={{ width: "100%", padding: "11px 14px", display: "flex", justifyContent: "space-between",
              background: expandedSection === key ? disease.lightColor : "white", border: "none", cursor: "pointer" }}>
            <span style={{ fontWeight: "700", color: disease.color, fontSize: "13px" }}>{sec.system}</span>
            <span style={{ color: "#999" }}>{expandedSection === key ? "▲" : "▼"}</span>
          </button>
          {expandedSection === key && (
            <div style={{ padding: "8px 14px 12px", borderTop: "1px solid " + disease.borderColor }}>
              {sec.points.map(function(pt, j) {
                return (
                  <div key={j} style={{ display: "flex", gap: "8px", padding: "4px 0", fontSize: "13px" }}>
                    <span style={{ color: disease.color }}>•</span>
                    <span style={{ color: "#333" }}>{pt}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })}

    {activeTab === "investigations" && disease.investigations.map(function(inv, i) {
      return (
        <div key={i} style={{ background: "white", border: "1px solid " + disease.borderColor,
          borderLeft: "4px solid " + disease.color, borderRadius: "10px", padding: "10px 13px", marginBottom: "8px" }}>
          <div style={{ fontWeight: "700", color: disease.color, fontSize: "13px", marginBottom: "4px" }}>{inv.name}</div>
          <div style={{ color: "#444", fontSize: "12px", lineHeight: "1.5" }}>{inv.detail}</div>
        </div>
      );
    })}
  </div>
</div>

);
}`;

const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const fmtDate = (ts: string | number): string => {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(`${APP_KEY}_settings`);
    return raw ? (JSON.parse(raw) as Settings) : { dark: false };
  } catch {
    return { dark: false };
  }
};

const saveSettings = (s: Settings): void => {
  try {
    localStorage.setItem(`${APP_KEY}_settings`, JSON.stringify(s));
  } catch {
    // ignore
  }
};

const buildIframeHTML = (jsxSource: string): string => {
  const safeSource = JSON.stringify(jsxSource);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>* { box-sizing: border-box; } body { margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="root"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
  <script>window.__JSX_SOURCE__ = ${safeSource};</script>
  <script>
    (function() {
      var src = window.__JSX_SOURCE__;
      src = src.replace(/^import\\s+.*?from\\s+['"][^'"]+['"];?\\s*$/gm, "").trim();
      var match =
        src.match(/export\\s+default\\s+function\\s+(\\w+)/) ||
        src.match(/export\\s+default\\s+class\\s+(\\w+)/) ||
        src.match(/export\\s+default\\s+(\\w+)\\s*;?\\s*$/m);
      var componentName = match ? match[1] : null;
      src = src
        .replace(/export\\s+default\\s+function\\s+/, "function ")
        .replace(/export\\s+default\\s+class\\s+/, "class ")
        .replace(/export\\s+default\\s+(\\w+)\\s*;?\\s*$/, "");
      var mountCall = componentName
        ? "ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(" + componentName + "));"
        : "document.getElementById('root').innerHTML = '<p style=\\"color:red;padding:20px\\">Could not detect default export.</p>';";
      var preamble = "const { useState, useEffect, useRef, useCallback, useMemo, useReducer } = React;";
      var fullCode = preamble + "\\n" + src + "\\n" + mountCall;
      try {
        var transpiled = Babel.transform(fullCode, { presets: ["react"] }).code;
        new Function(transpiled)();
      } catch(err) {
        document.getElementById("root").innerHTML =
          '<pre style="color:red;padding:16px;font-size:12px;white-space:pre-wrap">' + String(err) + "</pre>";
      }
    })();
  </script>
</body>
</html>`;
};

const buildStyles = (dark: boolean): string => `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        ${dark ? "#0d1117" : "#f4f1eb"};
  --surface:   ${dark ? "#161b22" : "#ffffff"};
  --surface2:  ${dark ? "#1f2637" : "#ede9e0"};
  --border:    ${dark ? "#2a3040" : "#ddd8ce"};
  --accent:    ${dark ? "#c9a86c" : "#7c4f2a"};
  --accent2:   ${dark ? "#e0c080" : "#a0642e"};
  --accentBg:  ${dark ? "rgba(201,168,108,0.12)" : "rgba(124,79,42,0.07)"};
  --text:      ${dark ? "#e6e1d6" : "#1e1208"};
  --text2:     ${dark ? "#9a9080" : "#7a6555"};
  --text3:     ${dark ? "#50484a" : "#b5a898"};
  --pin:       ${dark ? "#f0a830" : "#d08010"};
  --danger:    ${dark ? "#e05858" : "#c0392b"};
  --dangerBg:  ${dark ? "rgba(224,88,88,0.12)" : "#fff0f0"};
  --jsx-badge: ${dark ? "#2563eb" : "#1d4ed8"};
  --code-bg:   ${dark ? "#0d1117" : "#1e1e2e"};
  --radius:    14px;
  --shadow:    ${dark ? "0 4px 32px rgba(0,0,0,0.6)" : "0 4px 24px rgba(80,50,20,0.12)"};
  --font:      'DM Sans', 'Segoe UI', system-ui, sans-serif;
  --serif:     Georgia, 'Times New Roman', serif;
  --mono:      'Fira Code', 'Consolas', 'Courier New', monospace;
  --ease:      cubic-bezier(0.4,0,0.2,1);
}

html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

.app-shell { display: flex; height: 100vh; overflow: hidden; }

.sidebar {
  width: 224px; flex-shrink: 0; background: var(--surface);
  border-right: 1px solid var(--border); display: flex; flex-direction: column;
  overflow-y: auto; transition: transform 0.25s var(--ease); z-index: 100;
}
.sidebar-logo { padding: 22px 18px 14px; border-bottom: 1px solid var(--border); }
.sidebar-logo h1 { font-family: var(--serif); font-size: 17px; font-weight: 600; color: var(--accent); letter-spacing: -0.3px; }
.sidebar-logo p { font-size: 11px; color: var(--text3); margin-top: 3px; }
.sidebar-section { padding: 14px 18px 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text3); }
.sidebar-item {
  display: flex; align-items: center; gap: 9px; padding: 9px 18px; width: 100%;
  border: none; background: none; text-align: left; cursor: pointer;
  font-size: 13px; font-weight: 400; color: var(--text2);
  transition: background 0.15s, color 0.15s; font-family: var(--font);
}
.sidebar-item:hover { background: var(--surface2); color: var(--text); }
.sidebar-item.active { background: var(--accent); color: #fff; font-weight: 600; }
.sidebar-item .badge { margin-left: auto; font-size: 10px; background: var(--surface2); border-radius: 99px; padding: 1px 7px; color: var(--text3); }
.sidebar-item.active .badge { background: rgba(255,255,255,0.22); color: #fff; }
.sidebar-bottom { margin-top: auto; padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 5px; }

.main-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

.topbar { padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
.topbar-title { font-size: 14px; font-weight: 600; white-space: nowrap; }
.search-wrap { flex: 1; position: relative; max-width: 380px; }
.search-wrap input {
  width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 99px;
  padding: 7px 13px 7px 34px; font-size: 13px; color: var(--text); outline: none;
  font-family: var(--font); transition: border-color 0.15s;
}
.search-wrap input:focus { border-color: var(--accent); }
.search-wrap input::placeholder { color: var(--text3); }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text3); pointer-events: none; font-size: 14px; }

.sort-bar { padding: 7px 14px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
.sort-bar select { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 4px 9px; font-size: 12px; color: var(--text); outline: none; cursor: pointer; font-family: var(--font); }
.count-label { font-size: 11.5px; color: var(--text3); margin-left: auto; }

.notes-grid { flex: 1; overflow-y: auto; padding: 14px; display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; align-content: start; }
.empty-state { grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text3); }
.empty-state .ei { font-size: 48px; opacity: 0.45; margin-bottom: 12px; }
.empty-state h3 { font-family: var(--serif); font-size: 17px; margin-bottom: 5px; color: var(--text2); }
.empty-state p { font-size: 12.5px; }

.note-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 15px; cursor: pointer;
  transition: box-shadow 0.2s var(--ease), transform 0.2s var(--ease), border-color 0.2s;
  position: relative; animation: fadeUp 0.22s ease forwards;
}
.note-card:hover { box-shadow: var(--shadow); border-color: var(--accent2); transform: translateY(-2px); }
.note-card.pinned { border-left: 3px solid var(--pin); }
.note-card.jsx-card { border-top: 2px solid var(--jsx-badge); }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.card-top { display: flex; align-items: flex-start; gap: 7px; margin-bottom: 7px; }
.card-title { flex: 1; font-family: var(--serif); font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.35; word-break: break-word; }
.pin-dot { color: var(--pin); font-size: 13px; flex-shrink: 0; }

.type-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; border-radius: 99px; padding: 2px 8px; margin-bottom: 6px; }
.type-badge.jsx { background: var(--jsx-badge); color: #fff; }
.type-badge.text { background: var(--surface2); color: var(--text2); }

.card-category { display: inline-block; font-size: 10px; font-weight: 500; background: var(--accentBg); color: var(--accent); border-radius: 99px; padding: 2px 8px; margin-bottom: 7px; margin-left: 5px; }

.jsx-thumb { width: 100%; height: 130px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); background: #fff; margin-bottom: 10px; pointer-events: none; flex-shrink: 0; }
.jsx-thumb iframe { width: 200%; height: 200%; transform: scale(0.5); transform-origin: top left; border: none; background: #fff; }

.card-preview { font-size: 12px; color: var(--text2); line-height: 1.55; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; margin-bottom: 9px; }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 9px; }
.tag { font-size: 10px; background: var(--surface2); color: var(--text3); border: 1px solid var(--border); border-radius: 99px; padding: 2px 7px; }
.card-footer { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: var(--text3); }
.card-actions { display: flex; gap: 3px; opacity: 0; transition: opacity 0.15s; }
.note-card:hover .card-actions { opacity: 1; }

.btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 15px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s, transform 0.1s; border: none; font-family: var(--font); }
.btn:active { transform: scale(0.96); }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent2); }
.btn-ghost { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { opacity: 0.88; }
.btn-sm { padding: 5px 10px; font-size: 11.5px; border-radius: 8px; }
.btn-full { width: 100%; justify-content: center; }
.btn-icon { background: none; border: none; cursor: pointer; color: var(--text3); padding: 4px 6px; border-radius: 7px; font-size: 14px; transition: background 0.15s, color 0.15s; font-family: var(--font); }
.btn-icon:hover { background: var(--surface2); color: var(--text); }
.btn-icon.danger:hover { background: var(--dangerBg); color: var(--danger); }
.btn-icon.pinned { color: var(--pin); }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 12px; animation: fadeIn 0.15s ease; }
.signin-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(6px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 12px; animation: fadeIn 0.15s ease; }
.signin-overlay-inner { position: relative; }
.signin-close { position: absolute; top: -14px; right: -14px; z-index: 10; width: 32px; height: 32px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); color: var(--text2); font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.25); transition: background 0.15s, color 0.15s; }
.signin-close:hover { background: var(--danger); color: #fff; border-color: var(--danger); }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 28px 80px rgba(0,0,0,0.35); width: 100%; max-width: 660px; max-height: 92vh; display: flex; flex-direction: column; animation: slideUp 0.2s ease; }
@keyframes slideUp { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-wide { max-width: 900px; }

.modal-header { padding: 18px 22px 0; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.modal-header h2 { font-family: var(--serif); font-size: 19px; font-weight: 600; }
.modal-tabs { display: flex; gap: 4px; padding: 10px 22px 0; flex-shrink: 0; border-bottom: 1px solid var(--border); }
.modal-tab { padding: 7px 14px; border-radius: 8px 8px 0 0; font-size: 12.5px; font-weight: 500; cursor: pointer; border: 1px solid transparent; border-bottom: none; background: none; color: var(--text2); font-family: var(--font); transition: background 0.15s, color 0.15s; margin-bottom: -1px; }
.modal-tab.active { background: var(--surface); border-color: var(--border); color: var(--text); font-weight: 600; }
.modal-body { padding: 16px 22px; overflow-y: auto; flex: 1; min-height: 0; }
.modal-footer { padding: 12px 22px 18px; border-top: 1px solid var(--border); display: flex; gap: 7px; justify-content: flex-end; flex-shrink: 0; }

.form-row { margin-bottom: 13px; }
.form-label { display: block; font-size: 11px; font-weight: 600; color: var(--text2); margin-bottom: 5px; letter-spacing: 0.4px; text-transform: uppercase; }
.form-input, .form-select, .form-textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; font-size: 13.5px; color: var(--text); outline: none; font-family: var(--font); transition: border-color 0.15s; }
.form-textarea { min-height: 160px; resize: vertical; line-height: 1.6; }
.form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--accent); }

.code-textarea { width: 100%; min-height: 340px; background: var(--code-bg); color: #cdd6f4; border: 1px solid #313244; border-radius: 10px; padding: 14px; font-size: 12px; line-height: 1.65; font-family: var(--mono); outline: none; resize: vertical; tab-size: 2; }
.code-textarea:focus { border-color: #89b4fa; }
.counter-row { display: flex; gap: 10px; font-size: 11px; color: var(--text3); margin-top: 4px; }

.preview-frame { width: 100%; border-radius: 10px; border: 1px solid var(--border); overflow: hidden; background: #fff; }
.preview-toolbar { display: flex; align-items: center; gap: 7px; padding: 8px 12px; background: var(--surface2); border-bottom: 1px solid var(--border); border-radius: 10px 10px 0 0; }
.preview-toolbar-dot { width: 10px; height: 10px; border-radius: 50%; }
.preview-iframe { width: 100%; height: 540px; border: none; display: block; background: #fff; }
.preview-loading { height: 540px; display: flex; align-items: center; justify-content: center; color: var(--text3); font-size: 13px; gap: 8px; flex-direction: column; }
.spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.reading-content { font-family: var(--serif); font-size: 15px; line-height: 1.85; color: var(--text); white-space: pre-wrap; word-break: break-word; }
.reading-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 16px; font-size: 11.5px; color: var(--text3); }
.reading-cat { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--accent); }

.confirm-modal { max-width: 360px; text-align: center; }
.confirm-modal .modal-body { padding-top: 14px; }
.ci { font-size: 42px; margin-bottom: 8px; }
.confirm-modal h3 { font-family: var(--serif); font-size: 17px; margin-bottom: 5px; }
.confirm-modal p { font-size: 12.5px; color: var(--text2); }

.toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--text); color: var(--bg); padding: 9px 20px; border-radius: 99px; font-size: 12.5px; font-weight: 500; z-index: 999; white-space: nowrap; box-shadow: 0 4px 20px rgba(0,0,0,0.3); animation: tin 0.22s ease, tout 0.3s ease 2.1s forwards; }
@keyframes tin  { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
@keyframes tout { to   { opacity:0; transform: translateX(-50%) translateY(10px); } }

.fab { display: none; position: fixed; bottom: 22px; right: 18px; width: 50px; height: 50px; border-radius: 50%; background: var(--accent); color: #fff; border: none; font-size: 22px; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.28); align-items: center; justify-content: center; z-index: 50; transition: background 0.15s, transform 0.12s; }
.fab:active { transform: scale(0.92); }
.fab:hover { background: var(--accent2); }

.hamburger { display: none; background: none; border: none; cursor: pointer; color: var(--text); font-size: 19px; padding: 4px 6px; border-radius: 8px; }
.hamburger:hover { background: var(--surface2); }

.sidebar-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 99; }

.type-selector { display: flex; gap: 8px; }
.type-option { flex: 1; padding: 10px; border-radius: 10px; border: 2px solid var(--border); background: var(--surface2); cursor: pointer; text-align: center; transition: border-color 0.15s, background 0.15s; font-family: var(--font); }
.type-option.selected-text { border-color: var(--accent); background: var(--accentBg); }
.type-option.selected-jsx  { border-color: var(--jsx-badge); background: rgba(37,99,235,0.08); }
.type-option .to-icon { font-size: 22px; margin-bottom: 4px; }
.type-option .to-label { font-size: 12px; font-weight: 600; color: var(--text2); }
.type-option.selected-text .to-label { color: var(--accent); }
.type-option.selected-jsx  .to-label { color: var(--jsx-badge); }

.sign-in-prompt { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--accentBg); border: 1px solid var(--accent); border-radius: 10px; font-size: 12px; color: var(--accent); }
.sign-in-prompt button { background: var(--accent); color: #fff; border: none; border-radius: 7px; padding: 4px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font); }
.sign-in-prompt button:hover { background: var(--accent2); }

.role-badge { font-size: 9.5px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; border-radius: 99px; padding: 2px 8px; flex-shrink: 0; }
.role-badge.admin { background: #dc2626; color: #fff; }
.role-badge.editor { background: var(--accent); color: #fff; }
.role-badge.viewer { background: var(--surface2); color: var(--text3); border: 1px solid var(--border); }

.admin-stats { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.admin-stat { display: flex; flex-direction: column; align-items: center; padding: 10px 18px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--border); min-width: 72px; }
.admin-stat-num { font-size: 22px; font-weight: 700; line-height: 1; }
.admin-stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text3); margin-top: 3px; }
.admin-stat.stat-admin .admin-stat-num { color: #dc2626; }
.admin-stat.stat-editor .admin-stat-num { color: var(--accent); }
.admin-stat.stat-viewer .admin-stat-num { color: var(--text3); }

.admin-filters { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.admin-search { flex: 1; min-width: 160px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 7px 12px; font-size: 12.5px; color: var(--text); outline: none; font-family: var(--font); }
.admin-search:focus { border-color: var(--accent); }
.admin-pill { padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1.5px solid var(--border); background: none; color: var(--text2); font-family: var(--font); transition: background 0.12s, color 0.12s, border-color 0.12s; }
.admin-pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.admin-pill:not(.active):hover { border-color: var(--accent); color: var(--accent); }

.admin-user-list { display: flex; flex-direction: column; gap: 8px; }
.admin-user-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); transition: border-color 0.15s; }
.admin-user-row:hover { border-color: var(--accent); }
.admin-user-row.saving { opacity: 0.65; pointer-events: none; }
.admin-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; background: var(--surface2); flex-shrink: 0; }
.admin-user-info { flex: 1; min-width: 0; }
.admin-user-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.admin-user-email { font-size: 11px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.admin-role-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.admin-role-select { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 12px; color: var(--text); outline: none; font-family: var(--font); cursor: pointer; }
.admin-role-select:focus { border-color: var(--accent); }
.admin-apply-btn { padding: 6px 13px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: var(--accent); color: #fff; font-family: var(--font); transition: background 0.15s, opacity 0.15s; white-space: nowrap; }
.admin-apply-btn:hover { background: var(--accent2); }
.admin-apply-btn:disabled { opacity: 0.5; cursor: default; }
.admin-row-spinner { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--border); border-top-color: var(--accent); animation: spin 0.7s linear infinite; flex-shrink: 0; }
.admin-empty { text-align: center; color: var(--text3); padding: 36px 0; font-size: 13px; }

.admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.admin-table th { text-align: left; padding: 8px 12px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text3); border-bottom: 2px solid var(--border); }
.admin-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.admin-user { display: flex; align-items: center; gap: 8px; }
.admin-user-email-small { font-size: 11px; color: var(--text3); }

.readonly-banner { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 16px; background: var(--accentBg); border-bottom: 1px solid var(--border); font-size: 12.5px; color: var(--text2); flex-shrink: 0; }

@media (max-width: 768px) {
  .sidebar { position: fixed; top: 0; left: 0; height: 100%; transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); box-shadow: var(--shadow); }
  .sidebar-backdrop { display: block; }
  .hamburger { display: flex; align-items: center; }
  .fab { display: flex; }
  .desktop-add { display: none !important; }
  .notes-grid { grid-template-columns: 1fr; padding: 10px; gap: 10px; }
  .preview-iframe { height: 400px; }
  .modal-wide { max-width: 100%; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar { width: 190px; }
  .notes-grid { grid-template-columns: repeat(2, 1fr); }
}
`;

export default function App(): React.ReactElement {
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const queryClient = useQueryClient();

  const { data: me } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: clerkLoaded && !!isSignedIn,
      retry: false,
    },
  });

  const role: UserRole = (me?.role as UserRole) ?? "viewer";
  const canCreate = role === "admin" || role === "editor";
  const isAdmin = role === "admin";

  const { data: apiNotes = [], isLoading: notesLoading } = useListNotes();

  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const togglePinMutation = useToggleNotePin();

  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [activeCategory, setActiveCategory] = useState<string>("All Notes");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const [showSignIn, setShowSignIn] = useState<boolean>(false);
  const [editModal, setEditModal] = useState<EditModalData | null>(null);
  const [viewModal, setViewModal] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);

  useEffect(() => {
    if (isSignedIn) setShowSignIn(false);
  }, [isSignedIn]);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    const channel = supabase
      .channel("notes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        () => {
          queryClient.invalidateQueries({
            queryKey: getListNotesQueryKey(),
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const allCategories: string[] = [
    "All Notes",
    ...Array.from(
      new Set([
        ...DEFAULT_CATEGORIES.filter((c) => c !== "All Notes"),
        ...apiNotes.map((n) => n.category).filter((c): c is string => !!c),
      ])
    ),
  ];

  const catCount = (c: string): number =>
    c === "All Notes"
      ? apiNotes.length
      : apiNotes.filter((n) => n.category === c).length;

  const visible: Note[] = useMemo(() => {
    let list = [...apiNotes] as Note[];
    if (activeCategory !== "All Notes")
      list = list.filter((n) => n.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)) ||
          n.category.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortBy === "newest")
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === "oldest")
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return 0;
    });
    return list;
  }, [apiNotes, activeCategory, searchQuery, sortBy]);

  const showToast = useCallback((msg: string): void => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const toggleDark = (): void => setSettings((s) => ({ ...s, dark: !s.dark }));

  const openNew = (): void => {
    if (!canCreate) return;
    setEditModal({
      isNew: true,
      note: {
        type: "text",
        title: "",
        content: "",
        category:
          activeCategory === "All Notes" ? "Uncategorized" : activeCategory,
        tags: [],
        pinned: false,
      },
    });
  };

  const openEdit = (note: Note, e?: React.MouseEvent): void => {
    e?.stopPropagation();
    setEditModal({
      isNew: false,
      note: {
        id: note.id,
        type: note.type,
        title: note.title,
        content: note.content,
        category: note.category,
        tags: note.tags,
        pinned: note.pinned,
      },
    });
  };

  const saveNote = async (draft: NoteDraft): Promise<void> => {
    if (!editModal) return;
    try {
      if (editModal.isNew) {
        await createNoteMutation.mutateAsync({
          data: {
            type: draft.type,
            title: draft.title,
            content: draft.content,
            category: draft.category,
            tags: draft.tags,
            pinned: draft.pinned,
          },
        });
        showToast("Note created");
      } else {
        await updateNoteMutation.mutateAsync({
          id: draft.id!,
          data: {
            type: draft.type,
            title: draft.title,
            content: draft.content,
            category: draft.category,
            tags: draft.tags,
            pinned: draft.pinned,
          },
        });
        showToast("Note saved");
      }
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      setEditModal(null);
    } catch {
      showToast("Failed to save note");
    }
  };

  const handleDeleteNote = async (): Promise<void> => {
    if (deleteTarget === null) return;
    try {
      await deleteNoteMutation.mutateAsync({ id: deleteTarget });
      if (viewModal?.id === deleteTarget) setViewModal(null);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      showToast("Note deleted");
    } catch {
      showToast("Failed to delete note");
    }
  };

  const handleTogglePin = useCallback(
    async (
      id: number,
      e: React.MouseEvent | { stopPropagation: () => void }
    ): Promise<void> => {
      e.stopPropagation();
      if (!isAdmin) return;
      try {
        await togglePinMutation.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        setViewModal((n) => (n?.id === id ? { ...n, pinned: !n.pinned } : n));
      } catch {
        showToast("Failed to pin note");
      }
    },
    [isAdmin, togglePinMutation, queryClient, showToast]
  );

  const exportJSON = (): void => {
    const blob = new Blob([JSON.stringify(apiNotes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `study_notes_${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported as JSON");
  };

  const exportTXT = (): void => {
    const text = apiNotes
      .map(
        (n) =>
          `=== ${n.title} ===\nType: ${n.type}\nCategory: ${n.category}\nTags: ${n.tags.join(", ")}\nEdited: ${fmtDate(n.updatedAt)}\n\n${n.content}`
      )
      .join("\n\n" + "─".repeat(60) + "\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `study_notes_${new Date().toISOString().slice(0, 10)}.txt`,
    });
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported as TXT");
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!canCreate) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev: ProgressEvent<FileReader>) => {
      try {
        const raw = ev.target?.result as string;
        const imported = JSON.parse(raw) as Partial<Note>[];
        if (!Array.isArray(imported)) throw new Error("Not an array");
        let count = 0;
        for (const n of imported) {
          if (!n.title || !n.content) continue;
          await createNoteMutation.mutateAsync({
            data: {
              type: n.type ?? "text",
              title: n.title,
              content: n.content,
              category: n.category ?? "Uncategorized",
              tags: n.tags ?? [],
              pinned: n.pinned ?? false,
            },
          });
          count++;
        }
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        showToast(`Imported ${count} note(s)`);
      } catch {
        showToast("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: buildStyles(settings.dark) }} />

      <div className="app-shell">
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <h1>StudyNotes</h1>
            <p>
              {notesLoading
                ? "Loading…"
                : `${apiNotes.length} notes · ${apiNotes.filter((n) => n.type === "jsx").length} interactive`}
            </p>
          </div>

          <p className="sidebar-section">Categories</p>
          {allCategories.map((cat) => (
            <button
              key={cat}
              className={`sidebar-item ${activeCategory === cat ? "active" : ""}`}
              onClick={() => {
                setActiveCategory(cat);
                setSidebarOpen(false);
              }}
            >
              {cat}
              <span className="badge">{catCount(cat)}</span>
            </button>
          ))}

          <div className="sidebar-bottom">
            <button className="btn btn-ghost btn-sm btn-full" onClick={exportJSON}>
              Export JSON
            </button>
            <button className="btn btn-ghost btn-sm btn-full" onClick={exportTXT}>
              Export TXT
            </button>
            {canCreate && (
              <>
                <button
                  className="btn btn-ghost btn-sm btn-full"
                  onClick={() => fileRef.current?.click()}
                >
                  Import JSON
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={importJSON}
                />
              </>
            )}
            {isAdmin && (
              <button
                className="btn btn-ghost btn-sm btn-full"
                style={{ borderColor: "#dc2626", color: "#dc2626" }}
                onClick={() => setShowAdminPanel(true)}
              >
                ⚙ Admin Panel
              </button>
            )}
          </div>
        </aside>

        <main className="main-panel">
          <div className="topbar">
            <button
              className="hamburger"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              ☰
            </button>
            <span className="topbar-title">{activeCategory}</span>
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="search"
                placeholder="Search notes, tags…"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
              />
            </div>
            <button
              className="btn-icon"
              onClick={toggleDark}
              title="Toggle dark mode"
            >
              {settings.dark ? "☀️" : "🌙"}
            </button>

            {clerkLoaded && !isSignedIn && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowSignIn(true)}
              >
                Sign in
              </button>
            )}

            {clerkLoaded && isSignedIn && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {me?.role && (
                  <span className={`role-badge ${me.role}`}>{me.role}</span>
                )}
                <UserButton />
              </div>
            )}

            {canCreate && (
              <button
                className="btn btn-primary desktop-add"
                onClick={openNew}
              >
                + New Note
              </button>
            )}
          </div>

          {clerkLoaded && !isSignedIn && (
            <div className="readonly-banner">
              <span>📖 You are viewing in read-only mode.</span>
              <button
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                }}
                onClick={() => setShowSignIn(true)}
              >
                Sign in to contribute
              </button>
            </div>
          )}

          <div className="sort-bar">
            <span style={{ fontSize: 11.5, color: "var(--text3)" }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSortBy(e.target.value)
              }
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="alpha">A → Z</option>
              <option value="category">By category</option>
            </select>
            <span className="count-label">
              {notesLoading
                ? "Loading…"
                : `${visible.length} note${visible.length !== 1 ? "s" : ""} · ${visible.filter((n) => n.type === "jsx").length} interactive`}
            </span>
          </div>

          <div className="notes-grid">
            {notesLoading ? (
              <div className="empty-state">
                <div className="spinner" style={{ margin: "0 auto 12px" }} />
                <p>Loading notes…</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="empty-state">
                <div className="ei">📚</div>
                <h3>{searchQuery ? "No matching notes" : "No notes yet"}</h3>
                <p>
                  {searchQuery
                    ? "Try a different term."
                    : canCreate
                    ? 'Tap "+ New Note" to get started.'
                    : "Sign in to contribute notes."}
                </p>
              </div>
            ) : (
              visible.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  role={role}
                  currentUserId={user?.id}
                  onOpen={() => setViewModal(note)}
                  onEdit={(e) => openEdit(note, e)}
                  onDelete={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(note.id);
                  }}
                  onPin={(e) => handleTogglePin(note.id, e)}
                />
              ))
            )}
          </div>
        </main>
      </div>

      {canCreate && (
        <button className="fab" onClick={openNew} aria-label="New note">
          +
        </button>
      )}

      {editModal && (
        <EditModal
          data={editModal}
          categories={allCategories.filter((c) => c !== "All Notes")}
          onSave={saveNote}
          onClose={() => setEditModal(null)}
          isSaving={
            createNoteMutation.isPending || updateNoteMutation.isPending
          }
        />
      )}

      {viewModal && (
        <ViewModal
          note={viewModal}
          role={role}
          currentUserId={user?.id}
          onClose={() => setViewModal(null)}
          onEdit={() => {
            openEdit(viewModal);
            setViewModal(null);
          }}
          onDelete={() => {
            setDeleteTarget(viewModal.id);
            setViewModal(null);
          }}
          onPin={() => handleTogglePin(viewModal.id, { stopPropagation: () => {} })}
          showToast={showToast}
        />
      )}

      {deleteTarget !== null && (
        <ConfirmModal
          onConfirm={handleDeleteNote}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleteNoteMutation.isPending}
        />
      )}

      {showAdminPanel && isAdmin && (
        <AdminPanel
          onClose={() => setShowAdminPanel(false)}
          showToast={showToast}
        />
      )}

      {showSignIn && (
        <div className="signin-overlay">
          <div className="signin-overlay-inner">
            <button
              className="signin-close"
              onClick={() => setShowSignIn(false)}
              aria-label="Close sign in"
            >
              ×
            </button>
            <SignIn routing="hash" />
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

interface NoteCardProps {
  note: Note;
  role: UserRole;
  currentUserId?: string;
  onOpen: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onPin: (e: React.MouseEvent) => void;
}

function NoteCard({
  note,
  role,
  currentUserId,
  onOpen,
  onEdit,
  onDelete,
  onPin,
}: NoteCardProps): React.ReactElement {
  const isJSX = note.type === "jsx";
  const thumbHTML = isJSX ? buildIframeHTML(note.content) : null;
  const isOwner = currentUserId && note.createdByClerkId === currentUserId;
  const canEdit = role === "admin" || (role === "editor" && !!isOwner);
  const canDelete = role === "admin";
  const canPin = role === "admin";

  return (
    <article
      className={`note-card ${note.pinned ? "pinned" : ""} ${isJSX ? "jsx-card" : ""}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && onOpen()}
    >
      {isJSX && thumbHTML && (
        <div className="jsx-thumb">
          <iframe
            srcDoc={thumbHTML}
            sandbox="allow-scripts"
            title="preview-thumb"
            scrolling="no"
          />
        </div>
      )}

      <div className="card-top">
        <h3 className="card-title">{note.title || "Untitled"}</h3>
        {note.pinned && <span className="pin-dot">📌</span>}
      </div>

      <div>
        <span className={`type-badge ${isJSX ? "jsx" : "text"}`}>
          {isJSX ? "⚛ Interactive" : "📄 Text"}
        </span>
        <span className="card-category">{note.category}</span>
      </div>

      {isJSX ? (
        <p
          className="card-preview"
          style={{ fontFamily: "var(--mono)", fontSize: 11 }}
        >
          {note.content.slice(0, 120).replace(/\n/g, " ")}…
        </p>
      ) : (
        <p className="card-preview">{note.content}</p>
      )}

      {note.tags.length > 0 && (
        <div className="card-tags">
          {note.tags.slice(0, 4).map((t) => (
            <span key={t} className="tag">
              #{t}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="tag">+{note.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="card-footer">
        <span>{fmtDate(note.updatedAt)}</span>
        <div
          className="card-actions"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {canPin && (
            <button
              className={`btn-icon ${note.pinned ? "pinned" : ""}`}
              onClick={onPin}
              title="Pin"
            >
              📌
            </button>
          )}
          {canEdit && (
            <button className="btn-icon" onClick={onEdit} title="Edit">
              ✏️
            </button>
          )}
          {canDelete && (
            <button
              className="btn-icon danger"
              onClick={onDelete}
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

interface ViewModalProps {
  note: Note;
  role: UserRole;
  currentUserId?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  showToast: (msg: string) => void;
}

function ViewModal({
  note,
  role,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  onPin,
  showToast,
}: ViewModalProps): React.ReactElement {
  const isJSX = note.type === "jsx";
  const [tab, setTab] = useState<string>(isJSX ? "preview" : "read");
  const [loading, setLoading] = useState<boolean>(true);

  const iframeHTML = isJSX ? buildIframeHTML(note.content) : null;
  const isOwner = currentUserId && note.createdByClerkId === currentUserId;
  const canEdit = role === "admin" || (role === "editor" && !!isOwner);
  const canDelete = role === "admin";
  const canPin = role === "admin";

  const openFullView = (): void => {
    if (!iframeHTML) return;
    const win = window.open("", "_blank");
    if (!win) {
      showToast("Pop-up blocked — please allow pop-ups");
      return;
    }
    win.document.open();
    win.document.write(iframeHTML);
    win.document.close();
  };

  const copySource = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(note.content);
      showToast("JSX source copied");
    } catch {
      showToast("Copy failed — try manually selecting the source");
    }
  };

  const wc = wordCount(note.content);

  const statsRows: [string, string | number][] = [
    ["📝 Words", wc],
    ["🔤 Characters", note.content.length],
    ["📋 Chars (no spaces)", note.content.replace(/\s/g, "").length],
    ["📄 Lines", note.content.split("\n").length],
    ["🏷 Tags", note.tags.length],
    ["📁 Category", note.category],
    ["📅 Created", fmtDate(note.createdAt)],
    ["✏️ Last edited", fmtDate(note.updatedAt)],
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className={`modal ${isJSX ? "modal-wide" : ""}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ paddingRight: 10 }}>{note.title || "Untitled"}</h2>
          <button className="btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-tabs">
          {isJSX ? (
            <>
              <button
                className={`modal-tab ${tab === "preview" ? "active" : ""}`}
                onClick={() => setTab("preview")}
              >
                ⚛ Preview
              </button>
              <button
                className={`modal-tab ${tab === "source" ? "active" : ""}`}
                onClick={() => setTab("source")}
              >
                {"</>"} Source
              </button>
            </>
          ) : (
            <>
              <button
                className={`modal-tab ${tab === "read" ? "active" : ""}`}
                onClick={() => setTab("read")}
              >
                📖 Read
              </button>
              <button
                className={`modal-tab ${tab === "stats" ? "active" : ""}`}
                onClick={() => setTab("stats")}
              >
                📊 Stats
              </button>
            </>
          )}
        </div>

        <div className="modal-body">
          {isJSX && tab === "preview" && (
            <div className="preview-frame">
              <div className="preview-toolbar">
                <div
                  className="preview-toolbar-dot"
                  style={{ background: "#ff5f57" }}
                />
                <div
                  className="preview-toolbar-dot"
                  style={{ background: "#febc2e" }}
                />
                <div
                  className="preview-toolbar-dot"
                  style={{ background: "#28c840" }}
                />
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    color: "var(--text3)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  Live Preview — {note.title}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={openFullView}
                >
                  ↗ Full View
                </button>
              </div>
              {loading && (
                <div className="preview-loading">
                  <div className="spinner" />
                  <span>Rendering component…</span>
                </div>
              )}
              <iframe
                srcDoc={iframeHTML ?? undefined}
                sandbox="allow-scripts"
                className="preview-iframe"
                style={{ display: loading ? "none" : "block" }}
                onLoad={() => setLoading(false)}
                title={note.title}
              />
            </div>
          )}

          {isJSX && tab === "source" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    color: "var(--text3)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  {note.content.split("\n").length} lines · {note.content.length}{" "}
                  chars
                </span>
                <button className="btn btn-ghost btn-sm" onClick={copySource}>
                  📋 Copy JSX
                </button>
              </div>
              <pre
                style={{
                  background: "var(--code-bg)",
                  color: "#cdd6f4",
                  borderRadius: 10,
                  padding: "14px",
                  fontSize: 11.5,
                  fontFamily: "var(--mono)",
                  lineHeight: 1.65,
                  overflowX: "auto",
                  overflowY: "auto",
                  maxHeight: 480,
                  whiteSpace: "pre",
                  border: "1px solid #313244",
                }}
              >
                {note.content}
              </pre>
            </div>
          )}

          {!isJSX && tab === "read" && (
            <>
              <div className="reading-meta">
                <span className="reading-cat">{note.category}</span>
                {note.pinned && <span>📌 Pinned</span>}
                <span>Edited {fmtDate(note.updatedAt)}</span>
              </div>
              {note.tags.length > 0 && (
                <div className="card-tags" style={{ marginBottom: 14 }}>
                  {note.tags.map((t) => (
                    <span key={t} className="tag">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <div className="reading-content">{note.content}</div>
            </>
          )}

          {!isJSX && tab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {statsRows.map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "var(--surface2)",
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "var(--text2)" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {canPin && (
            <button className="btn btn-ghost btn-sm" onClick={onPin}>
              📌 {note.pinned ? "Unpin" : "Pin"}
            </button>
          )}
          {canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>
              ✏️ Edit
            </button>
          )}
          {canDelete && (
            <button className="btn btn-danger btn-sm" onClick={onDelete}>
              🗑️ Delete
            </button>
          )}
          {!canEdit && !canDelete && (
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              Read-only
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  data: EditModalData;
  categories: string[];
  onSave: (note: NoteDraft) => void;
  onClose: () => void;
  isSaving: boolean;
}

function EditModal({
  data,
  categories,
  onSave,
  onClose,
  isSaving,
}: EditModalProps): React.ReactElement {
  const [note, setNote] = useState<NoteDraft>(data.note);
  const [tagInput, setTagInput] = useState<string>("");
  const [editorTab, setEditorTab] = useState<string>("editor");
  const [previewLoading, setPreviewLoading] = useState<boolean>(true);
  const [previewKey, setPreviewKey] = useState<number>(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof NoteDraft>(field: K, val: NoteDraft[K]): void =>
    setNote((n) => ({ ...n, [field]: val }));

  const handleContentChange = (val: string): void => {
    set("content", val);
    if (note.type === "jsx") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setPreviewLoading(true);
        setPreviewKey((k) => k + 1);
      }, 800);
    }
  };

  const addTag = (): void => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !note.tags.includes(t)) {
      set("tags", [...note.tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string): void =>
    set("tags", note.tags.filter((t) => t !== tag));

  const isJSX = note.type === "jsx";
  const iframeHTML = isJSX ? buildIframeHTML(note.content) : null;
  const wc = wordCount(note.content);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className={`modal ${isJSX ? "modal-wide" : ""}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{data.isNew ? "New Note" : "Edit Note"}</h2>
          <button className="btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        {isJSX && (
          <div className="modal-tabs">
            <button
              className={`modal-tab ${editorTab === "editor" ? "active" : ""}`}
              onClick={() => setEditorTab("editor")}
            >
              ✏️ Editor
            </button>
            <button
              className={`modal-tab ${editorTab === "preview" ? "active" : ""}`}
              onClick={() => {
                setEditorTab("preview");
                setPreviewLoading(true);
                setPreviewKey((k) => k + 1);
              }}
            >
              ⚛ Preview
            </button>
          </div>
        )}

        <div className="modal-body">
          {(!isJSX || editorTab === "editor") && (
            <>
              {data.isNew && (
                <div className="form-row">
                  <label className="form-label">Note Type</label>
                  <div className="type-selector">
                    <div
                      className={`type-option ${note.type === "text" ? "selected-text" : ""}`}
                      onClick={() => set("type", "text")}
                    >
                      <div className="to-icon">📄</div>
                      <div className="to-label">Text Note</div>
                    </div>
                    <div
                      className={`type-option ${note.type === "jsx" ? "selected-jsx" : ""}`}
                      onClick={() => set("type", "jsx")}
                    >
                      <div className="to-icon">⚛</div>
                      <div className="to-label">JSX Component</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-row">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Note title…"
                  autoFocus
                  value={note.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    set("title", e.target.value)
                  }
                />
              </div>

              <div className="form-row">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={note.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    set("category", e.target.value)
                  }
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">
                  {isJSX ? "JSX Source Code" : "Content"}
                </label>
                {isJSX ? (
                  <>
                    <textarea
                      className="code-textarea"
                      placeholder={
                        "Paste your full JSX component here.\n" +
                        "Must include: export default function YourComponent() { ... }"
                      }
                      value={note.content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        handleContentChange(e.target.value)
                      }
                      spellCheck={false}
                    />
                    <div className="counter-row">
                      <span>{note.content.split("\n").length} lines</span>
                      <span>{note.content.length} chars</span>
                    </div>
                  </>
                ) : (
                  <>
                    <textarea
                      className="form-textarea"
                      placeholder="Write your notes here…"
                      value={note.content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        handleContentChange(e.target.value)
                      }
                    />
                    <div className="counter-row">
                      <span>{wc} words</span>
                      <span>{note.content.length} chars</span>
                    </div>
                  </>
                )}
              </div>

              <div className="form-row">
                <label className="form-label">Tags</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Add tag, press Enter…"
                    value={tagInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTagInput(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    style={{ borderRadius: 10 }}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={addTag}>
                    Add
                  </button>
                </div>
                {note.tags.length > 0 && (
                  <div className="card-tags" style={{ marginTop: 7 }}>
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        className="tag"
                        style={{ cursor: "pointer" }}
                        onClick={() => removeTag(t)}
                      >
                        #{t} ✕
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <input
                  type="checkbox"
                  id="pin-toggle"
                  checked={!!note.pinned}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    set("pinned", e.target.checked)
                  }
                  style={{ accentColor: "var(--pin)", width: 15, height: 15 }}
                />
                <label
                  htmlFor="pin-toggle"
                  style={{ fontSize: 13, cursor: "pointer" }}
                >
                  📌 Pin this note
                </label>
              </div>
            </>
          )}

          {isJSX && editorTab === "preview" && (
            <div className="preview-frame">
              <div className="preview-toolbar">
                <div
                  className="preview-toolbar-dot"
                  style={{ background: "#ff5f57" }}
                />
                <div
                  className="preview-toolbar-dot"
                  style={{ background: "#febc2e" }}
                />
                <div
                  className="preview-toolbar-dot"
                  style={{ background: "#28c840" }}
                />
                <span
                  style={{ marginLeft: 6, fontSize: 11, color: "var(--text3)" }}
                >
                  Live Preview
                </span>
              </div>
              {previewLoading && (
                <div className="preview-loading">
                  <div className="spinner" />
                  <span>Rendering…</span>
                </div>
              )}
              <iframe
                key={previewKey}
                srcDoc={iframeHTML ?? undefined}
                sandbox="allow-scripts"
                className="preview-iframe"
                style={{ display: previewLoading ? "none" : "block" }}
                onLoad={() => setPreviewLoading(false)}
                title="editor-preview"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(note)}
            disabled={isSaving || (!note.title.trim() && !note.content.trim())}
          >
            {isSaving
              ? "Saving…"
              : data.isNew
              ? "Create Note"
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function ConfirmModal({
  onConfirm,
  onCancel,
  isDeleting,
}: ConfirmModalProps): React.ReactElement {
  return (
    <div className="overlay" onClick={onCancel}>
      <div
        className="modal confirm-modal"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="modal-body">
          <div className="ci">🗑️</div>
          <h3>Delete this note?</h3>
          <p>This action cannot be undone.</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AdminPanelProps {
  onClose: () => void;
  showToast: (msg: string) => void;
}

type AdminUser = {
  clerkUserId: string;
  name?: string | null;
  email: string;
  imageUrl?: string | null;
  role: "admin" | "editor" | "viewer";
};

function AdminPanel({ onClose, showToast }: AdminPanelProps): React.ReactElement {
  const queryClient = useQueryClient();
  const { data: rawUsers = [], isLoading, refetch, isFetching } = useListUsers();
  const updateRole = useUpdateUserRole();

  const users = rawUsers as AdminUser[];

  const [pendingRoles, setPendingRoles] = useState<Record<string, "admin" | "editor" | "viewer">>({});
  const [savingUsers, setSavingUsers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "editor" | "viewer">("all");

  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const editorCount = users.filter((u) => u.role === "editor").length;
  const viewerCount = users.filter((u) => u.role === "viewer").length;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getDisplayRole = (u: AdminUser): "admin" | "editor" | "viewer" =>
    pendingRoles[u.clerkUserId] ?? u.role;

  const hasPending = (u: AdminUser): boolean =>
    pendingRoles[u.clerkUserId] !== undefined &&
    pendingRoles[u.clerkUserId] !== u.role;

  const handleApply = async (u: AdminUser): Promise<void> => {
    const newRole = pendingRoles[u.clerkUserId] ?? u.role;
    setSavingUsers((prev) => new Set(prev).add(u.clerkUserId));
    try {
      await updateRole.mutateAsync({ clerkUserId: u.clerkUserId, data: { role: newRole } });
      await queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[u.clerkUserId];
        return next;
      });
      showToast(`Role updated to ${newRole}`);
    } catch {
      showToast("Failed to update role");
    } finally {
      setSavingUsers((prev) => {
        const next = new Set(prev);
        next.delete(u.clerkUserId);
        return next;
      });
    }
  };

  const ROLE_PILLS: Array<{ label: string; value: "all" | "admin" | "editor" | "viewer" }> = [
    { label: "All", value: "all" },
    { label: "Admin", value: "admin" },
    { label: "Editor", value: "editor" },
    { label: "Viewer", value: "viewer" },
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 780 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>⚙ User Management</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh user list"
            >
              {isFetching ? "↻ Refreshing…" : "↻ Refresh"}
            </button>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
              <div className="spinner" />
            </div>
          ) : (
            <>
              <div className="admin-stats">
                <div className="admin-stat">
                  <span className="admin-stat-num" style={{ color: "var(--text)" }}>{totalCount}</span>
                  <span className="admin-stat-label">Total</span>
                </div>
                <div className="admin-stat stat-admin">
                  <span className="admin-stat-num">{adminCount}</span>
                  <span className="admin-stat-label">Admin</span>
                </div>
                <div className="admin-stat stat-editor">
                  <span className="admin-stat-num">{editorCount}</span>
                  <span className="admin-stat-label">Editor</span>
                </div>
                <div className="admin-stat stat-viewer">
                  <span className="admin-stat-num">{viewerCount}</span>
                  <span className="admin-stat-label">Viewer</span>
                </div>
              </div>

              <div className="admin-filters">
                <input
                  className="admin-search"
                  type="search"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                />
                {ROLE_PILLS.map((p) => (
                  <button
                    key={p.value}
                    className={`admin-pill ${roleFilter === p.value ? "active" : ""}`}
                    onClick={() => setRoleFilter(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="admin-empty">
                  {users.length === 0
                    ? "No users have signed in yet."
                    : "No users match your search."}
                </div>
              ) : (
                <div className="admin-user-list">
                  {filtered.map((u) => {
                    const isSaving = savingUsers.has(u.clerkUserId);
                    const displayRole = getDisplayRole(u);
                    const changed = hasPending(u);
                    return (
                      <div
                        key={u.clerkUserId}
                        className={`admin-user-row ${isSaving ? "saving" : ""}`}
                      >
                        {u.imageUrl ? (
                          <img src={u.imageUrl} alt="" className="admin-avatar" />
                        ) : (
                          <div
                            className="admin-avatar"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 16,
                              color: "var(--text3)",
                            }}
                          >
                            👤
                          </div>
                        )}

                        <div className="admin-user-info">
                          <div className="admin-user-name">{u.name || "(no name)"}</div>
                          <div className="admin-user-email">{u.email || "(no email)"}</div>
                        </div>

                        <span className={`role-badge ${u.role}`}>{u.role}</span>

                        <div className="admin-role-controls">
                          {isSaving ? (
                            <div className="admin-row-spinner" />
                          ) : (
                            <>
                              <select
                                className="admin-role-select"
                                value={displayRole}
                                onChange={(e) =>
                                  setPendingRoles((prev) => ({
                                    ...prev,
                                    [u.clerkUserId]: e.target.value as "admin" | "editor" | "viewer",
                                  }))
                                }
                              >
                                <option value="viewer">viewer</option>
                                <option value="editor">editor</option>
                                <option value="admin">admin</option>
                              </select>
                              {changed && (
                                <button
                                  className="admin-apply-btn"
                                  onClick={() => handleApply(u)}
                                >
                                  Apply
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
