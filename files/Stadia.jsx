import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Save, Gamepad2, Mic2, FolderOpen, Download, 
  Zap, Keyboard, Bluetooth, Plus, Trash2, Clock, X, ArrowRight,
  Power, Crosshair, Cpu, CheckCircle2, AlertTriangle, 
  Play, FileCode, RotateCcw,
  Layers, Activity, Terminal, List, Palette, ChevronDown, Command, HardDrive, 
  Battery, Plug, RefreshCw, Smartphone, Wifi, FileJson, Info, QrCode, Globe, Calendar, Github, BatteryCharging, Monitor, MousePointer2
} from 'lucide-react';

// --- THEME ENGINE ---
const THEMES = {
  blue: {
    name: 'Royal Blue',
    primary: 'bg-blue-600',
    hover: 'hover:bg-blue-500',
    text: 'text-blue-400',
    border: 'border-blue-500',
    ring: 'focus:border-blue-500',
    accent_bg: 'bg-blue-900/20',
    gradient: 'from-blue-600 to-indigo-600',
    hex: '#2563eb'
  },
  cyan: {
    name: 'Cyber Cyan',
    primary: 'bg-cyan-600',
    hover: 'hover:bg-cyan-500',
    text: 'text-cyan-400',
    border: 'border-cyan-500',
    ring: 'focus:border-cyan-500',
    accent_bg: 'bg-cyan-900/20',
    gradient: 'from-cyan-600 to-blue-600',
    hex: '#0891b2'
  },
  orange: {
    name: 'Stadia Orange',
    primary: 'bg-orange-600',
    hover: 'hover:bg-orange-500',
    text: 'text-orange-400',
    border: 'border-orange-500',
    ring: 'focus:border-orange-500',
    accent_bg: 'bg-orange-900/20',
    gradient: 'from-orange-600 to-red-600',
    hex: '#ea580c'
  },
  purple: {
    name: 'Neon Purple',
    primary: 'bg-purple-600',
    hover: 'hover:bg-purple-500',
    text: 'text-purple-400',
    border: 'border-purple-500',
    ring: 'focus:border-purple-500',
    accent_bg: 'bg-purple-900/20',
    gradient: 'from-purple-600 to-pink-600',
    hex: '#9333ea'
  },
  green: {
    name: 'Matrix Green',
    primary: 'bg-emerald-600',
    hover: 'hover:bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
    ring: 'focus:border-emerald-500',
    accent_bg: 'bg-emerald-900/20',
    gradient: 'from-emerald-600 to-teal-600',
    hex: '#059669'
  }
};

