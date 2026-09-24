import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, X, Command, Power, Trash2, ArrowLeft, Play } from "lucide-react";
import { Theme, AppConfig, Macro } from "../lib/types";
import { Btn, Chip, IconBtn, Overline, Switch } from "./ui";
import { onColor } from "../lib/color";

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
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-normal text-on-surface">Macros</h2>
          <div className="flex items-center gap-3 mt-2">
            <Switch
              checked={config.macrosEnabled}
              onChange={(v) => updateConfig(null, "macrosEnabled", v)}
              label="Enable macros"
            />
            <span className="text-sm text-on-surface-variant">
              {config.macrosEnabled ? "Macro engine active" : "Macro engine disabled"}
            </span>
          </div>
        </div>
        {!editingMacro && (
          // Extended FAB — Material 3
          <button
            onClick={() =>
              setEditingMacro({
                id: `m_${Date.now()}`,
                name: "New Macro",
                steps: [{ type: "press", key: "A", ms: 100 }],
              })
            }
            className="flex items-center gap-2 h-14 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:pointer-events-none"
            style={{ backgroundColor: theme.hex, color: onColor(theme.hex) }}
            disabled={!config.macrosEnabled}
          >
            <Plus size={20} />
            <span className="text-sm font-medium tracking-wide">New macro</span>
          </button>
        )}
      </div>

      {!config.macrosEnabled ? (
        <div className="text-center py-20 border border-dashed border-outline-variant rounded-md bg-surface-container">
          <Power size={40} className="mx-auto mb-4 text-on-surface-variant" />
          <p className="text-on-surface-variant">The macro engine is disabled globally.</p>
        </div>
      ) : !editingMacro ? (
        <>
          {config.macros.length === 0 && (
            <div className="text-center py-20 border border-dashed border-outline-variant rounded-md">
              <Command size={40} className="mx-auto mb-4 text-on-surface-variant" />
              <p className="text-on-surface-variant">No macros defined.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.macros.map((m) => (
              <div
                key={m.id}
                className="bg-surface-container border border-outline-variant rounded-md p-5 hover:bg-surface-high transition-colors cursor-pointer group"
                onClick={() => setEditingMacro({ ...m })}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-primary-container rounded-md flex items-center justify-center text-on-primary-container">
                    <Command size={18} />
                  </div>
                  <div className="flex gap-1">
                    <IconBtn
                      onClick={(e) => runMacro(m.id, e)}
                      title="Run macro now"
                      className="!text-primary hover:!bg-primary/10"
                    >
                      <Play size={14} />
                    </IconBtn>
                    <IconBtn
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConfig(
                          null,
                          "macros",
                          config.macros.filter((x) => x.id !== m.id),
                        );
                      }}
                      title="Delete macro"
                      className="hover:!text-error"
                    >
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                </div>
                <h4 className="text-[15px] font-medium text-on-surface mb-1">{m.name}</h4>
                <Chip tone="neutral">{m.steps.length} steps</Chip>
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
    <div className="max-w-4xl mx-auto bg-surface-container border border-outline-variant rounded-md flex flex-col h-[560px] overflow-hidden">
      <div className="px-5 h-14 border-b border-outline-variant flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <IconBtn onClick={onBack} aria-label="Back">
            <ArrowLeft size={18} />
          </IconBtn>
          <input
            type="text"
            value={macro.name}
            onChange={(e) => onChange({ ...macro, name: e.target.value })}
            className="bg-transparent text-lg font-normal text-on-surface outline-none"
          />
        </div>
        <Btn variant="filled" theme={theme} onClick={onSave}>
          Save
        </Btn>
      </div>
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="space-y-3">
          {macro.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 bg-surface-high p-3 rounded-sm border border-outline-variant">
              <div className="w-6 h-6 rounded-full bg-surface-highest flex items-center justify-center text-[10px] font-mono text-on-surface-variant shrink-0">
                {i + 1}
              </div>
              <select
                value={step.type}
                onChange={(e) => updateStep(i, "type", e.target.value)}
                className="bg-surface text-on-surface text-xs rounded-xs px-2 h-8 border border-outline outline-none uppercase font-medium tracking-wide focus:border-2 focus:border-primary"
              >
                <option value="press">Press</option>
                <option value="wait">Delay</option>
              </select>
              {step.type === "press" ? (
                <input
                  type="text"
                  value={step.key || ""}
                  onChange={(e) => updateStep(i, "key", e.target.value)}
                  className="bg-surface text-on-surface font-mono text-sm rounded-xs px-3 h-8 border border-outline w-24 text-center outline-none focus:border-2 focus:border-primary"
                />
              ) : (
                <input
                  type="number"
                  value={step.ms || 0}
                  onChange={(e) => updateStep(i, "ms", parseInt(e.target.value))}
                  className="bg-surface text-primary font-mono text-sm rounded-xs px-3 h-8 border border-outline w-24 text-center outline-none focus:border-2 focus:border-primary"
                />
              )}
              <button
                onClick={() => removeStep(i)}
                className="ml-auto text-on-surface-variant hover:text-error p-2 rounded-full hover:bg-white/5"
                aria-label="Remove step"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={addStep}
            className="w-full h-11 border border-dashed border-outline text-on-surface-variant rounded-md hover:text-on-surface hover:border-outline transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Add next step
          </button>
        </div>
      </div>
    </div>
  );
}
