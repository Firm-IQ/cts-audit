'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Select, Badge } from '@/components/ui';
import { FileUp, Columns, CheckCircle2, ChevronRight, AlertTriangle, RefreshCw, BarChart2 } from 'lucide-react';

interface Advisor {
  id: string;
  name: string;
  firmName: string;
}

const TARGET_FIELDS = [
  { key: 'householdName', label: 'Household Name', description: 'Name of the family or grouping' },
  { key: 'primaryClient', label: 'Primary Client', description: 'Full name of the primary account holder' },
  { key: 'secondaryClient', label: 'Secondary Client', description: 'Spouse or joint owner name' },
  { key: 'accountName', label: 'Account Name', description: 'Display name of the account' },
  { key: 'accountType', label: 'Account Type', description: 'IRA, Trust, Joint, Individual, etc.' },
  { key: 'registration', label: 'Registration', description: 'Legal ownership details' },
  { key: 'custodian', label: 'Current Custodian', description: 'Schwab, Fidelity, LPL, etc.' },
  { key: 'estimatedValue', label: 'Estimated Value', description: 'Current account balance' },
  { key: 'annualRevenue', label: 'Annual Revenue', description: 'Estimated annual fee generated' },
  { key: 'email', label: 'Email Address', description: 'Primary client email' },
  { key: 'phone', label: 'Phone Number', description: 'Primary client phone' },
  { key: 'address', label: 'Address', description: 'Primary physical address' },
  { key: 'notes', label: 'Advisor Notes', description: 'General client notes or comments' },
  { key: 'householdId', label: 'Household ID', description: 'External database household key' },
  { key: 'clientId', label: 'Client ID', description: 'External database client reference number' }
];

const CRM_TYPES = ['Redtail', 'Wealthbox', 'Salesforce', 'Junxure', 'Tamarac', 'Orion', 'Excel'];

function localParseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 0 && row.some(cell => cell !== '')) {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell !== '')) {
      lines.push(row);
    }
  }
  return lines;
}

