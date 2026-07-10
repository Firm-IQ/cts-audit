'use client';

import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Clock, 
  TrendingUp, 
  CheckSquare, 
  AlertTriangle, 
  Search, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Building,
  User,
  Shield,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';

interface LiveReportClientProps {
  advisor: {
    id: string;
    name: string;
    firmName: string;
    currentCustodian: string | null;
    futureCustodian: string | null;
    businessModel: string;
    protocolStatus: string;
    totalAum: number | null;
    annualRevenue: number | null;
    households: number | null;
    accounts: number | null;
    staffCount: number | null;
    crm: string | null;
    initialScore: number;
  };
  assessment: {
    id: string;
    notes: string;
    overallReadinessScore: number;
    clientDataScore: number;
    kycDocumentationScore: number;
    transferComplexityScoreVal: number;
    operationalScore: number;
    complianceProtocolScore: number;
    communicationScore: number;
    updatedAt: Date | string;
    createdAt: Date | string;
    lastUpdatedBy: string;
    currentPhase: string;
  } | null;
  households: Array<{
    id: string;
    name: string;
    totalAum: number | null;
    primaryClientName: string | null;
    readinessStatus: string;
    notes?: string | null;
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      value: number | null;
      readinessStatus: string;
      registration: string;
      custodian?: string | null;
      notes?: string | null;
      checklistItems: Array<{
        id: string;
        itemName: string;
        status: string;
        notes: string;
        verifiedDate: string;
        critical: boolean;
        category: string;
      }>;
    }>;
  }>;
  findings: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    recommendation: string;
    dueDate: string | null;
    assignedTo: string | null;
    householdName: string | null;
    accountName: string | null;
    accountType: string | null;
  }>;
  notes: Array<{
    id: string;
    noteType: string;
    noteBody: string;
    createdAt: string;
    createdByFullName: string;
    householdId: string | null;
    accountId: string | null;
    findingId: string | null;
    checklistItemId: string | null;
  }>;
  activities: Array<{
    id: string;
    action: string;
    objectAffected: string;
    description: string;
    previousValue: string | null;
    newValue: string | null;
    createdAt: string;
    createdByUserFullName: string;
  }>;
  daysSinceLastUpdate: number;
  progressSummary: string;
}

