import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, X, Command, Power, Trash2, ArrowRight, Play } from "lucide-react";
import { Theme, AppConfig, Macro, MacroStep } from "../lib/types";

interface MacrosProps {
  theme: Theme;
  config: AppConfig;
  updateConfig: (section: string | null, key: string, value: unknown) => void;
}

export default function Macros({ theme, config, updateConfig }: MacrosProps) {
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);

  const runMacro = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke("run_macro", { id });
    } catch (err) {
      alert(String(err));
    }
  };

  const handleSave = () => {
    if (!editingMacro) return;
    const newMacros = [...config.macros];
    const idx = newMacros.findIndex((m) => m.id === editingMacro.id);
    if (idx >= 0) newMacros[idx] = editingMacro;
    else newMacros.push(editingMacro);
    updateConfig(null, "macros", newMacros);
    setEditingMacro(null);
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Macro Engine</h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center justify-between w-48">
                <span className="text-gray-300 font-medium text-xs">
                  {config.macrosEnabled ? "Macros Active" : "Macros Disabled"}
                </span>
                <div
                  onClick={() => updateConfig(null, "macrosEnabled", !config.macrosEnabled)}
                  className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                    config.macrosEnabled ? theme.primary : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${
                      config.macrosEnabled ? "left-5" : "left-1"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
          {!editingMacro && (
            <button
              onClick={() =>
                setEditingMacro({
                  id: `m_${Date.now()}`,
                  name: "New Macro",
                  steps: [{ type: "press", key: "A", ms: 100 }],
                })
              }
              className={`${theme.primary} hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50`}
              disabled={!config.macrosEnabled}
            >
              <Plus size={16} /> New Macro
            </button>
          )}
        </div>

        {!config.macrosEnabled ? (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
            <Power size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-500">Macro Engine is disabled globally.</p>
          </div>
        ) : !editingMacro ? (
          <>
            {config.macros.length === 0 && (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
                <Command size={48} className={`mx-auto mb-4 ${theme.text} opacity-50`} />
                <p className="text-gray-500">No macros defined.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.macros.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#15171c] p-5 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                  onClick={() => setEditingMacro({ ...m })}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center ${theme.text}`}>
                      <Command size={20} />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => runMacro(m.id, e)}
                        title="Run macro now"
                        className="p-2 hover:bg-green-500/15 rounded text-gray-400 hover:text-green-400"
                      >
                        <Play size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateConfig(
                            null,
                            "macros",
                            config.macros.filter((x) => x.id !== m.id),
                          );
                        }}
                        className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold text-white mb-1">{m.name}</h4>
                  <div className="text-xs text-gray-500 font-mono">
                    {m.steps.length} Steps
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <MacroEditor
            theme={theme}
            macro={editingMacro}
            onChange={setEditingMacro}
            onSave={handleSave}
            onBack={() => setEditingMacro(null)}
          />
        )}
      </div>
    </div>
  );
}

function MacroEditor({
  theme, macro, onChange, onSave, onBack,
}: {
  theme: Theme; macro: Macro;
  onChange: (m: Macro) => void; onSave: () => void; onBack: () => void;
}) {
  const updateStep = (i: number, field: string, value: unknown) => {
    const steps = [...macro.steps];
    const step = steps[i];
    if (field === "type") step.type = value as "press" | "wait";
    else if (field === "key") step.key = value as string;
    else if (field === "ms") step.ms = value as number;
    onChange({ ...macro, steps });
  };
  const removeStep = (i: number) => onChange({ ...macro, steps: macro.steps.filter((_, idx) => idx !== i) });
  const addStep = () => onChange({ ...macro, steps: [...macro.steps, { type: "press", key: "A", ms: 100 }] });

  return (
    <div className="max-w-4xl mx-auto bg-[#15171c] border border-white/5 rounded-2xl flex flex-col h-[600px] overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1d23]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full">
            <ArrowRight size={20} className="rotate-180" />
          </button>
          <input
            type="text"
            value={macro.name}
            onChange={(e) => onChange({ ...macro, name: e.target.value })}
            className="bg-transparent text-xl font-bold text-white outline-none"
          />
        </div>
        <button onClick={onSave} className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold">
          Save
        </button>
      </div>
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="space-y-3">
          {macro.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-4 bg-black/30 p-3 rounded-lg border border-white/5">
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono text-gray-500">
                {i + 1}
              </div>
              <select
                value={step.type}
                onChange={(e) => updateStep(i, "type", e.target.value)}
                className="bg-[#0b0c10] text-white text-xs rounded px-2 py-1.5 border border-white/10 outline-none uppercase font-bold tracking-wider"
              >
                <option value="press">Action: Press</option>
                <option value="wait">Action: Delay</option>
              </select>
              {step.type === "press" ? (
                <input
                  type="text"
                  value={step.key || ""}
                  onChange={(e) => updateStep(i, "key", e.target.value)}
                  className="bg-[#0b0c10] text-white font-mono text-sm rounded px-3 py-1.5 border border-white/10 w-24 text-center outline-none"
                />
              ) : (
                <input
                  type="number"
                  value={step.ms || 0}
                  onChange={(e) => updateStep(i, "ms", parseInt(e.target.value))}
                  className="bg-[#0b0c10] text-blue-400 font-mono text-sm rounded px-3 py-1.5 border border-white/10 w-24 text-center outline-none"
                />
              )}
              <button onClick={() => removeStep(i)} className="ml-auto text-gray-600 hover:text-red-400 p-2">
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={addStep}
            className="w-full py-3 border border-dashed border-gray-700 text-gray-500 rounded-lg hover:text-white hover:border-gray-500 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Add Next Step
          </button>
        </div>
      </div>
    </div>
  );
}