export default function CRMImportClient({ initialAdvisors }: { initialAdvisors: Advisor[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form selections
  const [advisors, setAdvisors] = useState<Advisor[]>(initialAdvisors);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
  const [isNewAdvisor, setIsNewAdvisor] = useState(false);
  const [newAdvisorName, setNewAdvisorName] = useState('');
  const [newAdvisorFirm, setNewAdvisorFirm] = useState('');
  
  const [crmType, setCrmType] = useState('Redtail');
  const [rawCsvText, setRawCsvText] = useState('');
  
  // CSV Preview & Column Mappings
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  // Import Results State
  const [importSummary, setImportSummary] = useState<any>(null);

  // Fetch saved mapping config on CRM type changes
  useEffect(() => {
    async function loadSavedMapping() {
      try {
        const response = await fetch(`/api/crm-mappings?crmType=${encodeURIComponent(crmType)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.crmMapping) {
            const parsed = JSON.parse(data.crmMapping.mapping);
            setMappings(parsed);
          } else {
            // Default mapping templates if none saved
            const defaults: Record<string, string> = {};
            // Attempt smart autocomplete matches based on common headers
            headers.forEach(h => {
              const lower = h.toLowerCase();
              if (lower.includes('household name') || lower.includes('family')) defaults['householdName'] = h;
              else if (lower.includes('primary client') || lower.includes('client name') || lower.includes('first name') || lower.includes('last name')) defaults['primaryClient'] = h;
              else if (lower.includes('spouse') || lower.includes('joint') || lower.includes('secondary')) defaults['secondaryClient'] = h;
              else if (lower.includes('account name') || lower.includes('title')) defaults['accountName'] = h;
              else if (lower.includes('account type') || lower.includes('type')) defaults['accountType'] = h;
              else if (lower.includes('registration') || lower.includes('ownership')) defaults['registration'] = h;
              else if (lower.includes('custodian') || lower.includes('clearing')) defaults['custodian'] = h;
              else if (lower.includes('value') || lower.includes('balance') || lower.includes('aum')) defaults['estimatedValue'] = h;
              else if (lower.includes('revenue') || lower.includes('fees')) defaults['annualRevenue'] = h;
              else if (lower.includes('email') || lower.includes('e-mail')) defaults['email'] = h;
              else if (lower.includes('phone') || lower.includes('mobile')) defaults['phone'] = h;
              else if (lower.includes('address') || lower.includes('street')) defaults['address'] = h;
              else if (lower.includes('notes') || lower.includes('comments')) defaults['notes'] = h;
              else if (lower.includes('household id')) defaults['householdId'] = h;
              else if (lower.includes('client id')) defaults['clientId'] = h;
            });
            setMappings(defaults);
          }
        }
      } catch (err) {
        console.error('Failed to load crm mapping:', err);
      }
    }
    if (headers.length > 0) {
      loadSavedMapping();
    }
  }, [crmType, headers]);

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawCsvText(text);

      const parsed = localParseCSV(text);
      if (parsed.length <= 1) {
        setError('The uploaded CSV file does not contain enough rows.');
        return;
      }

      setHeaders(parsed[0]);
      setPreviewRows(parsed.slice(1, 26)); // Preview first 25 rows
      setStep(2); // Advance to mapping step
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  // Setup/Submit mapping
  const handleRunImport = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Validation check
      if (!isNewAdvisor && !selectedAdvisorId) {
        throw new Error('Please select an advisor or check "Create New Advisor".');
      }
      if (isNewAdvisor && (!newAdvisorName || !newAdvisorFirm)) {
        throw new Error('Please enter both Advisor Name and Firm Name.');
      }

      // Check if critical fields (Household Name / Primary Client) are mapped
      if (!mappings['householdName'] && !mappings['primaryClient']) {
        throw new Error('You must map at least "Household Name" or "Primary Client" to progress.');
      }

      // 2. Save Mapping Config if requested
      if (saveAsDefault) {
        await fetch('/api/crm-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crmType, mapping: mappings }),
        });
      }

      // 3. Post CSV text and config to backend parser
      const response = await fetch('/api/crm-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawCsv: rawCsvText,
          mapping: mappings,
          advisorId: isNewAdvisor ? null : selectedAdvisorId,
          newAdvisorName: isNewAdvisor ? newAdvisorName : null,
          newAdvisorFirm: isNewAdvisor ? newAdvisorFirm : null,
          crmType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'The CSV import processing failed.');
      }

      setImportSummary(data);
      setStep(3); // Advance to results page
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during import.');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field: string, headerVal: string) => {
    setMappings(prev => ({
      ...prev,
      [field]: headerVal
    }));
  };

  return (
    <div className="space-y-6">
      {/* Step Tracker Header */}
      <div className="flex items-center justify-between bg-[#1c2541]/40 border border-slate-800 p-4 rounded-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? 'bg-[#d4af37] text-[#0b1329]' : 'bg-slate-800 text-slate-400'}`}>1</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${step === 1 ? 'text-[#d4af37]' : 'text-slate-400'}`}>Upload Data</span>
          </div>
          <ChevronRight size={14} className="text-slate-600" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? 'bg-[#d4af37] text-[#0b1329]' : 'bg-slate-800 text-slate-400'}`}>2</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${step === 2 ? 'text-[#d4af37]' : 'text-slate-400'}`}>Column Mapping</span>
          </div>
          <ChevronRight size={14} className="text-slate-600" />
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${step >= 3 ? 'bg-[#d4af37] text-[#0b1329]' : 'bg-slate-800 text-slate-400'}`}>3</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${step === 3 ? 'text-[#d4af37]' : 'text-slate-400'}`}>Results</span>
          </div>
        </div>
        {step > 1 && step < 3 && (
          <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="text-xs uppercase tracking-wider font-bold">
            Back
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: UPLOAD DATA PANEL */}
      {step === 1 && (
        <Card className="border-slate-800/80 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <FileUp size={18} className="text-[#d4af37]" /> Step 1: Advisor Profile & File Upload
            </CardTitle>
            <CardDescription>Select target advisor engagement and upload your CSV export.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Advisor Selector */}
            <div className="p-4 rounded border border-slate-800 bg-slate-900/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#d4af37]">Advisor Destination</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewAdvisor}
                    onChange={(e) => setIsNewAdvisor(e.target.checked)}
                    className="accent-[#d4af37] rounded"
                  />
                  <span>Create New Advisor Profile</span>
                </label>
              </div>

              {!isNewAdvisor ? (
                <div>
                  <Label htmlFor="advisorSelect">Select Target Advisor</Label>
                  <Select
                    id="advisorSelect"
                    value={selectedAdvisorId}
                    onChange={(e) => setSelectedAdvisorId(e.target.value)}
                  >
                    <option value="">-- Select Existing Advisor --</option>
                    {advisors.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.firmName})</option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newAdvName">Advisor Full Name</Label>
                    <Input
                      id="newAdvName"
                      type="text"
                      placeholder="Sarah Jenkins"
                      value={newAdvisorName}
                      onChange={(e) => setNewAdvisorName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newAdvFirm">Advisor Firm Name</Label>
                    <Input
                      id="newAdvFirm"
                      type="text"
                      placeholder="Jenkins Wealth Advisors"
                      value={newAdvisorFirm}
                      onChange={(e) => setNewAdvisorFirm(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CRM Template Selection */}
            <div>
              <Label htmlFor="crmSelect">CRM Template Source</Label>
              <Select
                id="crmSelect"
                value={crmType}
                onChange={(e) => setCrmType(e.target.value)}
              >
                {CRM_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </div>

            {/* File Drag/Upload zone */}
            <div className="border-2 border-dashed border-slate-700/60 rounded-lg p-10 flex flex-col items-center justify-center bg-slate-950/20 text-center relative hover:border-[#d4af37]/50 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileUp size={42} className="text-slate-500 mb-3" />
              <p className="text-sm font-semibold text-slate-300">Drag & drop client export CSV file here</p>
              <p className="text-xs text-slate-500 mt-1">Or click to browse files (.csv)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: COLUMN MAPPING & PREVIEW */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Mappings Form Card */}
          <Card className="border-slate-800/80 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Columns size={18} className="text-[#d4af37]" /> Step 2: Map Columns for {crmType}
                </CardTitle>
                <CardDescription>Match CSV headers with the Know Your Book™ schema requirements.</CardDescription>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="accent-[#d4af37]"
                />
                <span>Save mappings for {crmType}</span>
              </label>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                {/* Column Mapping inputs */}
                <div className="p-5 md:col-span-2 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d4af37] mb-2">Column Fields</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                    {TARGET_FIELDS.map(f => (
                      <div key={f.key} className="space-y-1">
                        <Label htmlFor={`map-${f.key}`} className="flex items-center justify-between text-slate-300">
                          <span>{f.label}</span>
                          {(f.key === 'householdName' || f.key === 'primaryClient') && (
                            <span className="text-[9px] text-[#d4af37] border border-[#d4af37]/30 px-1 py-0.5 rounded uppercase font-bold">Required</span>
                          )}
                        </Label>
                        <Select
                          id={`map-${f.key}`}
                          value={mappings[f.key] || ''}
                          onChange={(e) => handleMappingChange(f.key, e.target.value)}
                          className="py-1 text-xs"
                        >
                          <option value="">-- Ignore Field --</option>
                          {headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </Select>
                        <span className="text-[10px] text-slate-500 block leading-tight">{f.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info and Run Actions */}
                <div className="p-5 flex flex-col justify-between bg-slate-950/20">
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d4af37]">Classification Rules</h3>
                    <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                      <li>Accounts are dynamically grouped under their family households.</li>
                      <li>Account numbers will be automatically ignored to protect security.</li>
                      <li>Estimated value will compile overall transition AUM metrics.</li>
                    </ul>
                  </div>

                  <div className="pt-6">
                    <Button
                      onClick={handleRunImport}
                      disabled={loading}
                      className="w-full uppercase font-extrabold tracking-wider"
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin mr-2" /> Importing & Grading...
                        </>
                      ) : (
                        'Run Import & Process'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* First 25 Rows Preview Table */}
          <Card className="border-slate-800 bg-[#0f172a]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-200 text-sm font-bold flex items-center gap-1.5">
                <BarChart2 size={16} className="text-[#d4af37]" /> CSV File Data Preview (First 25 Rows)
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse bg-slate-950/10">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-semibold">
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/20">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-1.5 text-slate-300 max-w-[200px] truncate">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: RESULTS SUMMARY SCREEN */}
      {step === 3 && importSummary && (
        <Card className="border-slate-800/80 shadow-2xl">
          <CardHeader className="text-center border-b border-slate-800 pb-5">
            <CheckCircle2 size={42} className="text-emerald-500 mx-auto mb-2" />
            <CardTitle className="text-slate-100">Import Complete</CardTitle>
            <CardDescription>
              Client database successfully parsed and indexed for advisor{' '}
              <span className="font-bold text-[#d4af37]">{importSummary.advisorName}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Top Row KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#1c2541]/40 border border-slate-800 p-4 rounded-lg">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Households Imported</span>
                <span className="text-2xl font-extrabold text-[#d4af37] block mt-1">{importSummary.stats.householdsImported}</span>
              </div>
              <div className="bg-[#1c2541]/40 border border-slate-800 p-4 rounded-lg">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Accounts Imported</span>
                <span className="text-2xl font-extrabold text-[#d4af37] block mt-1">{importSummary.stats.accountsImported}</span>
              </div>
              <div className="bg-[#1c2541]/40 border border-slate-800 p-4 rounded-lg">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Total Book AUM</span>
                <span className="text-2xl font-extrabold text-emerald-400 block mt-1">
                  ${importSummary.stats.estimatedAum >= 1000000 
                    ? `${(importSummary.stats.estimatedAum / 1000000).toFixed(1)}M` 
                    : importSummary.stats.estimatedAum.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#1c2541]/40 border border-slate-800 p-4 rounded-lg">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Annualized Revenue</span>
                <span className="text-2xl font-extrabold text-emerald-400 block mt-1">
                  ${importSummary.stats.estimatedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Types Breakdown */}
              <div className="p-4 rounded border border-slate-800 bg-slate-900/10 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d4af37] border-b border-slate-800 pb-1.5">
                  Account Classification Counts
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Trust Accounts</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.trustAccounts}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">IRA Accounts</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.iraAccounts}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Inherited IRA Accounts</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.inheritedIraAccounts}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Entity Accounts</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.entityAccounts}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Estate Accounts</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.estateAccounts}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Special Holdings (Alts/Annuities)</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.specialHoldings}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-rose-400 font-bold">Potential High Risk Accounts</span>
                    <Badge variant="critical" className="font-bold">{importSummary.stats.potentialHighRiskAccounts}</Badge>
                  </div>
                </div>
              </div>

              {/* Warnings and Conflicts Logs */}
              <div className="p-4 rounded border border-slate-800 bg-slate-900/10 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d4af37] border-b border-slate-800 pb-1.5">
                  Import Conflict Log
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Duplicate Households Merged</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.duplicateHouseholds}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Duplicate Accounts Skipped</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.duplicateAccounts}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Rows Skipped (Empty Client/HH)</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.skippedRows}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Missing Optional Fields</span>
                    <span className="font-bold text-slate-200">{importSummary.stats.missingRequired}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => router.push(`/advisors/${importSummary.advisorId}`)}
                className="uppercase font-extrabold tracking-wider"
              >
                Go to Advisor Workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
