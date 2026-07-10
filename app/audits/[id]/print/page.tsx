import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getScoreRating } from '@/lib/scoring';
import PrintTrigger from '@/components/PrintTrigger';

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function PrintReportPage(props: PrintPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await props.params;

  // Fetch the assessment details from database including related advisor
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { advisor: true }
  });

  if (!assessment) {
    notFound();
  }

  // Map advisor relations flat to keep print rendering fully compatible
  const audit = {
    ...assessment,
    advisorName: assessment.advisor.name,
    firmName: assessment.advisor.firmName,
    email: assessment.advisor.email,
    phone: assessment.advisor.phone,
    currentFirm: assessment.advisor.currentFirm,
    currentCustodian: assessment.advisor.currentCustodian,
    futureCustodian: assessment.advisor.futureCustodian,
    businessModel: assessment.advisor.businessModel,
    protocolStatus: assessment.advisor.protocolStatus,
    totalAum: assessment.advisor.totalAum,
    annualRevenue: assessment.advisor.annualRevenue,
    households: assessment.advisor.households,
    accounts: assessment.advisor.accounts,
    staffCount: assessment.advisor.staffCount,
    crm: assessment.advisor.crm,
  };

  const rating = getScoreRating(audit.overallReadinessScore);

  // Generate dynamic timelines
  const getTimelineText = (score: number) => {
    if (score >= 80) return '30-45 Days (Standard Execution)';
    if (score >= 60) return '60-90 Days (Remediation Required)';
    return '90-180 Days (Extended Remediation & Legal Delay)';
  };
  const cleanupTimeline = getTimelineText(audit.overallReadinessScore);

  // Dynamic Risk & Action Checklist
  const getChecks = () => {
    const risks: string[] = [];
    const actions: string[] = [];

    if (audit.emailCompletenessPercent < 90) {
      risks.push(`Client email address completeness is low (${audit.emailCompletenessPercent}%). Outdated emails will block custodian digital signatures and digital consent forms.`);
      actions.push('Admin Staff: Retrieve and input missing email addresses in CRM before launching custodian repapering.');
    }
    if (audit.duplicateRecordRiskScore >= 5) {
      risks.push(`High risk of duplicate entries (${audit.duplicateRecordRiskScore}/10). Duplicates will corrupt client mapping worksheets and cause multi-profile extraction issues.`);
      actions.push('CRM Manager: Run deduplication scan in CRM, merge duplicate contacts, and lock down contact sheets.');
    }
    if (audit.missingSignatureRiskScore >= 5) {
      risks.push('Significant risk of missing physical signatures or outdated advisory contracts on file.');
      actions.push('Compliance Officer: Inventory client files for active investment agreements and request fresh signings.');
    }
    if (audit.staffCapacityScore <= 4) {
      risks.push('Limited staff operational capacity. Transition administrative overhead will bottleneck standard client operations.');
      actions.push('Operations Lead: Contract external transition assistance or reallocate internal support staff.');
    }
    if (audit.nonSolicitNonCompeteConcerns) {
      risks.push('Restrictive non-solicit or non-compete concerns identified with the current broker-dealer.');
      actions.push('Principal: Review solicitation limits with external transition counsel and create protocol-compliant letters.');
    }
    if (audit.legalReviewStatus === 'None') {
      risks.push('Transition counsel legal review has not yet been completed.');
      actions.push('Principal: Engage specialized legal counsel for broker-dealer contract review immediately.');
    }
    if (audit.transferComplexityScore >= 7) {
      risks.push('High volume of complex transfer assets (alternatives, direct business, or direct-held annuities).');
      actions.push('Transfer Operations: Contact product sponsors for proprietary transfer forms; allocate extra processing time.');
    }

    return { risks, actions };
  };

  const { risks, actions } = getChecks();

  return (
    <div className="bg-white text-slate-900 min-h-screen font-serif">
      {/* Top action toolbar - hidden during print */}
      <div className="no-print bg-[#1c2541] border-b border-slate-700/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-[#d4af37] font-bold text-xl tracking-wider">CTS</span>
          <span className="text-slate-100 font-medium text-sm pl-2 border-l border-slate-600">
            Print Engine
          </span>
        </div>
        <div className="flex gap-4">
          <PrintTrigger />
        </div>
      </div>

      {/* RENDER CONTAINER FOR PRINT */}
      <div className="max-w-[8.5in] mx-auto bg-white p-12 print:p-0 print:m-0 space-y-16">
        
        {/* PAGE 1: COVER PAGE */}
        <section className="h-[9.5in] flex flex-col justify-between border-4 border-[#0b1329] p-12 text-center select-none print-break-inside-avoid">
          {/* Top Header Logo */}
          <div className="space-y-2">
            <div className="text-3xl font-extrabold tracking-widest text-[#0b1329]">
              CONTINUITY TRANSITION SERVICES
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-sans">
              Expert Broker-Dealer & RIA Transition Consulting
            </div>
          </div>

          {/* Central Report Title */}
          <div className="my-auto space-y-6">
            <div className="h-1.5 w-24 bg-[#d4af37] mx-auto"></div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#0b1329] uppercase leading-tight font-sans">
              Know Your Book™
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-[#d4af37] font-sans">
              Powered by Continuity Transition Services
            </p>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              An operational, compliance, and technology assessment of business transfer readiness.
            </p>
          </div>

          {/* Bottom metadata */}
          <div className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-2 gap-4 text-left border-t border-slate-200 pt-6">
              <div>
                <span className="text-slate-400 uppercase tracking-widest block font-bold text-[9px]">Prepared For:</span>
                <span className="text-[#0b1329] font-bold text-sm block mt-1">{audit.advisorName}</span>
                <span className="text-slate-600 font-medium">{audit.firmName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 uppercase tracking-widest block font-bold text-[9px]">Prepared By:</span>
                <span className="text-[#0b1329] font-bold text-sm block mt-1">Continuity Transition Services</span>
                <span className="text-slate-600 font-medium">Assessment Date: {new Date(audit.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* PAGE 2: EXECUTIVE SUMMARY & TIMELINE */}
        <section className="print-break-before space-y-8 pt-8">
          <div className="border-b-2 border-[#0b1329] pb-3 flex justify-between items-baseline">
            <h2 className="text-2xl font-bold tracking-tight text-[#0b1329] uppercase font-sans">1. Executive Summary</h2>
            <span className="text-xs text-slate-400 uppercase tracking-widest font-sans">KNOW YOUR BOOK™ REPORT</span>
          </div>

          <div className="grid grid-cols-3 gap-8 items-center bg-slate-550 p-6 border border-slate-200 rounded">
            <div className="col-span-1 text-center border-r border-slate-200 pr-4">
              <span className="text-slate-550 uppercase tracking-wider text-[9px] font-bold block mb-2 font-sans">Overall Know Your Book™ Index</span>
              <span className="text-5xl font-extrabold text-[#0b1329] block tracking-tight font-sans">
                {Math.round(audit.overallReadinessScore)}%
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider mt-1 font-sans">
                Know Your Book™ Index
              </span>
            </div>
            
            <div className="col-span-2 space-y-2">
              <span className="text-slate-550 uppercase tracking-wider text-[9px] font-bold block font-sans">Assessment Rating</span>
              <h3 className="text-lg font-bold text-[#0b1329] flex items-center gap-2 font-sans">
                <span className={`w-3 h-3 rounded-full inline-block ${
                  rating.rating === 'Green' ? 'bg-emerald-500' : rating.rating === 'Yellow' ? 'bg-amber-500' : rating.rating === 'Orange' ? 'bg-orange-500' : 'bg-rose-500'
                }`}></span>
                {rating.label}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                An overall Know Your Book™ Index of {Math.round(audit.overallReadinessScore)}% indicates that the practice has{' '}
                {rating.rating === 'Green' 
                  ? 'a very clean operational profile with low compliance friction. The team is ready to begin custodian mapping.'
                  : rating.rating === 'Yellow'
                  ? 'moderate database gaps, incomplete KYC files, or minor legal questions that require addressing prior to client solicitation.'
                  : rating.rating === 'Orange'
                  ? 'significant database gaps, outstanding document files, or legal cleanup requirements that require addressing prior to transition.'
                  : 'severe operational risks, high alternative asset complexity, or unreviewed employment restrictive covenants. Action must be taken.'
                }
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#0b1329] uppercase tracking-wide font-sans">Estimated Cleanup Timeline</h3>
            <div className="border-l-4 border-[#d4af37] pl-4 py-1.5">
              <p className="text-sm font-bold text-slate-800 font-sans">{cleanupTimeline}</p>
              <p className="text-xs text-slate-600 leading-relaxed mt-1 font-sans">
                Based on client records, support staff bandwidth, and compliance status, CTS recommends the above timeline. 
                Remediation steps must be executed sequentially to ensure max client transition retention rate.
              </p>
            </div>
          </div>

          {/* Key Risks Table */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-[#0b1329] uppercase tracking-wide font-sans">Critical Risks Identified</h3>
            {risks.length > 0 ? (
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-sans">
                    <th className="p-3 font-bold border-r border-slate-200 w-8">#</th>
                    <th className="p-3 font-bold">Identified Operational Risk Gaps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {risks.map((risk, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="p-3 font-bold text-slate-500 border-r border-slate-200 font-sans text-center">{idx + 1}</td>
                      <td className="p-3 text-slate-700 leading-relaxed">{risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-600 bg-emerald-50 border border-emerald-200 p-4 rounded font-sans">
                No high-risk gaps flagged. All data fields and legal review indicators satisfy CTS standard readiness guidelines.
              </p>
            )}
          </div>
        </section>

        {/* PAGE 3: RECOMMENDATIONS & SCORES */}
        <section className="print-break-before space-y-8 pt-8">
          <div className="border-b-2 border-[#0b1329] pb-3 flex justify-between items-baseline">
            <h2 className="text-2xl font-bold tracking-tight text-[#0b1329] uppercase font-sans">2. Remediation & Action Plan</h2>
            <span className="text-xs text-slate-400 uppercase tracking-widest font-sans">CTS READINESS REPORT</span>
          </div>

          {/* Recommended Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#0b1329] uppercase tracking-wide font-sans">Recommended Staff Action Checklist</h3>
            {actions.length > 0 ? (
              <div className="space-y-3 font-sans text-xs text-slate-700">
                {actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="w-4 h-4 rounded border border-slate-400 flex items-center justify-center font-bold text-[8px] text-transparent shrink-0 mt-0.5 select-none">[ ]</span>
                    <p className="leading-relaxed"><span className="font-bold text-[#0b1329]">{action.split(':')[0]}:</span>{action.split(':')[1]}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600 font-sans">No immediate manual database actions required. Begin standard pre-onboarding checklist.</p>
            )}
          </div>

          {/* Detail Scores Table */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-[#0b1329] uppercase tracking-wide font-sans">Section-by-Section Score Card</h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-200 font-sans">
              <thead>
                <tr className="bg-[#0b1329] text-white border-b border-[#0b1329]">
                  <th className="p-3 font-bold uppercase tracking-wider">Assessment Category</th>
                  <th className="p-3 font-bold text-center uppercase tracking-wider w-32">Weight (%)</th>
                  <th className="p-3 font-bold text-right uppercase tracking-wider w-32">Know Your Book™ Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Client Data Quality & Completeness</td>
                  <td className="p-3 text-center">20%</td>
                  <td className="p-3 text-right font-bold">{Math.round(audit.clientDataScore)}%</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">KYC & Document Cleanliness</td>
                  <td className="p-3 text-center">25%</td>
                  <td className="p-3 text-right font-bold">{Math.round(audit.kycDocumentationScore)}%</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Transfer Complexity Mitigation</td>
                  <td className="p-3 text-center">15%</td>
                  <td className="p-3 text-right font-bold">{Math.round(audit.transferComplexityScoreVal)}%</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Operational Infrastructure</td>
                  <td className="p-3 text-center">15%</td>
                  <td className="p-3 text-right font-bold">{Math.round(audit.operationalScore)}%</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Compliance & Legal Awareness</td>
                  <td className="p-3 text-center">15%</td>
                  <td className="p-3 text-right font-bold">{Math.round(audit.complianceProtocolScore)}%</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Client Communication Plan</td>
                  <td className="p-3 text-center">10%</td>
                  <td className="p-3 text-right font-bold">{Math.round(audit.communicationScore)}%</td>
                </tr>
                <tr className="bg-slate-100 text-[#0b1329] font-bold">
                  <td className="p-3 uppercase">Total Weighted Know Your Book™ Index</td>
                  <td className="p-3 text-center">100%</td>
                  <td className="p-3 text-right text-[#d4af37] font-extrabold text-sm">{Math.round(audit.overallReadinessScore)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {audit.notes && (
            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-bold text-[#0b1329] uppercase tracking-wide font-sans">Advisor-Specific Notes</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 border border-slate-200 rounded whitespace-pre-line">
                {audit.notes}
              </p>
            </div>
          )}

          {/* LEGAL DISCLAIMER FOOTER */}
          <div className="pt-8 border-t border-slate-200 mt-12 print-break-inside-avoid text-slate-400 text-[8px] font-sans text-center uppercase tracking-widest leading-relaxed">
            <span className="font-extrabold text-[#0b1329] block mb-1">Legal Disclaimer</span>
            Continuity Transition Services (CTS) does not provide legal, compliance, tax, investment, broker-dealer, RIA, or custodian advice. This report is an operational transition readiness assessment only and is based on self-reported inputs and discovery interviews. No regulatory compliance approvals are implied.
          </div>
        </section>

      </div>
    </div>
  );
}
