'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Edit, Printer, Trash2, ArrowLeft, AlertTriangle, CheckCircle, Clock, CheckSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, RadialProgress } from '@/components/ui';
import { getScoreRating } from '@/lib/scoring';

interface AuditDetail {
  id: string;
  advisorName: string;
  firmName: string;
  email: string | null;
  phone: string | null;
  currentFirm: string | null;
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
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  // Scored fields
  emailCompletenessPercent: number;
  phoneCompletenessPercent: number;
  addressCompletenessPercent: number;
  householdingQualityScore: number;
  duplicateRecordRiskScore: number;
  clientNotesQualityScore: number;

  kycUpdateFrequency: string;
  trustedContactCompletenessPercent: number;
  beneficiaryReviewStatus: string;
  riskToleranceCurrentPercent: number;
  investmentObjectiveCurrentPercent: number;
  missingSignatureRiskScore: number;
  documentStorageQualityScore: number;

  percentIraAccounts: number;
  percentTrustAccounts: number;
  percentEntityAccounts: number;
  percentAnnuityAltAccounts: number;
  directBusinessAmount: number;
  heldAwayAssetsNotes: string | null;
  transferComplexityScore: number;

  staffCapacityScore: number;
  crmExportQualityScore: number;
  taskManagementScore: number;
  digitalSignatureReadinessScore: number;
  communicationPlanScore: number;

  employmentAgreementReviewed: boolean;
  nonSolicitNonCompeteConcerns: boolean;
  legalReviewStatus: string;
  complianceRiskNotes: string | null;

  // Generated Scores
  overallReadinessScore: number;
  clientDataScore: number;
  kycDocumentationScore: number;
  transferComplexityScoreVal: number;
  operationalScore: number;
  complianceProtocolScore: number;
  communicationScore: number;
}

const parseStatus = (notesText: string | null) => {
  const defaults = {
    assessmentStage: 'Discovery Call Scheduled',
    assessmentOwner: 'CTS Admin',
    priority: 'Normal',
    expectedCompletionDate: '',
    tags: [] as string[],
    internalNotes: '',
  };

  if (!notesText || !notesText.includes('[Assessment Status]')) {
    return defaults;
  }

  try {
    const lines = notesText.split('\n');
    let assessmentStage = 'Discovery Call Scheduled';
    let assessmentOwner = 'CTS Admin';
    let priority = 'Normal';
    let expectedCompletionDate = '';
    let tags: string[] = [];
    let internalNotesLines: string[] = [];

    let mode: 'none' | 'internalNotes' = 'none';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('[Assessment Status]')) {
        continue;
      }
      if (line.includes('[General Notes]') || line.includes('[Assessment Evidence]') || line.includes('[Advisor Profile]')) {
        mode = 'none';
        continue;
      }

      if (line.startsWith('Stage:')) {
        assessmentStage = line.replace('Stage:', '').trim();
        continue;
      }
      if (line.startsWith('Owner:')) {
        assessmentOwner = line.replace('Owner:', '').trim();
        continue;
      }
      if (line.startsWith('Priority:')) {
        priority = line.replace('Priority:', '').trim();
        continue;
      }
      if (line.startsWith('Expected Completion Date:')) {
        expectedCompletionDate = line.replace('Expected Completion Date:', '').trim();
        continue;
      }
      if (line.startsWith('Tags:')) {
        const tagsStr = line.replace('Tags:', '').trim();
        tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];
        continue;
      }
      if (line.startsWith('Internal Notes:')) {
        mode = 'internalNotes';
        internalNotesLines.push(line.replace('Internal Notes:', '').trim());
        continue;
      }

      if (mode === 'internalNotes') {
        internalNotesLines.push(line);
      }
    }

    return {
      assessmentStage,
      assessmentOwner,
      priority,
      expectedCompletionDate,
      tags,
      internalNotes: internalNotesLines.join('\n').trim()
    };
  } catch (e) {
    return defaults;
  }
};