export default function LiveReportClient({
  advisor,
  assessment,
  households,
  findings,
  notes = [],
  activities = [],
  daysSinceLastUpdate = 0,
  progressSummary = ''
}: LiveReportClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedHouseholds, setExpandedHouseholds] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState('All');

  const isAssessmentEvaluated = useMemo(() => {
    return households.some(hh =>
      hh.accounts.some(acc =>
        acc.checklistItems?.some(item => ['Present', 'Missing', 'Needs Review'].includes(item.status))
      )
    );
  }, [households]);

  const crmStats = useMemo(() => {
    const custodiansMap: Record<string, number> = {};
    let advisoryCount = 0;
    let brokerageCount = 0;
    let trustCount = 0;
    let inheritedIraCount = 0;
    let entityCount = 0;
    let retirementCount = 0;
    let altCount = 0;
    let annuityCount = 0;
    let individualCount = 0;
    let jointCount = 0;
    let achLinkCount = 0;
    let rmdAgeCount = 0;

    households.forEach(hh => {
      hh.accounts.forEach(acc => {
        const cust = (acc.custodian || 'Unknown').trim();
        custodiansMap[cust] = (custodiansMap[cust] || 0) + 1;

        const accType = (acc.type || '').toLowerCase();
        const accReg = (acc.registration || '').toLowerCase();
        const accName = (acc.name || '').toLowerCase();
        const accNotes = (acc.notes || '').toLowerCase();
        const hhNotes = (hh.notes || '').toLowerCase();
        const allNotes = accNotes + ' ' + hhNotes;

        if (accType.includes('trust')) trustCount++;
        else if (accType.includes('inherited') && accType.includes('ira')) inheritedIraCount++;
        else if (accType.includes('entity')) entityCount++;
        else if (accType.includes('annuity')) annuityCount++;
        else if (accType.includes('alternative') || accType.includes('alt')) altCount++;
        else if (accType.includes('individual')) individualCount++;
        else if (accType.includes('joint')) jointCount++;

        if (['ira', 'roth', 'sep', 'simple', '401', '403', 'keogh', 'retirement'].some(term => accType.includes(term))) {
          retirementCount++;
        }

        const isAdvisory = [allNotes, accReg, accName, accType].some(s => 
          s.includes('advisory') || s.includes('managed') || s.includes('fee-based') || 
          s.includes('fee based') || s.includes('wrap') || s.includes('ria') || 
          s.includes('discretionary') || s.includes('fiduciary') || s.includes('billing')
        );
        if (isAdvisory) advisoryCount++;
        else brokerageCount++;

        const hasAch = [allNotes, accReg, accName].some(s =>
          s.includes('ach') || s.includes('banking') || s.includes('direct deposit') || s.includes('eft')
        );
        if (hasAch) achLinkCount++;

        const hasRmdOrAge = allNotes.includes('age 73') || allNotes.includes('age 74') || 
                            allNotes.includes('age 75') || allNotes.includes('age 76') ||
                            allNotes.includes('age 77') || allNotes.includes('age 78') ||
                            allNotes.includes('age 79') || allNotes.includes('age 8') ||
                            allNotes.includes('born 195') || allNotes.includes('born 194') ||
                            allNotes.includes('born 193') || allNotes.includes('rmd') || 
                            allNotes.includes('required minimum');
        if (hasRmdOrAge) rmdAgeCount++;
      });
    });

    const custodiansList = Object.entries(custodiansMap).map(([name, count]) => ({ name, count }));

    // Inferred requirements
    const inferred = [];
    if (trustCount > 0) inferred.push({ title: 'Trust Documentation Required', desc: `Implied by ${trustCount} Trust accounts under correct fiduciary authority.` });
    if (inheritedIraCount > 0) inferred.push({ title: 'Inherited IRA Documentation Required', desc: `Implied by ${inheritedIraCount} Inherited IRAs (requires beneficiary distribution structures).` });
    if (entityCount > 0) inferred.push({ title: 'Entity Authority Required', desc: `Implied by ${entityCount} corporate/LLC entity accounts.` });
    if (advisoryCount > 0) inferred.push({ title: 'Advisory Agreement Required', desc: `Implied by ${advisoryCount} fee-based/managed accounts.` });
    if (achLinkCount > 0) inferred.push({ title: 'ACH Documentation Recommended', desc: `Implied by ${achLinkCount} accounts with noted bank transfers/linkages.` });
    if (retirementCount > 0) inferred.push({ title: 'Beneficiary Review Required', desc: `Implied by ${retirementCount} tax-advantaged retirement accounts.` });
    if (altCount > 0) inferred.push({ title: 'Alternative Asset Clearing Review Required', desc: `Implied by ${altCount} alternative investments.` });
    if (annuityCount > 0) inferred.push({ title: 'Annuity Carrier Verification Required', desc: `Implied by ${annuityCount} variable/fixed insurance contracts.` });
    if (rmdAgeCount > 0) inferred.push({ title: 'RMD Schedule Review Recommended', desc: `Implied by ${rmdAgeCount} clients subject to annual distribution rules.` });

    return {
      custodians: custodiansList,
      advisoryCount,
      brokerageCount,
      trustCount,
      inheritedIraCount,
      entityCount,
      retirementCount,
      altCount,
      annuityCount,
      individualCount,
      jointCount,
      achLinkCount,
      rmdAgeCount,
      inferred
    };
  }, [households]);

  // Parse Assessment Status/Stage
  const assessmentStatus = useMemo(() => {
    if (!assessment) return 'Pending';
    const notesStr = assessment.notes || '';
    const match = notesStr.match(/Stage:\s*([^\n]+)/);
    return match ? match[1].trim() : 'In Progress';
  }, [assessment]);

  // Calculate overall metrics
  const totalAum = useMemo(() => {
    return households.reduce((sum, h) => sum + (h.totalAum || 0), 0);
  }, [households]);

  const totalAccounts = useMemo(() => {
    return households.reduce((sum, h) => sum + h.accounts.length, 0);
  }, [households]);

  const readinessBreakdown = useMemo(() => {
    let ready = 0;
    let cleanup = 0;
    let blocked = 0;

    households.forEach(h => {
      if (h.readinessStatus === 'Ready') ready++;
      else if (h.readinessStatus === 'Not Ready') blocked++;
      else cleanup++;
    });

    return { ready, cleanup, blocked };
  }, [households]);

  const accountPacketCompletion = useMemo(() => {
    if (totalAccounts === 0) return { complete: 0, percent: 0 };
    const complete = households.reduce((sum, h) => 
      sum + h.accounts.filter(a => a.readinessStatus === 'Ready').length, 0
    );
    return {
      complete,
      percent: Math.round((complete / totalAccounts) * 100)
    };
  }, [households, totalAccounts]);

  const findingsStats = useMemo(() => {
    let critical = 0;
    let high = 0;
    let moderate = 0;
    let low = 0;

    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    let verified = 0;

    findings.forEach(f => {
      if (f.severity === 'Critical') critical++;
      else if (f.severity === 'High') high++;
      else if (f.severity === 'Moderate') moderate++;
      else if (f.severity === 'Low') low++;

      if (f.status === 'Open') open++;
      else if (f.status === 'In Progress') inProgress++;
      else if (f.status === 'Resolved') resolved++;
      else verified++;
    });

    return { critical, high, moderate, low, open, inProgress, resolved, verified };
  }, [findings]);

  // Group outstanding checklist items by category
  const missingPaperworkGroups = useMemo(() => {
    const groups: Record<string, { count: number; items: any[] }> = {
      'Banking and ACH': { count: 0, items: [] },
      'Trust': { count: 0, items: [] },
      'Estate': { count: 0, items: [] },
      'Retirement and inherited IRA': { count: 0, items: [] },
      'Beneficiary': { count: 0, items: [] },
      'Entity': { count: 0, items: [] },
      'Powers of attorney': { count: 0, items: [] },
      'Advisory agreements': { count: 0, items: [] },
      'Custodial transfer': { count: 0, items: [] },
      'Alternative assets': { count: 0, items: [] },
      'Insurance / annuity': { count: 0, items: [] },
      'Other': { count: 0, items: [] }
    };

    households.forEach(h => {
      h.accounts.forEach(a => {
        a.checklistItems.forEach(item => {
          if (item.status === 'Missing' || item.status === 'Needs Review') {
            let groupName = 'Other';
            const name = item.itemName.toLowerCase();
            const cat = item.category.toLowerCase();

            if (name.includes('ach') || name.includes('banking') || name.includes('voided') || name.includes('standing')) {
              groupName = 'Banking and ACH';
            } else if (name.includes('trust') || cat.includes('trust')) {
              groupName = 'Trust';
            } else if (name.includes('estate') || name.includes('death') || name.includes('executor') || cat.includes('estate')) {
              groupName = 'Estate';
            } else if (name.includes('ira') || name.includes('retirement') || cat.includes('retirement')) {
              if (name.includes('beneficiary')) {
                groupName = 'Beneficiary';
              } else {
                groupName = 'Retirement and inherited IRA';
              }
            } else if (name.includes('beneficiary') || name.includes('designation')) {
              groupName = 'Beneficiary';
            } else if (name.includes('entity') || name.includes('corporate') || name.includes('resolution') || name.includes('operating') || name.includes('ein') || cat.includes('entity')) {
              groupName = 'Entity';
            } else if (name.includes('poa') || name.includes('power') || name.includes('guardianship')) {
              groupName = 'Powers of attorney';
            } else if (name.includes('advisory') || name.includes('agreement') || name.includes('fee schedule')) {
              groupName = 'Advisory agreements';
            } else if (name.includes('transfer') || name.includes('custodial') || name.includes('restriction')) {
              groupName = 'Custodial transfer';
            } else if (name.includes('alt') || name.includes('alternative') || name.includes('holdings') || name.includes('private')) {
              groupName = 'Alternative assets';
            } else if (name.includes('annuity') || name.includes('insurance') || name.includes('policy')) {
              groupName = 'Insurance / annuity';
            }

            groups[groupName].count++;
            groups[groupName].items.push({
              householdName: h.name,
              accountName: a.name,
              accountType: a.type,
              itemName: item.itemName,
              status: item.status,
              critical: item.critical,
              notes: item.notes
            });
          }
        });
      });
    });

    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .filter(g => g.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [households]);

  // Priority Action Plan (outstanding critical checklist items or critical findings)
  const priorityActions = useMemo(() => {
    const list: any[] = [];

    // Add outstanding critical checklist items
    households.forEach(h => {
      h.accounts.forEach(a => {
        a.checklistItems.forEach(item => {
          if ((item.status === 'Missing' || item.status === 'Needs Review') && item.critical) {
            list.push({
              household: h.name,
              accountType: a.type,
              item: item.itemName,
              severity: 'Critical',
              responsibleParty: 'Advisor',
              status: item.status,
              notes: item.notes || 'Awaiting advisor upload'
            });
          }
        });
      });
    });

    // Add findings that are Critical or High
    findings.forEach(f => {
      if ((f.status === 'Open' || f.status === 'In Progress') && (f.severity === 'Critical' || f.severity === 'High')) {
        // Prevent duplicates if already added via checklist
        const exists = list.some(item => item.household === f.householdName && item.item === f.title);
        if (!exists) {
          list.push({
            household: f.householdName || 'Practice Level',
            accountType: f.accountType || 'All Accounts',
            item: f.title,
            severity: f.severity,
            responsibleParty: f.assignedTo || 'Advisor',
            status: f.status,
            notes: f.description
          });
        }
      }
    });

    return list
      .sort((a, b) => {
        if (a.severity === 'Critical' && b.severity !== 'Critical') return -1;
        if (a.severity !== 'Critical' && b.severity === 'Critical') return 1;
        return 0;
      })
      .slice(0, 10); // Show top 10 actions
  }, [households, findings]);

  // Recent activity logs
  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    
    // Add activities from resolved findings
    findings.forEach(f => {
      if (f.status === 'Resolved' || f.status === 'Verified') {
        activities.push({
          type: 'finding_resolved',
          title: `Finding Resolved: ${f.title}`,
          description: `Action completed for ${f.householdName || 'Practice'}.`,
          timestamp: new Date().toLocaleDateString(),
          icon: <CheckCircle2 size={14} className="text-emerald-400" />
        });
      }
    });

    // Add standard timeline items based on data state
    if (accountPacketCompletion.percent > 50) {
      activities.push({
        type: 'score_improved',
        title: 'Transition Readiness Score Improved',
        description: `Overall index increased to ${assessment?.overallReadinessScore || 0}% after document validation.`,
        timestamp: new Date().toLocaleDateString(),
        icon: <TrendingUp size={14} className="text-[#d4af37]" />
      });
    }

    // Add simulated/recent document checks
    let verifiedCount = 0;
    households.forEach(h => {
      h.accounts.forEach(a => {
        a.checklistItems.forEach(item => {
          if (item.status === 'Present' && verifiedCount < 3) {
            activities.push({
              type: 'document_verified',
              title: `Document Verified: ${item.itemName}`,
              description: `Household: ${h.name} | Account: ${a.name}`,
              timestamp: item.verifiedDate || new Date().toLocaleDateString(),
              icon: <FileText size={14} className="text-blue-400" />
            });
            verifiedCount++;
          }
        });
      });
    });

    return activities.slice(0, 8); // Top 8 items
  }, [findings, households, assessment, accountPacketCompletion]);

  // radar chart data
  const chartData = useMemo(() => {
    if (!assessment) return [];
    return [
      { subject: 'Client Data', score: assessment.clientDataScore, fullMark: 100 },
      { subject: 'KYC & Doc', score: assessment.kycDocumentationScore, fullMark: 100 },
      { subject: 'Transfer Complex', score: assessment.transferComplexityScoreVal, fullMark: 100 },
      { subject: 'Operations', score: assessment.operationalScore, fullMark: 100 },
      { subject: 'Compliance', score: assessment.complianceProtocolScore, fullMark: 100 },
      { subject: 'Communication', score: assessment.communicationScore, fullMark: 100 }
    ];
  }, [assessment]);

  // progress history chart data
  const progressData = useMemo(() => {
    if (!assessment) return [];
    return [
      { name: 'Initial', Score: advisor.initialScore, PacketCompletion: 0 },
      { name: 'Current', Score: assessment.overallReadinessScore, PacketCompletion: accountPacketCompletion.percent }
    ];
  }, [assessment, advisor, accountPacketCompletion]);

  // Filtered households for the table
  const filteredHouseholds = useMemo(() => {
    return households.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (h.primaryClientName && h.primaryClientName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || h.readinessStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [households, searchTerm, statusFilter]);

  const toggleHousehold = (id: string) => {
    setExpandedHouseholds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Ready':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Minor Cleanup':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Significant Cleanup':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Not Ready':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/20 font-bold';
      case 'High':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Moderate':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Low':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  // Short current-readiness summary based on score
  const readinessSummary = useMemo(() => {
    if (!assessment) return 'Assessment pending completion.';
    const score = assessment.overallReadinessScore;
    if (score >= 80) {
      return 'Bennett Wealth Partners is in an excellent position to begin transitioning. Client data quality and custodial protocol alignment are highly mature. Focus on resolving the remaining critical trust account paperwork to secure a frictionless migration.';
    } else if (score >= 60) {
      return 'Bennett Wealth Partners shows moderate transition readiness. Key documentation gaps exist, particularly around estate and trust account packets. Address high-priority paperwork in the action plan below to prevent transfer delays.';
    } else {
      return 'Bennett Wealth Partners requires significant remediation before transition. Critical deficiencies in KYC update frequencies, missing trust certifications, and operational workflows present major compliance and transition risks.';
    }
  }, [assessment]);

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col font-sans antialiased">
      {/* Brand Header */}
      <header className="border-b border-slate-800 bg-[#0e1731] py-5 px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#d4af37]/15 p-2 rounded border border-[#d4af37]/20">
              <Shield className="text-[#d4af37]" size={24} />
            </div>
            <div>
              <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase">Continuity Transition Readiness</span>
              <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
                Know Your Book™ Live Audit
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-900/40 p-2.5 rounded border border-slate-800">
            <Clock size={14} className="text-[#d4af37]" />
            <span>Updated: {assessment ? new Date(assessment.updatedAt).toLocaleString() : 'N/A'}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        
        {/* REPORT METADATA HEADER */}
        {assessment && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-[#0e1731] border border-slate-800 p-4 rounded-xl shadow-lg text-xs">
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0 md:pr-4">
              <span className="text-slate-500 block uppercase tracking-wider font-extrabold mb-1">Assessment Started</span>
              <span className="text-slate-200 font-bold">
                {new Date(assessment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0 md:px-4">
              <span className="text-slate-500 block uppercase tracking-wider font-extrabold mb-1">Last Updated</span>
              <span className="text-slate-200 font-bold block">
                {new Date(assessment.updatedAt).toLocaleDateString()}
              </span>
              <span className="text-slate-500 text-[10px]">
                {new Date(assessment.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0 md:px-4">
              <span className="text-slate-500 block uppercase tracking-wider font-extrabold mb-1">Last Updated By</span>
              <span className="text-slate-200 font-bold">
                {assessment.lastUpdatedBy || 'System'}
              </span>
            </div>
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0 md:px-4">
              <span className="text-slate-500 block uppercase tracking-wider font-extrabold mb-1">Current Phase</span>
              <span className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/35 font-extrabold text-[9px] px-2 py-0.5 mt-0.5 rounded inline-block">
                {assessment.currentPhase || 'Initial Review'}
              </span>
            </div>
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0 md:px-4">
              <span className="text-slate-500 block uppercase tracking-wider font-extrabold mb-1">Days Since Update</span>
              <span className={`font-black text-sm mt-0.5 block ${daysSinceLastUpdate > 14 ? 'text-rose-400' : 'text-slate-200'}`}>
                {daysSinceLastUpdate} {daysSinceLastUpdate === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="md:col-span-1 md:pl-4 flex flex-col justify-center">
              <span className="text-slate-500 block uppercase tracking-wider font-extrabold mb-1">Progress Since Update</span>
              <span className="text-slate-300 font-medium text-[10px] leading-tight block">
                {progressSummary}
              </span>
            </div>
          </div>
        )}
        
        {/* EXECUTIVE SUMMARY */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-[#1c2541] to-[#141b31] border border-slate-700/50 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Advisor Practice</span>
                <h2 className="text-3xl font-black text-slate-100 mt-0.5">{advisor.name}</h2>
                <p className="text-[#d4af37] font-bold text-sm">{advisor.firmName}</p>
              </div>

              <hr className="border-slate-800/80" />

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Executive Summary</span>
                <p className="text-slate-300 text-sm leading-relaxed font-medium">
                  {readinessSummary}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-800/60 text-xs">
              <div>
                <span className="text-slate-500 block">Assessment Status:</span>
                <span className="text-slate-200 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse"></span>
                  {assessmentStatus}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Custodian Mix:</span>
                <span className="text-slate-200 font-bold block mt-0.5">
                  {advisor.currentCustodian || 'Fidelity'} → {advisor.futureCustodian || 'Schwab'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Business Model:</span>
                <span className="text-slate-200 font-bold block mt-0.5">{advisor.businessModel}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Protocol Access:</span>
                <span className={`font-bold block mt-0.5 ${advisor.protocolStatus === 'Yes' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {advisor.protocolStatus === 'Yes' ? 'Yes (Protocol)' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Know Your Book™ Index</span>
            <div className="relative flex items-center justify-center w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="#0e1731" strokeWidth="12" fill="transparent" />
                <circle cx="80" cy="80" r="70" stroke="#d4af37" strokeWidth="12" fill="transparent" 
                        strokeDasharray={2 * Math.PI * 70}
                        strokeDashoffset={2 * Math.PI * 70 * (1 - (isAssessmentEvaluated ? (assessment?.overallReadinessScore || 0) : 0) / 100)}
                        strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-extrabold text-slate-100">{isAssessmentEvaluated ? `${assessment?.overallReadinessScore || 0}%` : 'Pending'}</span>
                <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mt-0.5">Readiness</span>
              </div>
            </div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-800">
              {isAssessmentEvaluated 
                ? (assessment && assessment.overallReadinessScore >= 80 ? 'Gold Status' : 'Needs Action')
                : 'Assessment Pending Verification'}
            </div>
          </div>
        </section>

        {/* PROGRESS & CATEGORY BREAKDOWN OR CRM ASSESSMENT SUMMARY */}
        {!isAssessmentEvaluated ? (
          <section className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div>
                <h3 className="font-extrabold text-xl text-slate-100 flex items-center gap-2">
                  <Shield className="text-[#d4af37]" size={22} />
                  CRM Assessment Summary
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Transition baseline audit mapping verified data, inferred requirements, and unknown elements requiring validation.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-xs font-semibold text-slate-300">
                Status: <span className="text-[#d4af37] font-bold">Assessment Pending Verification</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category 1: What We Know */}
              <div className="bg-slate-900/25 border border-slate-800 p-5 rounded-lg space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="h-5 w-5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 text-xs font-bold flex items-center justify-center font-mono">1</span>
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs font-mono">1. Verified (From CRM)</h4>
                </div>
                <div className="space-y-3.5 text-xs text-slate-400">
                  <div>
                    <span className="block font-bold text-slate-300">Custodians Represented</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {crmStats.custodians.map((c, idx) => (
                        <span key={idx} className="bg-slate-900 border border-slate-800 text-[10px] font-bold px-2 py-0.5 rounded text-slate-200">
                          {c.name}: {c.count}
                        </span>
                      ))}
                      {crmStats.custodians.length === 0 && <span className="italic text-slate-500">None detected</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-medium">
                    <div>
                      <span className="block font-bold text-slate-300">Households</span>
                      <span className="text-slate-100 font-black text-sm block mt-0.5">{advisor.households || households.length}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-300">Accounts</span>
                      <span className="text-slate-100 font-black text-sm block mt-0.5">{advisor.accounts || households.reduce((sum, h) => sum + h.accounts.length, 0)}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-300">Book AUM</span>
                      <span className="text-slate-100 font-black text-sm block mt-0.5">${advisor.totalAum || 0}M</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-300">Annual Revenue</span>
                      <span className="text-slate-100 font-black text-sm block mt-0.5">${advisor.annualRevenue?.toLocaleString() || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <span className="block font-bold text-slate-300">Ownership Structures</span>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      {crmStats.trustCount > 0 && <div className="flex justify-between"><span>Trusts:</span> <span className="font-semibold text-slate-200">{crmStats.trustCount}</span></div>}
                      {crmStats.entityCount > 0 && <div className="flex justify-between"><span>Entities:</span> <span className="font-semibold text-slate-200">{crmStats.entityCount}</span></div>}
                      {crmStats.retirementCount > 0 && <div className="flex justify-between"><span>Retirement:</span> <span className="font-semibold text-slate-200">{crmStats.retirementCount}</span></div>}
                      {crmStats.individualCount > 0 && <div className="flex justify-between"><span>Individual:</span> <span className="font-semibold text-slate-200">{crmStats.individualCount}</span></div>}
                      {crmStats.jointCount > 0 && <div className="flex justify-between"><span>Joint:</span> <span className="font-semibold text-slate-200">{crmStats.jointCount}</span></div>}
                    </div>
                  </div>
                  <div className="space-y-1 bg-slate-950/20 p-2.5 rounded border border-slate-800/60 mt-2 text-[11px]">
                    <div className="flex justify-between">
                      <span>Advisory Accounts:</span>
                      <span className="font-extrabold text-emerald-400">{crmStats.advisoryCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Brokerage Accounts:</span>
                      <span className="font-bold text-slate-300">{crmStats.brokerageCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category 2: What We Inferred */}
              <div className="bg-slate-900/25 border border-slate-800 p-5 rounded-lg space-y-4 font-medium">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="h-5 w-5 rounded bg-amber-500/10 text-amber-400 border border-amber-400/20 text-xs font-bold flex items-center justify-center font-mono">2</span>
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs font-mono">2. Inferred (Implied)</h4>
                </div>
                <div className="space-y-3.5 text-xs">
                  {crmStats.inferred.map((inf, idx) => (
                    <div key={idx} className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80 space-y-1">
                      <span className="font-bold text-slate-200 text-[11px] block">{inf.title}</span>
                      <p className="text-[10px] text-slate-400 leading-normal">{inf.desc}</p>
                    </div>
                  ))}
                  {crmStats.inferred.length === 0 && (
                    <div className="text-center py-6 text-slate-500 italic">No transition requirements inferred.</div>
                  )}
                </div>
              </div>

              {/* Category 3: What Still Requires Verification */}
              <div className="bg-slate-900/25 border border-slate-800 p-5 rounded-lg space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="h-5 w-5 rounded bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 text-xs font-bold flex items-center justify-center font-mono">3</span>
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs font-mono">3. Unknown (To Verify)</h4>
                </div>
                <div className="space-y-3 text-xs text-slate-400">
                  <p className="text-[11px] text-slate-500 italic pb-1">
                    Critical questions the CRM cannot verify. Initialized as "Unknown" pending CTS document verification:
                  </p>
                  {[
                    { title: 'Trust documents on file', desc: 'Fiduciary setups and active signing trustees' },
                    { title: 'Signed advisory agreements', desc: 'Valid billing authorizations and disclosures' },
                    { title: 'Designated beneficiaries verified', desc: 'Primary and contingent beneficiaries designated' },
                    { title: 'Trusted Contact verified', desc: 'Senior client elder protections established' },
                    { title: 'Banking & ACH linkage documentation', desc: 'ACH direct links and authorizations validated' },
                    { title: 'Power of Attorney (POA)', desc: 'Valid POA signatures and signing boundaries' }
                  ].map((unk, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start bg-slate-950/20 p-2 rounded border border-slate-800/40">
                      <span className="text-[9px] px-1 py-0.5 rounded font-mono font-bold bg-slate-900 text-slate-500 shrink-0 uppercase">Unknown</span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-300 text-[11px] block">{unk.title}</span>
                        <p className="text-[10px] text-slate-500">{unk.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Category 4: Verified During Assessment Notice */}
            <div className="bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 rounded-lg flex items-start gap-3.5">
              <div className="p-2 rounded bg-[#d4af37]/10 shrink-0">
                <CheckCircle2 size={16} className="text-[#d4af37]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider font-mono">4. Verified During Assessment</h4>
                <p className="text-xs text-slate-400 leading-normal">
                  As the CTS team audits physical files, requirements shift from <span className="text-[#d4af37] font-semibold">Unknown</span> to <span className="text-emerald-400 font-semibold">Verified (Present)</span>, <span className="text-rose-400 font-semibold">Missing</span>, or <span className="text-amber-400 font-semibold">Needs Review</span>. Index scores recalculate dynamically.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <Layers size={18} className="text-[#d4af37]" />
                Readiness Performance Dimensions
              </h3>
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-1/2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={8} />
                      <Radar name="Score" dataKey="score" stroke="#d4af37" fill="#d4af37" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full md:w-1/2 grid grid-cols-1 gap-3.5 text-xs">
                  {[
                    { label: 'Client Data Quality', score: assessment?.clientDataScore, color: 'border-blue-500' },
                    { label: 'KYC & Documentation', score: assessment?.kycDocumentationScore, color: 'border-emerald-500' },
                    { label: 'Transfer Complexity', score: assessment?.transferComplexityScoreVal, color: 'border-yellow-500' },
                    { label: 'Operational Structure', score: assessment?.operationalScore, color: 'border-purple-500' },
                    { label: 'Compliance Protocol', score: assessment?.complianceProtocolScore, color: 'border-rose-500' },
                    { label: 'Client Communication', score: assessment?.communicationScore, color: 'border-[#d4af37]' }
                  ].map((item, i) => (
                    <div key={i} className={`p-3 bg-slate-900/35 rounded-lg border-l-4 ${item.color} border border-slate-800 flex justify-between items-center`}>
                      <span className="font-bold text-slate-300">{item.label}</span>
                      <span className="font-black text-slate-100 text-sm">{item.score || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl flex flex-col justify-between gap-6">
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <TrendingUp size={18} className="text-[#d4af37]" />
                Progress Over Time
              </h3>
              <div className="flex-1 min-h-[160px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                    <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="Score" stroke="#d4af37" strokeWidth={3} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="PacketCompletion" name="Packets Complete %" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80 text-center text-[10px]">
                <div>
                  <span className="text-slate-500 block">Initial Score</span>
                  <span className="text-slate-200 font-extrabold text-sm">{advisor.initialScore}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Score</span>
                  <span className="text-[#d4af37] font-extrabold text-sm">{assessment?.overallReadinessScore || 0}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Gain</span>
                  <span className="text-emerald-400 font-extrabold text-sm flex items-center justify-center">
                    +{Math.max(0, Math.round((assessment?.overallReadinessScore || 0) - advisor.initialScore))}%
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* BOOK OVERVIEW & FINDINGS METRICS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* BOOK OVERVIEW */}
          <div className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
              <Briefcase size={18} className="text-[#d4af37]" />
              Book of Business
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-900/45 border border-slate-800 p-4 rounded-xl">
                <span className="text-2xl font-black text-slate-100 block">{advisor.households || households.length}</span>
                <span className="text-[10px] text-slate-500 block font-bold uppercase mt-1">Households</span>
              </div>
              <div className="bg-slate-900/45 border border-slate-800 p-4 rounded-xl">
                <span className="text-2xl font-black text-slate-100 block">{advisor.accounts || totalAccounts}</span>
                <span className="text-[10px] text-slate-500 block font-bold uppercase mt-1">Accounts</span>
              </div>
              <div className="bg-slate-900/45 border border-slate-800 p-4 rounded-xl">
                <span className="text-xl font-black text-slate-100 block">${advisor.totalAum || (totalAum / 1000000).toFixed(1)}M</span>
                <span className="text-[10px] text-slate-500 block font-bold uppercase mt-1">AUM</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center bg-slate-900/20 p-2.5 rounded border border-slate-800/40">
                <span className="text-slate-400 font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Transition Ready Households
                </span>
                <span className="font-extrabold text-slate-200">{readinessBreakdown.ready}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-900/20 p-2.5 rounded border border-slate-800/40">
                <span className="text-slate-400 font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Households Needing Cleanup
                </span>
                <span className="font-extrabold text-slate-200">{readinessBreakdown.cleanup}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-900/20 p-2.5 rounded border border-slate-800/40">
                <span className="text-slate-400 font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Blocked Households
                </span>
                <span className="font-extrabold text-slate-200">{readinessBreakdown.blocked}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                <span>Account Packet Completion</span>
                <span className="text-blue-400">{accountPacketCompletion.percent}% ({accountPacketCompletion.complete}/{totalAccounts})</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/30">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${accountPacketCompletion.percent}%` }}></div>
              </div>
            </div>
          </div>

          {/* FINDINGS MATRIX */}
          <div className="lg:col-span-2 bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
              <AlertTriangle size={18} className="text-[#d4af37]" />
              Audit Findings & Gaps Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Severity Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Gaps by Severity</span>
                <div className="grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-rose-400 font-black text-xl">{findingsStats.critical}</span>
                    <span className="text-slate-400 font-bold mt-1">Critical Risks</span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-amber-400 font-black text-xl">{findingsStats.high}</span>
                    <span className="text-slate-400 font-bold mt-1">High Severity</span>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-blue-400 font-black text-xl">{findingsStats.moderate}</span>
                    <span className="text-slate-400 font-bold mt-1">Moderate</span>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700/45 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-300 font-black text-xl">{findingsStats.low}</span>
                    <span className="text-slate-400 font-bold mt-1">Low Severity</span>
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Remediation Status</span>
                <div className="grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-200 font-black text-xl">{findingsStats.open}</span>
                    <span className="text-slate-400 font-semibold mt-1">Unresolved</span>
                  </div>
                  <div className="bg-blue-900/15 border border-blue-800/25 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-blue-300 font-black text-xl">{findingsStats.inProgress}</span>
                    <span className="text-slate-400 font-semibold mt-1">In Progress</span>
                  </div>
                  <div className="bg-emerald-950/20 border border-emerald-800/25 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-emerald-400 font-black text-xl">{findingsStats.resolved}</span>
                    <span className="text-slate-400 font-semibold mt-1">Resolved</span>
                  </div>
                  <div className="bg-purple-950/20 border border-purple-800/25 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-purple-400 font-black text-xl">{findingsStats.verified}</span>
                    <span className="text-slate-400 font-semibold mt-1">Verified (Closed)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MISSING PAPERWORK BY SEGMENT */}
        <section className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
            <CheckSquare size={18} className="text-[#d4af37]" />
            Outstanding Paperwork by Segment
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Requirements flagged as Missing or Needs Review grouped by business or operational segment.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {missingPaperworkGroups.map((group, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">{group.name}</span>
                  <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Outstanding Tasks</span>
                </div>
                <div className="h-10 w-10 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
                  <span className="text-[#d4af37] font-black text-lg">{group.count}</span>
                </div>
              </div>
            ))}
            {missingPaperworkGroups.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-500 italic">
                All paperwork complete! No outstanding segments.
              </div>
            )}
          </div>
        </section>

        {/* PRIORITY ACTION PLAN */}
        <section className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Priority Action Plan
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Highest priority critical omissions and gaps that require immediate advisor attention to prevent delays.
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 px-3 py-1 rounded-full">
              Advisor Focus
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Household</th>
                  <th className="pb-3 px-4">Account Type</th>
                  <th className="pb-3 px-4">Gaps / Omissions</th>
                  <th className="pb-3 px-4">Severity</th>
                  <th className="pb-3 px-4">Responsible</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 pl-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {priorityActions.map((action, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/10 text-slate-300 font-medium">
                    <td className="py-3.5 pr-4 font-bold text-slate-200">{action.household}</td>
                    <td className="py-3.5 px-4 text-slate-400">{action.accountType}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">{action.item}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${getSeverityBadgeClass(action.severity)}`}>
                        {action.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#d4af37] font-semibold">{action.responsibleParty}</td>
                    <td className="py-3.5 px-4 text-xs font-bold">{action.status}</td>
                    <td className="py-3.5 pl-4 text-slate-400 max-w-[200px] truncate" title={action.notes}>{action.notes}</td>
                  </tr>
                ))}
                {priorityActions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-500 italic">
                      No unresolved priority actions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* HOUSEHOLD READINESS & DRILLDOWN */}
        <section className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <Layers size={18} className="text-[#d4af37]" />
                Household Readiness Directory
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Filter and search transition readiness metrics for each individual client household.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search household or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-[#d4af37]/50"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-300 px-3 py-2.5 rounded-lg focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Ready">Ready</option>
                <option value="Minor Cleanup">Minor Cleanup</option>
                <option value="Significant Cleanup">Significant Cleanup</option>
                <option value="Not Ready">Not Ready</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4 w-10"></th>
                  <th className="pb-3 px-4">Household Name</th>
                  <th className="pb-3 px-4 text-right">AUM</th>
                  <th className="pb-3 px-4 text-center">Accounts</th>
                  <th className="pb-3 px-4 text-center">Packet Completion</th>
                  <th className="pb-3 px-4 text-center">Open Gaps</th>
                  <th className="pb-3 pl-4">Readiness Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredHouseholds.map((hh) => {
                  const isExpanded = expandedHouseholds[hh.id];
                  
                  // Compute household statistics
                  const hhAccounts = hh.accounts;
                  const totalHhAccounts = hhAccounts.length;
                  const completeHhAccounts = hhAccounts.filter(a => a.readinessStatus === 'Ready').length;
                  const hhPercent = totalHhAccounts > 0 ? Math.round((completeHhAccounts / totalHhAccounts) * 100) : 0;
                  
                  const hhOpenFindings = findings.filter(f => f.householdName === hh.name && (f.status === 'Open' || f.status === 'In Progress')).length;

                  return (
                    <React.Fragment key={hh.id}>
                      <tr 
                        className="hover:bg-slate-900/10 cursor-pointer text-slate-300 font-medium select-none"
                        onClick={() => toggleHousehold(hh.id)}
                      >
                        <td className="py-3.5 pr-4 text-center text-slate-500">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-200 hover:text-[#d4af37] transition-colors">{hh.name}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-200">
                          {hh.totalAum ? `$${hh.totalAum.toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">{totalHhAccounts}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-bold text-slate-100">{hhPercent}%</span>
                            <div className="w-12 bg-slate-800 h-1.5 rounded overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${hhPercent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-bold ${hhOpenFindings > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {hhOpenFindings}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(hh.readinessStatus)}`}>
                            {hh.readinessStatus}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-slate-950/20 px-8 py-4 border-b border-slate-800">
                            <div className="space-y-4">
                              <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                                <h4 className="font-bold text-slate-300 text-xs">Accounts Detail & Checklist Status</h4>
                                <span className="text-[10px] text-slate-500 font-semibold uppercase">Client: {hh.primaryClientName || 'N/A'}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {hhAccounts.map((acc) => {
                                  const missingItems = acc.checklistItems.filter(i => i.status === 'Missing' || i.status === 'Needs Review');
                                  
                                  return (
                                    <div key={acc.id} className="bg-slate-900/35 border border-slate-800 rounded-lg p-3.5 space-y-3 flex flex-col justify-between">
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                          <span className="font-bold text-slate-200 text-xs block">{acc.name}</span>
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${getStatusBadgeClass(acc.readinessStatus)}`}>
                                            {acc.readinessStatus}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                                          <span>Type: {acc.type}</span>
                                          <span>Value: {acc.value ? `$${acc.value.toLocaleString()}` : 'N/A'}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate">
                                          Registration: {acc.registration || 'Individual Registration'}
                                        </div>
                                      </div>

                                      <div className="space-y-1.5 pt-2 border-t border-slate-850">
                                        <span className="text-[10px] font-bold text-slate-400 block">Checklist Items:</span>
                                        {acc.checklistItems.map((item) => (
                                          <div key={item.id} className="flex items-start justify-between gap-4 text-[10px] py-0.5">
                                            <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                              {item.critical && <span className="text-rose-400 font-bold shrink-0" title="Critical Requirement">*</span>}
                                              {item.itemName}
                                            </span>
                                            <span className={`font-bold uppercase tracking-wider text-[8px] ${
                                              item.status === 'Present' ? 'text-emerald-400' :
                                              item.status === 'Missing' ? 'text-rose-400' : 'text-amber-400'
                                            }`}>
                                              {item.status}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                                {hhAccounts.length === 0 && (
                                  <div className="col-span-2 text-center text-xs text-slate-500 italic py-4">
                                    No accounts recorded for this household.
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredHouseholds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-500 italic">
                      No matching households found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* PUBLIC ADVISOR NOTES */}
        {notes.length > 0 && (
          <section className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
              <FileText size={18} className="text-[#d4af37]" />
              Consultant Notes & Practice Guidance
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Important guidance, action plans, and comments provided by your transition consulting team.
            </p>

            <div className="space-y-3.5">
              {notes.map((note) => (
                <div key={note.id} className="p-4 bg-slate-900/30 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-200 text-xs">
                        {note.createdByFullName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20">
                        {note.noteType}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                    {note.noteBody}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RECENT ACTIVITY */}
        <section className="bg-[#1c2541] border border-slate-700/50 rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
            <Clock size={18} className="text-[#d4af37]" />
            Audit Activity & Logs
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Recent updates, document uploads, and validation tasks completed by the transition audit team.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.slice(0, 12).map((act) => {
              let actionIcon = <FileText size={14} className="text-blue-400" />;
              if (act.action === 'Verify') actionIcon = <CheckCircle2 size={14} className="text-emerald-400" />;
              else if (act.action === 'Resolve') actionIcon = <CheckCircle2 size={14} className="text-teal-400" />;
              else if (act.action === 'Delete') actionIcon = <AlertCircle size={14} className="text-rose-400" />;
              else if (act.action === 'Create') actionIcon = <AlertCircle size={14} className="text-green-400" />;
              else if (act.action === 'Recalculate') actionIcon = <TrendingUp size={14} className="text-purple-400" />;

              return (
                <div key={act.id} className="bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-lg flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-950/30 border border-slate-800 mt-0.5 shrink-0">
                    {actionIcon}
                  </div>
                  <div className="space-y-1 w-full">
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="font-bold text-slate-200 text-xs block">
                        {act.action}: {act.objectAffected}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold shrink-0">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{act.description}</p>
                    {(act.previousValue || act.newValue) && (
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 font-bold mt-1">
                        {act.previousValue && <span className="line-through">{act.previousValue}</span>}
                        {act.previousValue && <span>→</span>}
                        <span className="text-emerald-400">{act.newValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {activities.length === 0 && (
              <div className="col-span-2 text-center py-6 text-xs text-slate-500 italic">
                No recent activity logged.
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0e1731] py-5 px-6 text-center text-xs text-slate-500 font-semibold select-none">
        <p>© 2026 Continuity Transition Readiness Audit. All Rights Reserved.</p>
        <p className="mt-1">Authorized Read-Only Live Readiness Report for Bennett Wealth Partners. Confidential.</p>
      </footer>
    </div>
  );
}
