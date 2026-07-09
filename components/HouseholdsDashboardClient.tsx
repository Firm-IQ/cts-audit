'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, Home, ChevronDown, ChevronUp, AlertTriangle, CheckSquare, Users, Database, FileText, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, RadialProgress, MetricCard } from '@/components/ui';

interface Advisor {
  id: string;
  name: string;
}

interface Requirement {
  id: string;
  name: string;
  category: string;
  critical: boolean;
  displayOrder: number;
  appliesToAccountTypes: string;
  required: boolean;
  weight: number;
}

interface AccountChecklistItem {
  id: string;
  accountId: string;
  itemKey: string;
  itemName: string;
  status: string;
  notes: string;
  verifiedBy: string;
  verifiedDate: string;
  requirementId?: string | null;
  requirement?: Requirement | null;
}

interface Account {
  id: string;
  householdId: string;
  name: string;
  type: string;
  value: number | null;
  custodian: string | null;
  registration: string | null;
  notes: string | null;
  readinessStatus: string;
  checklistItems: AccountChecklistItem[];
}

interface Household {
  id: string;
  advisorId: string;
  advisor: Advisor;
  name: string;
  primaryClientName: string;
  secondaryClientName: string | null;
  totalAum: number | null;
  revenue: number | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  assignedConsultant: string | null;
  notes: string | null;
  readinessStatus: string;
  accounts: Account[];
}

interface Finding {
  id: string;
  assessmentId: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  priority: string | null;
  owner: string;
  assignedTo: string | null;
  status: string;
  dueDate: string | null;
  resolutionNotes: string | null;
  householdId: string | null;
  accountId: string | null;
}

const criticalItemKeys = [
  'client_addressCurrent',
  'client_emailCurrent',
  'client_phoneCurrent',
  'kyc_riskTolerance',
  'kyc_investmentObjectives',
  'doc_advisoryAgreement',
  'doc_accountApplication',
  'doc_beneficiaryDesignation'
];



interface ActiveProfileRequirement {
  id: string;
  profileId: string;
  requirementId: string;
  state: string;
  overrideWeight: number | null;
  requirement: Requirement;
}

interface ActiveProfile {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  profileRequirements: ActiveProfileRequirement[];
}