export default function AuditDetailClient({ audit }: { audit: AuditDetail }) {
  const statusInfo = parseStatus(audit.notes);
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const rating = getScoreRating(audit.overallReadinessScore);

  // Generate dynamic cleanup timeline description
  const getTimelineText = (score: number) => {
    if (score >= 80) return { title: 'Standard Transition (30-45 Days)', desc: 'Clean database and low complexity. Proceed with standard custodial onboarding.' };
    if (score >= 60) return { title: 'Remediation Transition (60-90 Days)', desc: 'Moderate duplicate records and document gaps. Requires client outreach and data cleanup.' };
    return { title: 'Extended Remediation (90-180 Days)', desc: 'Significant data cleanup, missing documents, or complex legal hurdles. Hold transition until prioritized fixes are completed.' };
  };
  const timeline = getTimelineText(audit.overallReadinessScore);

  // Dynamic Risk Checklist Generation
  const getRisksAndFixes = () => {
    const items: { risk: string; fix: string }[] = [];

    if (audit.emailCompletenessPercent < 90) {
      items.push({
        risk: `Client emails are incomplete (${audit.emailCompletenessPercent}%). Outdated emails will block custodian digital signatures and digital consent forms.`,
        fix: 'Initiate a client data verification campaign to collect missing email addresses before generating digital paperwork.',
      });
    }
    if (audit.duplicateRecordRiskScore >= 5) {
      items.push({
        risk: `High duplicate record risk (${audit.duplicateRecordRiskScore}/10). Merging duplicated profiles after export will cause file format corruption and mapping errors.`,
        fix: 'Perform a database cleanup and run record-merging utilities in the current CRM system before initiating data extraction.',
      });
    }
    if (audit.missingSignatureRiskScore >= 5) {
      items.push({
        risk: 'Outdated or missing physical/digital advisory agreements. High audit exposure.',
        fix: 'Run an internal compliance review to identify accounts with missing agreements and execute updated documentation.',
      });
    }
    if (audit.staffCapacityScore <= 4) {
      items.push({
        risk: 'Support staff is at maximum capacity. The manual overhead of custodian repapering will create operational bottlenecks.',
        fix: 'Contract an external CTS transition specialist or allocate temporary clerical support for the 60-day active transition window.',
      });
    }
    if (audit.nonSolicitNonCompeteConcerns) {
      items.push({
        risk: 'Active non-solicit or non-compete clauses identified with the current broker-dealer/parent firm. Potential litigation trigger.',
        fix: 'Verify guidelines with specialized transition counsel. Formulate a protocol-compliant client communication strategy (strict announcement-only, no active solicitations).',
      });
    }
    if (audit.legalReviewStatus === 'None') {
      items.push({
        risk: 'Securities transition legal review has not yet been initiated.',
        fix: 'Schedule an immediate review with specialized counsel to audit broker-dealer contracts and transition protocols.',
      });
    }
    if (audit.transferComplexityScore >= 7) {
      items.push({
        risk: `High transfer complexity (${audit.transferComplexityScore}/10) due to alternative investments, annuities, or non-ACATS assets.`,
        fix: 'Identify all direct-to-issuer funds and request issuer-specific re-registration paperwork immediately. Allow an extra 3-4 weeks for processing.',
      });
    }

    return items;
  };

  const risksAndFixes = getRisksAndFixes();

  // Radar Chart Data format
  const radarData = [
    { subject: 'Client Data', score: audit.clientDataScore },
    { subject: 'KYC & Docs', score: audit.kycDocumentationScore },
    { subject: 'Transfer Complex.', score: audit.transferComplexityScoreVal },
    { subject: 'Operational', score: audit.operationalScore },
    { subject: 'Compliance', score: audit.complianceProtocolScore },
    { subject: 'Communication', score: audit.communicationScore },
  ];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/audits/${audit.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      alert('Failed to delete assessment.');
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Back button and page actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link href="/dashboard" className="flex items-center text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
        </Link>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link href={`/audits/${audit.id}/edit`} className="flex-1 sm:flex-none">
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
              <Edit size={16} /> Edit Assessment
            </Button>
          </Link>
          <Link href={`/audits/${audit.id}/print`} target="_blank" className="flex-1 sm:flex-none">
            <Button variant="primary" className="w-full flex items-center justify-center gap-2">
              <Printer size={16} /> Open Printable Report
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => setShowDeleteModal(true)}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/20"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Assessment Status Panel */}
      <div className="bg-[#1c2541] border border-slate-700/60 rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessment Status:</span>
            <Badge variant="neutral" className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 font-bold">
              {statusInfo.assessmentStage}
            </Badge>
            <Badge 
              variant={
                statusInfo.priority === 'Urgent' || statusInfo.priority === 'High' 
                  ? 'critical' 
                  : 'neutral'
              }
            >
              Priority: {statusInfo.priority}
            </Badge>
          </div>
          {statusInfo.expectedCompletionDate && (
            <div className="text-xs text-slate-400">
              Expected Completion: <span className="text-slate-200 font-bold">{statusInfo.expectedCompletionDate}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-700/40">
          <div>
            <span className="text-slate-400 font-semibold block mb-0.5">Assessment Owner:</span>
            <span className="text-slate-200 font-bold text-sm">{statusInfo.assessmentOwner}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block mb-1">Internal Tags:</span>
            <div className="flex flex-wrap gap-1.5">
              {statusInfo.tags.length > 0 ? (
                statusInfo.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[10px]">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic">No tags assigned</span>
              )}
            </div>
          </div>
        </div>

        {statusInfo.internalNotes && (
          <div className="bg-slate-900/40 p-4 rounded border border-slate-800/80 text-xs mt-2">
            <span className="text-slate-400 font-semibold block mb-1">Internal CTS Notes:</span>
            <p className="text-slate-300 whitespace-pre-line leading-relaxed">{statusInfo.internalNotes}</p>
          </div>
        )}
      </div>

      {/* Main Grid: Left column: summary stats + radar chart, Right Column: details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: VISUAL DASHBOARD */}
        <div className="space-y-6 lg:col-span-1">
          {/* Know Your Book™ Index Card */}
          <Card className="text-center p-6 flex flex-col items-center">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Overall Know Your Book™ Index</h2>
            <RadialProgress value={audit.overallReadinessScore} size={150} strokeWidth={12} className="mb-4" />
            <Badge variant={rating.rating === 'Green' ? 'ready' : rating.rating === 'Yellow' ? 'advisory' : 'critical'} className="mb-2">
              {rating.label}
            </Badge>
            <p className="text-xs text-slate-400 mt-2 px-4">
              Weighted calculation based on client data quality, document compliance, operation capacity, and legal protocols.
            </p>
          </Card>

          {/* Radar Metrics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Score Profiles</CardTitle>
              <CardDescription>Know Your Book™ Index breakdown across all assessment categories.</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] flex items-center justify-center pt-0">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={8} />
                    <Radar
                      name="Readiness"
                      dataKey="score"
                      stroke="#d4af37"
                      fill="#d4af37"
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-slate-500 text-sm">Loading visual matrix...</span>
              )}
            </CardContent>
          </Card>

          {/* Estimated Cleanup Timeline */}
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <Clock className="text-[#d4af37] shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recommended Timeline</h3>
                <h4 className="text-sm font-bold text-[#d4af37] mt-1">{timeline.title}</h4>
                <p className="text-xs text-slate-300 mt-1">{timeline.desc}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: DETAIL DEMOGRAPHICS & FINDINGS */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* General Advisor Profile */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block mb-1">
                    Discovery Briefing
                  </span>
                  <CardTitle>{audit.advisorName}</CardTitle>
                  <CardDescription>{audit.firmName}</CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-100">${audit.totalAum || 0}M</span>
                  <span className="text-xs text-slate-400 block uppercase tracking-wide">Assets Under Mgmt (AUM)</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-slate-700/40 pb-5">
              <div>
                <span className="text-slate-400 block font-medium">Target Model</span>
                <span className="text-slate-200 font-bold text-sm">{audit.businessModel}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Protocol BD</span>
                <span className="text-slate-200 font-bold text-sm">{audit.protocolStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Custodians</span>
                <span className="text-slate-200 font-bold text-sm">
                  {audit.currentCustodian || 'N/A'} → {audit.futureCustodian || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Current CRM</span>
                <span className="text-slate-200 font-bold text-sm">{audit.crm || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Est. Revenue</span>
                <span className="text-slate-200 font-bold text-sm">
                  {audit.annualRevenue ? `$${audit.annualRevenue.toLocaleString()}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Households</span>
                <span className="text-slate-200 font-bold text-sm">{audit.households || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Accounts</span>
                <span className="text-slate-200 font-bold text-sm">{audit.accounts || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Support Staff</span>
                <span className="text-slate-200 font-bold text-sm">{audit.staffCount || 0} FTE</span>
              </div>
            </CardContent>
            {audit.notes && (
              <CardContent className="bg-slate-900/10 text-xs">
                <span className="text-[#d4af37] font-semibold block uppercase tracking-wider mb-1.5">Assessor Notes</span>
                <p className="text-slate-300 whitespace-pre-line leading-relaxed">{audit.notes}</p>
              </CardContent>
            )}
          </Card>

          {/* Key Risks & Remediation Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Transition Risk Assessment & Prioritized Fixes
              </CardTitle>
              <CardDescription>
                Dynamic system checkpoints showing operational gaps that will impede client transfer rate.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-800">
              {risksAndFixes.length > 0 ? (
                risksAndFixes.map((item, idx) => (
                  <div key={idx} className="p-5 flex gap-4 items-start hover:bg-slate-800/10 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></span>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-slate-200">{item.risk}</p>
                      <div className="flex items-start gap-1.5 text-xs text-[#d4af37] bg-[#d4af37]/5 px-3 py-1.5 rounded border border-[#d4af37]/10">
                        <CheckSquare size={13} className="shrink-0 mt-0.5" />
                        <p><span className="font-bold">Prioritized Action:</span> {item.fix}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-emerald-400 flex flex-col items-center justify-center gap-2">
                  <CheckCircle size={24} />
                  <span className="font-bold">No High-Risk Gaps Flagged</span>
                  <span className="text-xs text-slate-400">All data metrics and compliance profiles meet initial CTS readiness guidelines.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Metric Scores Accordion style cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pt-2">Assessment Section Breakdowns</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Client Data Card */}
              <Card className="p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-700/40 pb-2">
                  <h4 className="font-bold text-sm text-slate-200">Client Data Readiness</h4>
                  <span className="text-[#d4af37] font-bold text-sm">{audit.clientDataScore}%</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between"><span>Email Completeness:</span><span className="font-bold text-slate-100">{audit.emailCompletenessPercent}%</span></div>
                  <div className="flex justify-between"><span>Phone Completeness:</span><span className="font-bold text-slate-100">{audit.phoneCompletenessPercent}%</span></div>
                  <div className="flex justify-between"><span>Address Completeness:</span><span className="font-bold text-slate-100">{audit.addressCompletenessPercent}%</span></div>
                  <div className="flex justify-between"><span>Householding Quality (1-10):</span><span className="font-bold text-slate-100">{audit.householdingQualityScore}/10</span></div>
                  <div className="flex justify-between"><span>Duplicate record Risk (1-10):</span><span className="font-bold text-slate-100">{audit.duplicateRecordRiskScore}/10</span></div>
                </div>
              </Card>

              {/* KYC & Docs Card */}
              <Card className="p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-700/40 pb-2">
                  <h4 className="font-bold text-sm text-slate-200">KYC & Document Cleanliness</h4>
                  <span className="text-[#d4af37] font-bold text-sm">{audit.kycDocumentationScore}%</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between"><span>Update Frequency:</span><span className="font-bold text-slate-100">{audit.kycUpdateFrequency}</span></div>
                  <div className="flex justify-between"><span>Trusted Contacts (%):</span><span className="font-bold text-slate-100">{audit.trustedContactCompletenessPercent}%</span></div>
                  <div className="flex justify-between"><span>Beneficiary Reviews:</span><span className="font-bold text-slate-100">{audit.beneficiaryReviewStatus}</span></div>
                  <div className="flex justify-between"><span>Active Risk Questionnaires:</span><span className="font-bold text-slate-100">{audit.riskToleranceCurrentPercent}%</span></div>
                  <div className="flex justify-between"><span>Doc Storage Quality (1-10):</span><span className="font-bold text-slate-100">{audit.documentStorageQualityScore}/10</span></div>
                </div>
              </Card>

              {/* Transfer Complexity Card */}
              <Card className="p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-700/40 pb-2">
                  <h4 className="font-bold text-sm text-slate-200">Transfer Complexity</h4>
                  <span className="text-[#d4af37] font-bold text-sm">{audit.transferComplexityScoreVal}%</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between"><span>General Complexity (1-10):</span><span className="font-bold text-slate-100">{audit.transferComplexityScore}/10</span></div>
                  <div className="flex justify-between"><span>IRA / Trust / Corp Accounts:</span><span className="font-bold text-slate-100">{audit.percentIraAccounts}% / {audit.percentTrustAccounts}% / {audit.percentEntityAccounts}%</span></div>
                  <div className="flex justify-between"><span>Annuities & Alternatives (%):</span><span className="font-bold text-slate-100">{audit.percentAnnuityAltAccounts}%</span></div>
                  <div className="flex justify-between"><span>Direct-Held Assets ($):</span><span className="font-bold text-slate-100">${audit.directBusinessAmount ? audit.directBusinessAmount.toLocaleString() : 0}</span></div>
                </div>
              </Card>

              {/* Operations & Compliance Card */}
              <Card className="p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-700/40 pb-2">
                  <h4 className="font-bold text-sm text-slate-200">Operations & Legal</h4>
                  <span className="text-[#d4af37] font-bold text-sm">
                    {Math.round((audit.operationalScore + audit.complianceProtocolScore) / 2)}%
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between"><span>Staff Capacity / CRM Export:</span><span className="font-bold text-slate-100">{audit.staffCapacityScore}/10 / {audit.crmExportQualityScore}/10</span></div>
                  <div className="flex justify-between"><span>Agreement Reviewed:</span><span className="font-bold text-slate-100">{audit.employmentAgreementReviewed ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between"><span>Non-Solicit Issues:</span><span className="font-bold text-rose-400">{audit.nonSolicitNonCompeteConcerns ? 'YES' : 'No'}</span></div>
                  <div className="flex justify-between"><span>Counsel Legal Review:</span><span className="font-bold text-slate-100">{audit.legalReviewStatus}</span></div>
                </div>
              </Card>

            </div>
          </div>

        </div>

      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="max-w-md w-full border border-slate-700/80 bg-[#1c2541]">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-2">
                <AlertTriangle size={24} />
              </div>
              <CardTitle>Delete Advisor Assessment?</CardTitle>
              <CardDescription>
                This action is permanent and cannot be undone. All transition metrics and Know Your Book™ Index history for{' '}
                <span className="font-bold text-slate-200">"{audit.advisorName}"</span> will be lost.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 justify-center">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