const StadiaConfigurator = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTheme, setCurrentTheme] = useState('blue'); 
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [time, setTime] = useState(new Date());
  const theme = THEMES[currentTheme];

  // --- CONFIG STATE ---
  const [profiles, setProfiles] = useState([{ id: 'default', name: 'Default Profile' }]);
  const [activeProfileId, setActiveProfileId] = useState('default');
  
  const [config, setConfig] = useState({
    system: { 
      installPath: './', 
      isRelative: true,
      runOnStartup: true, 
      hidePhysicalController: true, 
      trayIcon: true 
    },
    driver: { emulationType: 'Xbox360', btPacketOverride: true, restartOnWake: true, pollingRate: 10 },
    vibration: { enabled: true, strength: 100, safeMode: true },
    deadzones: { left: 10, right: 10, triggers: 5 },
    mobile: { enabled: false, port: 9090, ip: '192.168.1.105' },
    macrosEnabled: true,
    keybinds: {
      stadiaBtn:   { mode: 'xinput', value: 'Guide', label: 'Stadia', category: 'Special' },
      assistantBtn:{ mode: 'shortcut', value: 'Win + S', label: 'Assistant', category: 'Special' },
      captureBtn:  { mode: 'shortcut', value: 'Win + Shift + S', label: 'Capture', category: 'Special' },
      optionsBtn:  { mode: 'xinput', value: 'Start', label: 'Options', category: 'Menu' },
      menuBtn:     { mode: 'xinput', value: 'Back', label: 'Menu', category: 'Menu' },
      faceA:       { mode: 'xinput', value: 'A', label: 'Face A', category: 'Face' },
      faceB:       { mode: 'xinput', value: 'B', label: 'Face B', category: 'Face' },
      faceX:       { mode: 'xinput', value: 'X', label: 'Face X', category: 'Face' },
      faceY:       { mode: 'xinput', value: 'Y', label: 'Face Y', category: 'Face' },
      lTrigger:    { mode: 'xinput', value: 'LT', label: 'L2 Trigger', category: 'Triggers' },
      rTrigger:    { mode: 'xinput', value: 'RT', label: 'R2 Trigger', category: 'Triggers' },
      lBumper:     { mode: 'xinput', value: 'LB', label: 'L1 Bumper', category: 'Triggers' },
      rBumper:     { mode: 'xinput', value: 'RB', label: 'R1 Bumper', category: 'Triggers' },
      lStickClick: { mode: 'xinput', value: 'L-Stick', label: 'L3 Click', category: 'Sticks' },
      rStickClick: { mode: 'xinput', value: 'R-Stick', label: 'R3 Click', category: 'Sticks' },
      dpadUp:      { mode: 'xinput', value: 'D-Pad Up', label: 'Up', category: 'D-Pad' },
      dpadDown:    { mode: 'xinput', value: 'D-Pad Down', label: 'Down', category: 'D-Pad' },
      dpadLeft:    { mode: 'xinput', value: 'D-Pad Left', label: 'Left', category: 'D-Pad' },
      dpadRight:   { mode: 'xinput', value: 'D-Pad Right', label: 'Right', category: 'D-Pad' }
    },
    macros: [
      {
        id: 'default_macro',
        name: 'Rapid Fire (Sample)',
        steps: [
          { type: 'press', key: 'RT', ms: 50 },
          { type: 'wait', ms: 50 },
          { type: 'press', key: 'RT', ms: 50 }
        ]
      }
    ]
  });

  const [status, setStatus] = useState({ vigemBus: true, hidHide: false, driverCore: false, mobileService: false, controller: 'searching' });
  const [controllerInfo, setControllerInfo] = useState({ isConnected: false, battery: 85, connection: 'Bluetooth' });
  const [editingMacro, setEditingMacro] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [isTestingRumble, setIsTestingRumble] = useState(false);
  const [isRestartingDriver, setIsRestartingDriver] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulation Effects
  useEffect(() => {
    setTimeout(() => setStatus(prev => ({...prev, driverCore: true})), 800);
    setTimeout(() => {
        setStatus(prev => ({...prev, controller: 'connected'}));
        setControllerInfo(prev => ({...prev, isConnected: true}));
    }, 1500);
  }, []);

  const updateConfig = (section, key, value) => {
      if (section === null) {
          setConfig(prev => ({ ...prev, [key]: value }));
      } else {
          setConfig(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
      }
  };
  
  const updateBind = (key, field, value) => setConfig(prev => ({ ...prev, keybinds: { ...prev.keybinds, [key]: { ...prev.keybinds[key], [field]: value } } }));

  const handleDriverAction = (key, action) => {
      const newStatus = action === 'install' || action === 'reinstall';
      setStatus(prev => ({ ...prev, [key]: newStatus }));
  };

  const handleSaveConfig = async () => {
      setSaveStatus('saving');
      try {
          if (window.showSaveFilePicker) throw new Error("Web preview");
          await new Promise(r => setTimeout(r, 800));
          throw new Error("PERMISSION_DENIED");
      } catch (err) {
          const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'config.json';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setSaveStatus('download');
          setTimeout(() => setSaveStatus(null), 4000);
      }
  };

  const handleSaveMacro = () => {
      if (!editingMacro) return;
      setConfig(prev => {
          const newMacros = [...prev.macros];
          const idx = newMacros.findIndex(m => m.id === editingMacro.id);
          if (idx >= 0) newMacros[idx] = editingMacro;
          else newMacros.push(editingMacro);
          return { ...prev, macros: newMacros };
      });
      setEditingMacro(null);
  };

  const handleTestRumble = () => {
    setIsTestingRumble(true);
    setTimeout(() => setIsTestingRumble(false), 1000);
  };

  const handleProfileChange = (e) => setActiveProfileId(e.target.value);
  const handleCreateProfile = () => {
      const newId = `profile_${Date.now()}`;
      setProfiles([...profiles, { id: newId, name: `Profile ${profiles.length + 1}` }]);
      setActiveProfileId(newId);
  };

  const groupedKeybinds = Object.entries(config.keybinds).reduce((acc, [key, data]) => {
    const cat = data.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ key, ...data });
    return acc;
  }, {});

  const sortedCategories = ['Special', 'Face', 'D-Pad', 'Triggers', 'Sticks', 'Menu'];

  // Inline CSS for scrollbars
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #0b0c10; }
      ::-webkit-scrollbar-thumb { background: ${theme.hex}80; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${theme.hex}; }
      ::selection { background: ${theme.hex}40; color: white; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, [theme]);

  return (
    <div className="flex h-screen bg-[#0b0c10] text-gray-200 font-sans overflow-hidden select-none relative">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 flex items-center gap-3 border-b border-white/5">
            {/* Logo Restored Here */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-br ${theme.gradient} p-0.5 overflow-hidden`}>
                <img src="https://peditx.ir/android-chrome-512x512.png" alt="PX Logo" className="w-full h-full object-cover rounded-md" />
            </div>
            <div>
                <h1 className="font-bold text-sm text-white">PX MANAGER</h1>
                <span className="text-[10px] text-gray-500 block">v2.1.0 (Stable)</span>
            </div>
          </div>
          <nav className="p-2 space-y-1">
            <SidebarItem theme={theme} icon={<Activity/>} label="System Status" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem theme={theme} icon={<List/>} label="Button Mapping" active={activeTab === 'mapping'} onClick={() => setActiveTab('mapping')} />
            <SidebarItem theme={theme} icon={<FileCode/>} label="Macros" active={activeTab === 'macros'} onClick={() => setActiveTab('macros')} />
            <SidebarItem theme={theme} icon={<Zap/>} label="Vibration" active={activeTab === 'vibration'} onClick={() => setActiveTab('vibration')} />
            <SidebarItem theme={theme} icon={<Smartphone/>} label="Remote Access" active={activeTab === 'mobile'} onClick={() => setActiveTab('mobile')} />
          </nav>
        </div>
        
        {/* Footer Status */}
        <div className="p-4 bg-[#050505] border-t border-white/10">
             <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                 <span className="text-[10px] font-mono text-gray-400">WAITING FOR EXE...</span>
             </div>
             <div className="text-[10px] text-gray-600">Config Path: ./config.json</div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#111]">
        
        {/* HEADER */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]">
            <div className="flex items-center gap-4">
               <span className="font-mono text-xs text-gray-500">PROFILE:</span>
               <select className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer hover:text-blue-400 transition-colors">
                   <option>Default Profile</option>
               </select>
            </div>
            <div className="flex items-center gap-6">
                <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-xs font-bold text-white font-mono">{time.toLocaleTimeString()}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{time.toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="p-2 hover:bg-white/10 rounded text-gray-400"><Palette size={16}/></button>
                    {showThemeMenu && (
                        <div className="absolute top-12 right-20 bg-[#222] border border-white/10 rounded p-2 z-50">
                            {Object.keys(THEMES).map(k => <div key={k} onClick={() => {setCurrentTheme(k); setShowThemeMenu(false)}} className={`w-4 h-4 rounded-full mb-1 cursor-pointer ${THEMES[k].primary}`}></div>)}
                        </div>
                    )}
                    <button onClick={handleSaveConfig} className={`flex items-center gap-2 ${theme.primary} text-white px-4 py-1.5 rounded text-xs font-bold hover:opacity-90`}>
                        <Save size={14}/> SAVE CONFIG
                    </button>
                </div>
            </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

            {/* --- DASHBOARD --- */}
            {activeTab === 'dashboard' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Hero Banner */}
                     <div className={`relative rounded-2xl overflow-hidden p-8 flex items-center justify-between shadow-2xl bg-gradient-to-r ${theme.gradient}`}>
                        <div className="relative z-10 text-white">
                            <h2 className="text-3xl font-black mb-2 tracking-tight">STADIA COMMAND CENTER</h2>
                            <p className="text-white/80 max-w-lg text-sm">Manage drivers, configure mappings, and monitor device status all in one place.</p>
                            <div className="flex gap-3 mt-6">
                                <a href="https://peditx.ir" target="_blank" className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                                    <Globe size={14}/> Visit PeDitX.ir
                                </a>
                                <a href="https://github.com" target="_blank" className="bg-black/20 hover:bg-black/30 backdrop-blur px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                                    <Github size={14}/> GitHub Repo
                                </a>
                            </div>
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-black/20 to-transparent"></div>
                        <Gamepad2 className="absolute -right-6 -bottom-12 text-white/10 rotate-12" size={240} />
                    </div>

                    {/* Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatusCard theme={theme} label="Controller Status" value={controllerInfo.isConnected ? "Connected" : "Disconnected"} icon={<Gamepad2 size={24}/>} active={controllerInfo.isConnected} color="green" subtext={controllerInfo.isConnected ? "Ready for Gaming" : "Please Connect Device"}/>
                        <StatusCard theme={theme} label="Battery Level" value={`${controllerInfo.battery}%`} icon={<BatteryCharging size={20}/>} active={true} color="blue" />
                        <StatusCard theme={theme} label="Connection Mode" value={controllerInfo.connection} icon={<Bluetooth size={20}/>} active={true} color="purple" />
                        <StatusCard theme={theme} label="Driver Engine" value={status.driverCore ? "Active" : "Inactive"} icon={<Cpu size={20}/>} active={status.driverCore} color="orange" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Driver Management</h3>
                            <DriverRow theme={theme} name="ViGEmBus Driver" status={status.vigemBus} onAction={(a) => handleDriverAction('vigemBus', a)} />
                            <DriverRow theme={theme} name="HidHide Driver" status={status.hidHide} onAction={(a) => handleDriverAction('hidHide', a)} />
                            <DriverRow theme={theme} name="Stadia Core" status={status.driverCore} onAction={(a) => handleDriverAction('driverCore', a)} />
                            <DriverRow theme={theme} name="Mobile Bridge" status={status.mobileService} onAction={(a) => handleDriverAction('mobileService', a)} isNew />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">System Settings</h3>
                            <div className="bg-[#1a1a1a] p-5 rounded-lg border border-white/5 space-y-4">
                                <ToggleRow theme={theme} label="Auto-Start Driver" checked={config.system.runOnStartup} onChange={(v) => updateConfig('system', 'runOnStartup', v)} />
                                <ToggleRow theme={theme} label="Hide Original HID" checked={config.system.hidePhysicalController} onChange={(v) => updateConfig('system', 'hidePhysicalController', v)} />
                                <div className="pt-2">
                                    <label className="text-[10px] text-gray-500 font-bold mb-1 block">CONFIG LOCATION</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-[#111] border border-white/10 rounded px-3 py-2 text-xs font-mono text-gray-300">./ (Root)</div>
                                        <button className="p-2 hover:bg-white/10 rounded border border-white/10"><FolderOpen size={14} className="text-gray-400"/></button>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-white/5">
                                     <label className="text-[10px] text-gray-500 font-bold mb-1 block">DRIVER MODE</label>
                                     <select 
                                        value={config.driver.emulationType}
                                        onChange={(e) => updateConfig('driver', 'emulationType', e.target.value)}
                                        className="w-full bg-[#111] border border-white/10 rounded px-2 py-2 text-xs text-white outline-none"
                                    >
                                        <option value="Xbox360">Xbox 360 (Recommended)</option>
                                        <option value="DS4">DualShock 4</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAPPING --- */}
            {activeTab === 'mapping' && (
                <div className="flex flex-col-reverse xl:flex-row gap-6 h-full overflow-hidden">
                    {/* List */}
                    <div className="flex-1 bg-[#1a1a1a] rounded-lg border border-white/5 flex flex-col min-h-0">
                        <div className="p-3 border-b border-white/5 bg-[#202020] rounded-t-lg font-bold text-xs text-white">Button Map</div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                             {Object.entries(config.keybinds).map(([key, val]) => (
                                 <AdvancedMappingRow 
                                    key={key} 
                                    theme={theme} 
                                    data={val} 
                                    onChange={(f, v) => updateBind(key, f, v)}
                                    onHover={setHoveredKey}
                                />
                             ))}
                        </div>
                    </div>
                    
                    {/* Schematic - Precise Positioning */}
                    <div className="w-full xl:w-[600px] shrink-0 sticky top-0 h-fit">
                        <div className="bg-[#1a1a1a] rounded-lg border border-white/5 p-6 relative flex items-center justify-center">
                             <div className="relative w-full aspect-[500/340] max-w-[500px]">
                                {/* Wireframe Controller */}
                                <svg viewBox="0 0 500 340" className="w-full h-full drop-shadow-xl">
                                    <defs>
                                        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#ffffff" />
                                            <stop offset="100%" stopColor="#d1d5db" />
                                        </linearGradient>
                                        <marker id="arrow" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" /></marker>
                                    </defs>
                                    <path d="M 140 60 L 360 60 Q 440 60 440 140 L 440 220 Q 440 280 390 280 L 350 280 Q 310 280 310 240 L 310 220 Q 310 200 250 200 Q 190 200 190 220 L 190 240 Q 190 280 150 280 L 110 280 Q 60 280 60 220 L 60 140 Q 60 60 140 60 Z" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="1.5"/>
                                    <path d="M 140 60 L 100 20" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2"/>
                                    <path d="M 360 60 L 400 20" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2"/>
                                    <path d="M 180 230 L 180 290" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" markerEnd="url(#arrow)"/>
                                    <path d="M 320 230 L 320 290" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" markerEnd="url(#arrow)"/>
                                </svg>
                                
                                {/* Buttons with Precise Percentage Coordinates */}
                                <SchematicButton theme={theme} label="L2" x={15} y={5} active={hoveredKey === 'lTrigger'} />
                                <SchematicButton theme={theme} label="R2" x={85} y={5} active={hoveredKey === 'rTrigger'} />
                                <SchematicButton theme={theme} label="L1" x={20} y={12} active={hoveredKey === 'lBumper'} small darkText/>
                                <SchematicButton theme={theme} label="R1" x={80} y={12} active={hoveredKey === 'rBumper'} small darkText/>
                                
                                <SchematicButton theme={theme} label="Y" x={75} y={28} active={hoveredKey === 'faceY'} round darkText/>
                                <SchematicButton theme={theme} label="X" x={69} y={35} active={hoveredKey === 'faceX'} round darkText/>
                                <SchematicButton theme={theme} label="B" x={81} y={35} active={hoveredKey === 'faceB'} round darkText/>
                                <SchematicButton theme={theme} label="A" x={75} y={42} active={hoveredKey === 'faceA'} round darkText/>

                                <SchematicButton theme={theme} label="UP" x={25} y={28} active={hoveredKey === 'dpadUp'} small />
                                <SchematicButton theme={theme} label="DWN" x={25} y={42} active={hoveredKey === 'dpadDown'} small />
                                <SchematicButton theme={theme} label="LFT" x={19} y={35} active={hoveredKey === 'dpadLeft'} small />
                                <SchematicButton theme={theme} label="RGT" x={31} y={35} active={hoveredKey === 'dpadRight'} small />

                                <SchematicButton theme={theme} label="S" x={50} y={40} active={hoveredKey === 'stadiaBtn'} round large />
                                <SchematicButton theme={theme} label="OPT" x={38} y={28} active={hoveredKey === 'optionsBtn'} small darkText/>
                                <SchematicButton theme={theme} label="MENU" x={62} y={28} active={hoveredKey === 'menuBtn'} small darkText/>
                                <SchematicButton theme={theme} label="AST" x={42} y={50} active={hoveredKey === 'assistantBtn'} small darkText/>
                                <SchematicButton theme={theme} label="CAP" x={58} y={50} active={hoveredKey === 'captureBtn'} small darkText/>

                                <SchematicButton theme={theme} label="L3" x={36} y={62} active={hoveredKey === 'lStickClick'} round large />
                                <SchematicButton theme={theme} label="R3" x={64} y={62} active={hoveredKey === 'rStickClick'} round large />
                            </div>
                        </div>
                        
                        {/* Deadzones */}
                        <div className="bg-[#1a1a1a] mt-4 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs text-gray-500 font-bold">DEADZONES</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col items-center">
                                     <DeadzoneVisualizer theme={theme} value={config.deadzones.left} />
                                     <span className="text-xs text-gray-400 mt-2">Left Stick ({config.deadzones.left}%)</span>
                                     <input type="range" max="50" value={config.deadzones.left} onChange={(e) => updateConfig('deadzones', 'left', e.target.value)} className={`w-full h-1 bg-black rounded-lg appearance-none cursor-pointer mt-2 ${theme.primary.replace('bg-', 'accent-')}`}/>
                                </div>
                                <div className="flex flex-col items-center">
                                     <DeadzoneVisualizer theme={theme} value={config.deadzones.right} />
                                     <span className="text-xs text-gray-400 mt-2">Right Stick ({config.deadzones.right}%)</span>
                                     <input type="range" max="50" value={config.deadzones.right} onChange={(e) => updateConfig('deadzones', 'right', e.target.value)} className={`w-full h-1 bg-black rounded-lg appearance-none cursor-pointer mt-2 ${theme.primary.replace('bg-', 'accent-')}`}/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIBRATION */}
            {activeTab === 'vibration' && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-[#1a1a1a] p-8 rounded-lg border border-white/5 text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Force Feedback</h2>
                        <div className="flex items-center justify-center gap-4 mb-8">
                            <span className="text-xs text-gray-500">0%</span>
                            <input type="range" className={`w-64 h-2 bg-black rounded-lg appearance-none cursor-pointer ${theme.primary.replace('bg-', 'accent-')}`} 
                                   value={config.vibration.strength}
                                   onChange={(e) => updateConfig('vibration', 'strength', e.target.value)} />
                            <span className="text-xs text-white font-mono">{config.vibration.strength}%</span>
                        </div>
                        <button onClick={handleTestRumble} disabled={isTestingRumble} className={`w-full py-3 rounded font-bold transition-all ${isTestingRumble ? 'bg-white/10 text-gray-500' : `${theme.primary} text-white`}`}>
                            {isTestingRumble ? 'TESTING...' : 'TEST RUMBLE'}
                        </button>
                    </div>
                </div>
            )}

            {/* MACROS */}
            {activeTab === 'macros' && (
                <div className="h-full p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Macro Engine</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <ToggleRow theme={theme} label={config.macrosEnabled ? "Macros Active" : "Macros Disabled"} checked={config.macrosEnabled} onChange={(v) => updateConfig(null, 'macrosEnabled', v)} small />
                                </div>
                            </div>
                            {!editingMacro && (
                                <button 
                                    onClick={() => setEditingMacro({id: Date.now(), name: 'New Macro', steps: [{type:'press', key:'A', ms:100}]})} 
                                    className={`${theme.primary} hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                                    disabled={!config.macrosEnabled}
                                >
                                    <Plus size={16}/> New Macro
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
                                    {config.macros.map(m => (
                                        <div key={m.id} className={`bg-[#15171c] p-5 rounded-xl border border-white/5 hover:${theme.border} transition-all group cursor-pointer`} onClick={() => setEditingMacro(m)}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center ${theme.text}`}><Command size={20}/></div>
                                                <button onClick={(e) => { e.stopPropagation(); setConfig(p => ({...p, macros: p.macros.filter(x => x.id !== m.id)}))}} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                                            </div>
                                            <h4 className="font-bold text-white mb-1">{m.name}</h4>
                                            <div className="text-xs text-gray-500 font-mono">{m.steps.length} Steps</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="max-w-4xl mx-auto bg-[#15171c] border border-white/5 rounded-2xl flex flex-col h-[600px] overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1d23]">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setEditingMacro(null)} className="p-2 hover:bg-white/10 rounded-full"><ArrowRight size={20} className="rotate-180"/></button>
                                        <input type="text" value={editingMacro.name} onChange={(e) => setEditingMacro({...editingMacro, name: e.target.value})} className="bg-transparent text-xl font-bold text-white outline-none"/>
                                    </div>
                                    <button onClick={handleSaveMacro} className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold">Save</button>
                                </div>
                                <div className="flex-1 p-8 overflow-y-auto">
                                    <div className="space-y-3">
                                        {editingMacro.steps.map((step, i) => (
                                            <div key={i} className="flex items-center gap-4 bg-black/30 p-3 rounded-lg border border-white/5">
                                                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono text-gray-500">{i+1}</div>
                                                <select value={step.type} onChange={(e) => {
                                                    const newSteps = [...editingMacro.steps];
                                                    newSteps[i].type = e.target.value;
                                                    setEditingMacro({...editingMacro, steps: newSteps});
                                                }} className="bg-[#0b0c10] text-white text-xs rounded px-2 py-1.5 border border-white/10 outline-none uppercase font-bold tracking-wider">
                                                    <option value="press">Action: Press</option>
                                                    <option value="wait">Action: Delay</option>
                                                </select>
                                                {step.type === 'press' ? (
                                                    <input type="text" value={step.key} onChange={(e) => {
                                                        const newSteps = [...editingMacro.steps];
                                                        newSteps[i].key = e.target.value;
                                                        setEditingMacro({...editingMacro, steps: newSteps});
                                                    }} className="bg-[#0b0c10] text-white font-mono text-sm rounded px-3 py-1.5 border border-white/10 w-24 text-center outline-none"/>
                                                ) : (
                                                    <input type="number" value={step.ms} onChange={(e) => {
                                                        const newSteps = [...editingMacro.steps];
                                                        newSteps[i].ms = parseInt(e.target.value);
                                                        setEditingMacro({...editingMacro, steps: newSteps});
                                                    }} className="bg-[#0b0c10] text-blue-400 font-mono text-sm rounded px-3 py-1.5 border border-white/10 w-24 text-center outline-none"/>
                                                )}
                                                <button onClick={() => {
                                                    const newSteps = editingMacro.steps.filter((_, idx) => idx !== i);
                                                    setEditingMacro({...editingMacro, steps: newSteps});
                                                }} className="ml-auto text-gray-600 hover:text-red-400 p-2"><X size={16}/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => setEditingMacro({...editingMacro, steps: [...editingMacro.steps, {type: 'press', key: 'A', ms: 100}]})} className="w-full py-3 border border-dashed border-gray-700 text-gray-500 rounded-lg hover:text-white hover:border-gray-500 transition-colors font-medium text-sm flex items-center justify-center gap-2">
                                            <Plus size={14}/> Add Next Step
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MOBILE REMOTE TAB */}
            {activeTab === 'mobile' && (
                <div className="h-full p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className={`bg-gradient-to-r ${theme.gradient} rounded-2xl p-8 relative overflow-hidden shadow-2xl`}>
                            <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-[80px]"></div>
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                        <Smartphone size={24}/> Mobile Remote Control
                                    </h2>
                                    <p className="text-white/80 text-sm max-w-lg">Control your settings remotely. Requires Mobile Bridge Service.</p>
                                </div>
                                <div className="hidden md:block"><Wifi size={64} className="text-white/20"/></div>
                            </div>
                        </div>

                        {!status.mobileService ? (
                            <div className="bg-[#15171c] border border-red-500/20 rounded-xl p-8 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={32} className="text-red-500"/></div>
                                <h3 className="text-xl font-bold text-white mb-2">Service Not Installed</h3>
                                <p className="text-gray-400 mb-6 max-w-md">The Mobile Bridge Service is required for this feature.</p>
                                <button onClick={() => setActiveTab('dashboard')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg text-sm font-bold">Go to Dashboard</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#15171c] p-6 rounded-xl border border-white/5 space-y-6">
                                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                        <h3 className="font-bold text-white">Server Config</h3>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold ${config.mobile.enabled ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{config.mobile.enabled ? 'RUNNING' : 'STOPPED'}</div>
                                    </div>
                                    <ToggleRow theme={theme} label="Enable Remote Access" checked={config.mobile.enabled} onChange={(v) => updateConfig('mobile', 'enabled', v)} />
                                    <div>
                                        <label className="text-xs text-gray-500 mb-2 block font-bold">LOCAL IP</label>
                                        <div className="flex items-center justify-between bg-[#0b0c10] border border-white/10 rounded-lg p-3">
                                            <div className="flex items-center gap-2"><Wifi size={14} className={theme.text}/><span className="text-sm font-mono text-white">{config.mobile.ip}</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-2 block font-bold">PORT</label>
                                        <input type="number" value={config.mobile.port} onChange={(e) => updateConfig('mobile', 'port', parseInt(e.target.value))} className={`w-full bg-[#0b0c10] border border-white/10 rounded-lg p-3 text-sm text-white font-mono outline-none ${theme.ring}`}/>
                                    </div>
                                </div>
                                <div className="bg-[#15171c] p-6 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center space-y-6">
                                    <h3 className="font-bold text-white text-sm">Scan to Connect</h3>
                                    <div className={`w-48 h-48 bg-white p-2 rounded-lg flex items-center justify-center ${!config.mobile.enabled ? 'opacity-20 grayscale' : ''}`}>
                                        <div className="w-full h-full border-4 border-black border-dashed flex items-center justify-center text-black font-bold text-xs">[ QR CODE ]</div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500">Or visit:</p>
                                        <a href="#" className={`text-sm font-mono font-bold ${theme.text}`}>http://{config.mobile.ip}:{config.mobile.port}</a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

      </main>

      {/* FIXED LOGO */}
      <a href="https://peditx.ir" target="_blank" className="fixed bottom-6 right-6 z-50 group">
        <div className={`absolute inset-0 rounded-full blur opacity-40 group-hover:opacity-100 transition-opacity ${theme.primary}`}></div>
        <img src="https://peditx.ir/android-chrome-512x512.png" alt="PeDitX" className="relative w-12 h-12 rounded-full border-2 border-white/20 shadow-2xl transition-transform group-hover:scale-110"/>
      </a>
    </div>
  );
};

// --- SUB COMPONENTS ---

const StatusCard = ({theme, label, value, icon, active, color, subtext}) => {
    let colorClass = 'text-gray-400';
    let bgClass = 'bg-gray-500/10';
    if(active) {
        if(color === 'green') { colorClass = 'text-green-400'; bgClass = 'bg-green-500/10'; }
        if(color === 'blue') { colorClass = 'text-blue-400'; bgClass = 'bg-blue-500/10'; }
        if(color === 'purple') { colorClass = 'text-purple-400'; bgClass = 'bg-purple-500/10'; }
        if(color === 'orange') { colorClass = 'text-orange-400'; bgClass = 'bg-orange-500/10'; }
    }
    return (
        <div className={`bg-[#15171c] p-4 rounded-xl border border-white/5 flex items-center justify-between`}>
            <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{label}</p>
                <p className="text-lg font-bold text-white">{value}</p>
                {subtext && <p className="text-[9px] text-gray-500 mt-0.5">{subtext}</p>}
            </div>
            <div className={`p-2 rounded-lg ${bgClass} ${colorClass}`}>{icon}</div>
        </div>
    )
}

const DriverRow = ({ theme, name, status, onAction, isNew }) => {
    const [loading, setLoading] = useState(false);
    const act = (type) => { setLoading(true); setTimeout(() => { onAction(type); setLoading(false); }, 1500); };
    return (
        <div className="bg-[#15171c] p-4 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div><div className="flex items-center gap-2"><span className="font-bold text-sm text-white">{name}</span>{isNew && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 rounded font-bold">NEW</span>}</div></div>
            </div>
            <div className="flex gap-2">
                {loading ? <RefreshCw size={14} className="animate-spin text-gray-500"/> : status ? (
                    <><button onClick={() => act('reinstall')} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 hover:bg-blue-500/20">Reinstall</button><button onClick={() => act('uninstall')} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 hover:bg-red-500/20">Uninstall</button></>
                ) : (
                    <button onClick={() => act('install')} className="text-[10px] bg-green-500/10 text-green-400 px-3 py-1 rounded border border-green-500/20 hover:bg-green-500/20">Install</button>
                )}
            </div>
        </div>
    );
};

const ToggleRow = ({ theme, label, desc, checked, onChange, small }) => (
    <div className="flex items-center justify-between">
        <div><span className={`text-gray-300 font-medium ${small ? 'text-xs' : 'text-sm'}`}>{label}</span>{desc && <p className="text-xs text-gray-500">{desc}</p>}</div>
        <div onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${checked ? theme.primary : 'bg-gray-700'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${checked ? 'left-5' : 'left-1'}`}></div>
        </div>
    </div>
);

const SchematicButton = ({ theme, label, x, y, active, round, small, large, darkText, inv }) => {
    if (inv) return <div className={`absolute w-full h-full flex items-center justify-center transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} style={{ left: x+'%', top: y+'%', transform: 'translate(-50%, -50%)' }}><div className={`w-2 h-2 rounded-full ${theme.primary} shadow-[0_0_10px_theme('colors.indigo.500')]`}></div></div>
    
    return (
        <div 
            className={`absolute flex items-center justify-center font-bold transition-all duration-300 border 
                ${active ? `${theme.primary} text-white border-transparent scale-110 shadow-lg z-20` : `bg-white border-gray-300 ${darkText ? 'text-gray-500' : 'text-gray-400'}`}
                ${round ? 'rounded-full' : 'rounded-md'}
                ${large ? 'w-10 h-10 text-xs' : small ? 'w-7 h-7 text-[9px]' : 'w-8 h-8 text-[10px]'}
            `}
            style={{ left: x + '%', top: y + '%', transform: 'translate(-50%, -50%)' }}
        >
            {label}
        </div>
    )
};

const DeadzoneVisualizer = ({ theme, value }) => (
    <div className="relative w-16 h-16 bg-[#0b0c10] rounded-full border border-white/10 flex items-center justify-center shadow-inner">
        <div className={`absolute rounded-full border ${theme.border} bg-opacity-20 ${theme.primary.replace('bg-', 'bg-')}`} style={{ width: `${value * 2}%`, height: `${value * 2}%`, opacity: 0.3 }}></div>
        <div className="w-1 h-1 bg-white rounded-full z-10"></div>
    </div>
);

const AdvancedMappingRow = ({ theme, data, onChange, onHover }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!isRecording) return;
        const handler = (e) => {
            e.preventDefault();
            const keys = [];
            if (e.ctrlKey) keys.push('Ctrl');
            if (e.shiftKey) keys.push('Shift');
            if (e.altKey) keys.push('Alt');
            if (['Control', 'Shift', 'Alt'].includes(e.key)) return;
            keys.push(e.key.toUpperCase());
            onChange('value', keys.join('+'));
            setIsRecording(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isRecording]);

    const getIcon = () => {
        if (data.mode === 'app') return <Play size={12} className="text-green-400"/>;
        if (data.mode === 'shortcut') return <Keyboard size={12} className="text-purple-400"/>;
        return <Gamepad2 size={12} className={theme.text}/>;
    };

    return (
        <div 
            className={`bg-[#1a1d23] rounded border transition-all ${isExpanded ? `${theme.border} border-opacity-50` : 'border-white/5 hover:border-white/20'}`}
            onMouseEnter={() => onHover(data.key)} onMouseLeave={() => onHover(null)}
        >
            <div className="p-3 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <span className="text-xs font-bold text-gray-300 w-24">{data.label}</span>
                <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded border border-white/5">
                    {getIcon()}
                    <span className="text-xs text-white font-mono truncate max-w-[100px]">{data.value}</span>
                </div>
            </div>
            {isExpanded && (
                <div className="p-3 bg-black/20 border-t border-white/5 space-y-3">
                    <div className="flex bg-black/40 p-1 rounded">
                        {['xinput', 'app', 'shortcut'].map(m => (
                            <button key={m} onClick={() => onChange('mode', m)} className={`flex-1 py-1 text-[10px] uppercase rounded ${data.mode === m ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>{m}</button>
                        ))}
                    </div>
                    {data.mode === 'xinput' && (
                        <select value={data.value} onChange={(e) => onChange('value', e.target.value)} className="w-full bg-[#0b0c10] border border-white/10 rounded p-2 text-xs text-white outline-none">
                            <optgroup label="Standard Xbox">{['A','B','X','Y','Start','Back','Guide','LB','RB','LT','RT','L-Stick','R-Stick','Up','Down','Left','Right'].map(o => <option key={o} value={o}>{o}</option>)}</optgroup>
                            <optgroup label="PlayStation Specific"><option value="Touchpad">Touchpad Click</option><option value="Share">Share Button</option><option value="PS">PS Home Button</option></optgroup>
                        </select>
                    )}
                    {data.mode === 'app' && (
                        <div className="flex gap-2">
                            <input type="text" value={data.value} readOnly className="flex-1 bg-[#0b0c10] border border-white/10 rounded p-2 text-xs text-white"/>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && onChange('value', e.target.files[0].name)} />
                            <button onClick={() => fileInputRef.current.click()} className="p-2 bg-white/10 rounded hover:bg-white/20"><FolderOpen size={14}/></button>
                        </div>
                    )}
                    {data.mode === 'shortcut' && (
                        <button onClick={() => setIsRecording(!isRecording)} className={`w-full py-2 rounded text-xs font-bold ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-300'}`}>
                            {isRecording ? 'Press Keys...' : 'Record Shortcut'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const SidebarItem = ({ theme, icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${active ? `${theme.accent_bg} ${theme.text} ${theme.border} border border-opacity-20` : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
        {React.cloneElement(icon, { size: 16 })} {label}
    </button>
);

export default StadiaConfigurator;