export default function HouseholdsDashboardClient({
  initialHouseholds,
  initialFindings,
  userName,
  activeProfiles = []
}: {
  initialHouseholds: Household[];
  initialFindings: Finding[];
  userName: string;
  activeProfiles?: ActiveProfile[];
}) {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>(initialHouseholds);
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedHouseholds, setExpandedHouseholds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // Modals & form fields
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [activeChecklistAccount, setActiveChecklistAccount] = useState<Account | null>(null);
  const [checklistItemsState, setChecklistItemsState] = useState<AccountChecklistItem[]>([]);

  useEffect(() => {
    setHouseholds(initialHouseholds);
  }, [initialHouseholds]);

  useEffect(() => {
    setFindings(initialFindings);
  }, [initialFindings]);

  // Scoring Helper Functions
  const getProfileRequirement = (custodian: string | null, requirementId: string | null) => {
    if (!requirementId || !activeProfiles) return null;
    let profile = null;
    if (custodian) {
      profile = activeProfiles.find(p => p.name.trim().toLowerCase() === custodian.trim().toLowerCase());
    }
    if (!profile) {
      profile = activeProfiles.find(p => p.name === 'CTS Master Requirements');
    }
    if (!profile) return null;
    return profile.profileRequirements.find(pr => pr.requirementId === requirementId);
  };

  const calculateAccountCompletion = (checklistItems: AccountChecklistItem[], custodian: string | null) => {
    if (!checklistItems || checklistItems.length === 0) return 0;

    let totalWeight = 0;
    let completedWeight = 0;

    checklistItems.forEach(item => {
      if (item.status === 'Not Applicable') return;

      const profileReq = getProfileRequirement(custodian, item.requirementId || null);
      if (profileReq && profileReq.state === 'Hidden') return;

      const weight = (profileReq && profileReq.overrideWeight !== null)
        ? profileReq.overrideWeight
        : (item.requirement?.weight ?? 1.0);

      totalWeight += weight;
      if (item.status === 'Present') {
        completedWeight += weight;
      }
    });

    if (totalWeight === 0) return 100;
    return Math.round((completedWeight / totalWeight) * 100);
  };

  const calculateAccountReadiness = (checklistItems: AccountChecklistItem[], custodian: string | null) => {
    if (!checklistItems || checklistItems.length === 0) return 0;
    const completion = calculateAccountCompletion(checklistItems, custodian);

    const missingCritical = checklistItems.filter(item => {
      if (item.status !== 'Missing') return false;

      const profileReq = getProfileRequirement(custodian, item.requirementId || null);
      if (profileReq && profileReq.state === 'Hidden') return false;
      if (profileReq && profileReq.state === 'Optional') return false; // Optional items are not critical

      const isCritical = item.requirement?.critical || criticalItemKeys.includes(item.itemKey);
      return isCritical;
    });

    const score = completion - (missingCritical.length * 15);
    return Math.max(0, Math.min(100, score));
  };

  const calculateHouseholdReadiness = (hh: Household) => {
    if (!hh.accounts || hh.accounts.length === 0) return 100;
    const total = hh.accounts.reduce((sum, acc) => sum + calculateAccountReadiness(acc.checklistItems, acc.custodian), 0);
    return Math.round(total / hh.accounts.length);
  };

  // Rollups & Metrics
  const parsedHouseholds = households.map(hh => ({
    ...hh,
    readinessScore: calculateHouseholdReadiness(hh)
  }));

  const totalHouseholds = parsedHouseholds.length;
  
  const allAccounts = households.flatMap(h => h.accounts);
  const totalAccounts = allAccounts.length;

  const transitionReadyAccounts = allAccounts.filter(acc => acc.readinessStatus === 'Ready').length;
  const needsCleanupAccounts = allAccounts.filter(acc => acc.readinessStatus === 'Needs Review' || acc.readinessStatus === 'Missing Items').length;
  
  const openFindingsCount = findings.filter(f => f.status === 'Open' || f.status === 'In Progress').length;
  const criticalFindingsCount = findings.filter(f => 
    (f.status === 'Open' || f.status === 'In Progress') && 
    (f.priority === 'High' || f.priority === 'Urgent' || f.severity === 'High' || f.severity === 'Critical')
  ).length;

  const totalCompletionRate = allAccounts.length > 0 
    ? Math.round(allAccounts.reduce((sum, acc) => sum + calculateAccountCompletion(acc.checklistItems, acc.custodian), 0) / allAccounts.length)
    : 100;

  // Filter Households list
  const filteredHouseholds = parsedHouseholds.filter((hh) => {
    const matchesSearch =
      hh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hh.primaryClientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hh.advisor.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || hh.readinessStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const toggleHouseholdExpanded = (hhId: string) => {
    setExpandedHouseholds(prev => ({
      ...prev,
      [hhId]: !prev[hhId]
    }));
  };

  // Checklist handlers
  const handleOpenChecklist = (acc: Account) => {
    setActiveChecklistAccount(acc);
    setChecklistItemsState(acc.checklistItems);
    setShowChecklistModal(true);
  };

  const handleUpdateChecklistItem = (itemKey: string, field: string, value: any) => {
    setChecklistItemsState(prev => prev.map(item => {
      if (item.itemKey === itemKey) {
        const updated = { ...item, [field]: value };
        if (field === 'status' && !updated.verifiedBy) {
          updated.verifiedBy = userName;
          updated.verifiedDate = new Date().toISOString().split('T')[0];
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSaveChecklist = async () => {
    if (!activeChecklistAccount) return;
    setLoading(true);
    try {
      const originalItems = activeChecklistAccount.checklistItems;
      const promises = checklistItemsState.map(item => {
        const original = originalItems.find(o => o.itemKey === item.itemKey);
        const hasChanged = !original || 
          original.status !== item.status || 
          original.notes !== item.notes ||
          original.verifiedBy !== item.verifiedBy ||
          original.verifiedDate !== item.verifiedDate;

        if (hasChanged) {
          return fetch(`/api/checklist-items/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: item.status,
              notes: item.notes,
              verifiedBy: item.verifiedBy,
              verifiedDate: item.verifiedDate
            })
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to update checklist item ${item.itemName}`);
            return res.json();
          });
        }
        return Promise.resolve(null);
      });

      await Promise.all(promises);
      
      router.refresh();
      setShowChecklistModal(false);
    } catch (err: any) {
      alert(err.message || 'Error saving checklist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Know Your Book™ Households</h1>
          <p className="text-sm text-slate-400">Track and partition client household checklists, accounts, and overall onboarding risk metrics.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Households"
          value={totalHouseholds}
          icon={<Home size={20} className="text-[#d4af37]" />}
        />
        <MetricCard
          title="Mapped Accounts"
          value={totalAccounts}
          icon={<Database size={20} className="text-[#d4af37]" />}
        />
        <div className="bg-[#1c2541] border border-slate-700/60 rounded-lg p-5 flex items-center justify-between col-span-1">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Account Statuses
            </span>
            <div className="text-sm text-slate-300 font-bold flex flex-col mt-1 gap-1">
              <span className="text-emerald-400">Ready: {transitionReadyAccounts}</span>
              <span className="text-amber-400">Cleanup: {needsCleanupAccounts}</span>
            </div>
          </div>
          <div className="text-slate-500 bg-slate-900/40 p-2.5 rounded-md">
            <CheckSquare size={20} className="text-[#d4af37]" />
          </div>
        </div>
        <div className="bg-[#1c2541] border border-slate-700/60 rounded-lg p-5 flex items-center justify-between col-span-1">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Checklist Findings
            </span>
            <div className="text-sm text-slate-300 font-bold flex flex-col mt-1 gap-1">
              <span className="text-rose-400">Critical: {criticalFindingsCount}</span>
              <span className="text-slate-400">Total Open: {openFindingsCount}</span>
            </div>
          </div>
          <div className="text-slate-500 bg-slate-900/40 p-2.5 rounded-md">
            <AlertTriangle size={20} className="text-[#d4af37]" />
          </div>
        </div>
      </div>

      {/* Main Benchmarking Score & Guidelines Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radial Progress Packet Rollup */}
        <Card className="lg:col-span-1 flex flex-col items-center justify-center py-6">
          <CardHeader className="text-center w-full border-none">
            <CardTitle>Global Book Completion</CardTitle>
            <CardDescription>Average packet checklist completion percentage across all advisor accounts.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            <RadialProgress value={totalCompletionRate} size={150} strokeWidth={12} />
          </CardContent>
        </Card>

        {/* Guidelines */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Household Readiness Thresholds</CardTitle>
            <CardDescription>Readiness levels rolled up from account checklists.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/20">
              <h4 className="font-bold text-emerald-400 uppercase tracking-wide">Ready (80 - 100 Score)</h4>
              <p className="text-slate-400 mt-1">Household documentation and signatures are present. Core critical parameters validated. Low compliance risk.</p>
            </div>
            <div className="p-3 rounded bg-amber-950/20 border border-amber-500/20">
              <h4 className="font-bold text-amber-400 uppercase tracking-wide">Minor Cleanup (60 - 79 Score)</h4>
              <p className="text-slate-400 mt-1">Gaps in non-critical signatures or minor CRM updates outstanding. Transition can proceed with active remediation.</p>
            </div>
            <div className="p-3 rounded bg-orange-950/20 border border-orange-500/20">
              <h4 className="font-bold text-orange-400 uppercase tracking-wide">Significant Cleanup (40 - 59 Score)</h4>
              <p className="text-slate-400 mt-1">Missing critical items like KYC or advisory agreement documents. Legal and operations staff review required.</p>
            </div>
            <div className="p-3 rounded bg-rose-950/20 border border-rose-500/20">
              <h4 className="font-bold text-rose-400 uppercase tracking-wide">Not Ready (0 - 39 Score)</h4>
              <p className="text-slate-400 mt-1">Severe lack of documentation or crucial entity certifications. Capped timeline transition holds.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Households Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Households Book Directory</CardTitle>
              <CardDescription>Search and manage client households and account transition packet checklists.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  placeholder="Search household, advisor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full bg-[#131b2e] border border-slate-700/80 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#1c2541] border border-slate-700/60 text-slate-200 text-xs py-1 h-9 rounded px-2.5 focus:outline-none sm:w-44"
              >
                <option value="All">All Statuses</option>
                <option value="Ready">Ready</option>
                <option value="Minor Cleanup">Minor Cleanup</option>
                <option value="Significant Cleanup">Significant Cleanup</option>
                <option value="Not Ready">Not Ready</option>
                <option value="Not Reviewed">Not Reviewed</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {filteredHouseholds.length > 0 ? (
            filteredHouseholds.map((hh) => {
              const isExpanded = expandedHouseholds[hh.id];
              
              let statusBadgeVariant: 'ready' | 'advisory' | 'critical' | 'neutral' = 'neutral';
              if (hh.readinessStatus === 'Ready') statusBadgeVariant = 'ready';
              else if (hh.readinessStatus === 'Minor Cleanup') statusBadgeVariant = 'advisory';
              else if (hh.readinessStatus === 'Significant Cleanup') statusBadgeVariant = 'advisory';
              else if (hh.readinessStatus === 'Not Ready') statusBadgeVariant = 'critical';

              const hhReadinessScore = calculateHouseholdReadiness(hh);
              let ratingClass = 'text-rose-400';
              if (hhReadinessScore >= 80) ratingClass = 'text-emerald-400';
              else if (hhReadinessScore >= 60) ratingClass = 'text-amber-400';
              else if (hhReadinessScore >= 40) ratingClass = 'text-orange-400';

              return (
                <div key={hh.id} className="border border-slate-700/60 rounded-lg overflow-hidden bg-slate-900/20">
                  {/* Household Header */}
                  <div 
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-900/40 hover:bg-slate-900/60 transition-colors cursor-pointer select-none gap-4" 
                    onClick={() => toggleHouseholdExpanded(hh.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                      <div>
                        <span className="font-bold text-slate-100 text-base">{hh.name}</span>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          Advisor: <span className="text-slate-300 font-semibold">{hh.advisor.name}</span> | Primary: {hh.primaryClientName}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3" onClick={e => e.stopPropagation()}>
                      <div className="text-center px-3 border-r border-slate-800">
                        <span className={`text-base font-extrabold ${ratingClass}`}>{hhReadinessScore}%</span>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Readiness</span>
                      </div>
                      <Badge variant="neutral" className="bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        AUM: {hh.totalAum !== null ? `$${hh.totalAum}M` : 'N/A'}
                      </Badge>
                      <Badge variant="neutral" className="bg-slate-800 text-[#d4af37] border border-[#d4af37]/35 font-semibold">
                        Rev: {hh.revenue !== null ? `$${hh.revenue.toLocaleString()}` : 'N/A'}
                      </Badge>
                      <Badge variant={statusBadgeVariant} className="font-bold uppercase tracking-wider text-[10px]">
                        {hh.readinessStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Expanded Accounts list */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/60 p-4 bg-slate-900/10">
                      {/* Details & Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
                        <div className="bg-[#1c2541]/40 p-3 rounded border border-slate-800">
                          <span className="text-slate-500 block uppercase tracking-wider font-bold mb-1">Contact Info</span>
                          {hh.email && <div className="text-slate-300 mt-1">Email: <span className="text-slate-100">{hh.email}</span></div>}
                          {hh.phone && <div className="text-slate-300 mt-1">Phone: <span className="text-slate-100">{hh.phone}</span></div>}
                          {hh.address && <div className="text-slate-300 mt-1">Address: <span className="text-slate-100">{hh.address}</span></div>}
                          {hh.assignedConsultant && <div className="text-slate-300 mt-2 border-t border-slate-800 pt-1.5">CTS Consultant: <span className="text-[#d4af37] font-semibold">{hh.assignedConsultant}</span></div>}
                        </div>
                        <div className="md:col-span-2 bg-[#1c2541]/40 p-3 rounded border border-slate-800">
                          <span className="text-slate-500 block uppercase tracking-wider font-bold mb-1">Household Notes</span>
                          <p className="text-slate-300 mt-1 whitespace-pre-line">{hh.notes || 'No notes for this household.'}</p>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider mb-2.5">Accounts ({hh.accounts.length})</h4>
                      
                      {hh.accounts.length > 0 ? (
                        <div className="overflow-x-auto rounded border border-slate-800">
                          <table className="w-full text-xs text-left border-collapse bg-slate-950/20">
                            <thead>
                              <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-medium">
                                <th className="px-4 py-2.5">Account Name</th>
                                <th className="px-4 py-2.5">Type</th>
                                <th className="px-4 py-2.5">Value</th>
                                <th className="px-4 py-2.5">Custodian</th>
                                <th className="px-4 py-2.5">Registration</th>
                                <th className="px-4 py-2.5">Packet Score</th>
                                <th className="px-4 py-2.5">Readiness</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {hh.accounts.map((acc) => {
                                let accBadgeVariant: 'ready' | 'advisory' | 'critical' | 'neutral' = 'neutral';
                                if (acc.readinessStatus === 'Ready') accBadgeVariant = 'ready';
                                else if (acc.readinessStatus === 'Needs Review') accBadgeVariant = 'advisory';
                                else if (acc.readinessStatus === 'Missing Items') accBadgeVariant = 'critical';
                                else if (acc.readinessStatus === 'Not Ready') accBadgeVariant = 'critical';

                                const accComp = calculateAccountCompletion(acc.checklistItems, acc.custodian);

                                return (
                                  <tr key={acc.id} className="hover:bg-slate-800/10 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-slate-200">{acc.name}</td>
                                    <td className="px-4 py-3 text-slate-300">{acc.type}</td>
                                    <td className="px-4 py-3 text-slate-300 font-medium">
                                      {acc.value !== null ? `$${acc.value.toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{acc.custodian || '—'}</td>
                                    <td className="px-4 py-3 text-slate-400">{acc.registration || '—'}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-300">{accComp}%</td>
                                    <td className="px-4 py-3">
                                      <Badge variant={accBadgeVariant} className="text-[9px] font-bold py-0.5 px-1.5 uppercase">
                                        {acc.readinessStatus}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={() => handleOpenChecklist(acc)} 
                                        className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 border-slate-700/50 hover:bg-slate-800"
                                      >
                                        Checklist
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-500 italic bg-slate-900/10 rounded border border-dashed border-slate-800 text-[11px]">
                          No accounts configured yet for this household.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-500 italic border border-dashed border-slate-800 rounded">
              No client households matching filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* CATEGORIZED TRANSITION CHECKLIST MODAL */}
      {showChecklistModal && activeChecklistAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh]">
            <CardHeader className="shrink-0">
              <CardTitle>Transition Packet Checklist</CardTitle>
              <CardDescription>
                Account: <span className="font-bold text-slate-100">{activeChecklistAccount.name}</span> | Type: {activeChecklistAccount.type} | Custodian: {activeChecklistAccount.custodian || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto p-6 space-y-6 flex-1 pr-4">
              {(() => {
                const categoryOrder = [
                  'Client Information',
                  'KYC',
                  'Banking',
                  'Account Documents',
                  'Trust Accounts',
                  'Entity Accounts',
                  'Estate Accounts',
                  'Powers',
                  'Retirement',
                  'Special Holdings',
                  'Other'
                ];

                const groupedItems: Record<string, typeof checklistItemsState> = {};
                checklistItemsState.forEach(item => {
                  const category = item.requirement?.category || 'Other';
                  if (!groupedItems[category]) {
                    groupedItems[category] = [];
                  }
                  groupedItems[category].push(item);
                });

                Object.keys(groupedItems).forEach(cat => {
                  groupedItems[cat].sort((a, b) => (a.requirement?.displayOrder ?? 0) - (b.requirement?.displayOrder ?? 0));
                });

                const activeCategories = categoryOrder.filter(cat => groupedItems[cat] && groupedItems[cat].length > 0);
                Object.keys(groupedItems).forEach(cat => {
                  if (!categoryOrder.includes(cat) && groupedItems[cat] && groupedItems[cat].length > 0) {
                    activeCategories.push(cat);
                  }
                });

                return activeCategories.map((categoryName) => {
                  const categoryItems = groupedItems[categoryName];
                  return (
                    <div key={categoryName} className="space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#d4af37] border-b border-slate-700/50 pb-1">
                        {categoryName}
                      </h3>
                      <div className="space-y-2">
                        {categoryItems.map((item) => {
                          const isCritical = item.requirement?.critical || criticalItemKeys.includes(item.itemKey);
                          return (
                            <div key={item.id} className="p-3 rounded-md border border-slate-800/80 bg-slate-900/25 flex flex-col gap-2.5">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <span className="font-bold text-xs text-slate-200">
                                  {item.itemName} {isCritical && <span className="text-rose-500 font-extrabold text-[10px] ml-1 bg-rose-950/30 px-1 py-0.5 rounded border border-rose-500/20">CRITICAL</span>}
                                </span>
                                <select
                                  value={item.status}
                                  onChange={e => handleUpdateChecklistItem(item.itemKey, 'status', e.target.value)}
                                  className="bg-[#0b1329] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37] w-full sm:w-40"
                                >
                                  <option value="Present">Present</option>
                                  <option value="Missing">Missing</option>
                                  <option value="Needs Review">Needs Review</option>
                                  <option value="Not Applicable">Not Applicable</option>
                                </select>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2">
                                  <input
                                    type="text"
                                    placeholder="Notes / Comments..."
                                    value={item.notes}
                                    onChange={e => handleUpdateChecklistItem(item.itemKey, 'notes', e.target.value)}
                                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Verified By"
                                    value={item.verifiedBy}
                                    onChange={e => handleUpdateChecklistItem(item.itemKey, 'verifiedBy', e.target.value)}
                                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-1.5 text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
                                  />
                                  <input
                                    type="date"
                                    value={item.verifiedDate}
                                    onChange={e => handleUpdateChecklistItem(item.itemKey, 'verifiedDate', e.target.value)}
                                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-2 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-[#d4af37]"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </CardContent>
            <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex justify-end gap-3 shrink-0">
              <Button type="button" variant="secondary" onClick={() => setShowChecklistModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChecklist} disabled={loading}>
                {loading ? 'Saving...' : 'Save Checklist'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
