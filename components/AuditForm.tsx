'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Label, Select, Textarea } from '@/components/ui';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';

interface AuditFormProps {
  initialData?: any;
  isEdit?: boolean;
  reviewerName?: string;
}

type TabType = 'profile' | 'clientIntelligence' | 'operationalReadiness' | 'transitionComplexity' | 'review';

export default function AuditForm({ initialData = {}, isEdit = false, reviewerName = '' }: AuditFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion toggle state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Client Data Completeness': true, // Open by default
    'Assessment Evidence': true, // Open by default
  });

  // Notes parsing/serialization helper to maintain database schema compatibility
  const parseNotesField = (notesText: string) => {
    const defaults = {
      primaryEvidenceSource: 'CRM Export',
      confidenceLevel: 'High',
      reviewer: reviewerName || '',
      assessmentDate: new Date().toISOString().split('T')[0],
      assessmentNotes: '',
      supportingDocumentsReviewed: '',
      
      // Advisor Profile
      primaryContact: '',
      title: '',
      email: '',
      mobilePhone: '',
      eaName: '',
      eaEmail: '',
      eaPhone: '',
      teamMembers: [] as string[],
      currentFirmAffiliation: 'Independent RIA',
      yearsInBusiness: '',
      yearsAtCurrentFirm: '',
      expectedTransitionTimeline: 'Researching',
      reasonForTransition: '',

      // Assessment Status
      assessmentStage: 'Discovery Call Scheduled',
      assessmentOwner: reviewerName || 'CTS Admin',
      priority: 'Normal',
      expectedCompletionDate: '',
      tags: [] as string[],
      internalNotes: '',

      criteria: {} as Record<string, { status: string; comments: string; createFinding: boolean }>,
      generalNotes: notesText || ''
    };

    if (!notesText) {
      return defaults;
    }

    try {
      const lines = notesText.split('\n');
      let primaryEvidenceSource = 'CRM Export';
      let confidenceLevel = 'High';
      let reviewer = reviewerName || '';
      let assessmentDate = new Date().toISOString().split('T')[0];
      let assessmentNotesLines: string[] = [];
      let docsLines: string[] = [];
      
      let primaryContact = '';
      let title = '';
      let email = '';
      let mobilePhone = '';
      let eaName = '';
      let eaEmail = '';
      let eaPhone = '';
      let teamMembers: string[] = [];
      let currentFirmAffiliation = 'Independent RIA';
      let yearsInBusiness = '';
      let yearsAtCurrentFirm = '';
      let expectedTransitionTimeline = 'Researching';
      let reasonForTransitionLines: string[] = [];

      let assessmentStage = 'Discovery Call Scheduled';
      let assessmentOwner = reviewerName || 'CTS Admin';
      let priority = 'Normal';
      let expectedCompletionDate = '';
      let tags: string[] = [];
      let internalNotesLines: string[] = [];

      let criteria: Record<string, { status: string; comments: string; createFinding: boolean }> = {};
      let generalNotesLines: string[] = [];
      
      let mode: 'none' | 'evidenceNotes' | 'docs' | 'reason' | 'internalNotes' | 'general' | 'criteria' = 'none';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Mode switchers
        if (line.includes('[Assessment Evidence]')) {
          mode = 'none';
          continue;
        }
        if (line.includes('[Advisor Profile]')) {
          mode = 'none';
          continue;
        }
        if (line.includes('[Assessment Status]')) {
          mode = 'none';
          continue;
        }
        if (line.includes('[Client Data Completeness Criteria]')) {
          mode = 'criteria';
          continue;
        }
        if (line.includes('[General Notes]')) {
          mode = 'general';
          continue;
        }

        // Assessment Evidence parser
        if (line.startsWith('Primary Source:')) {
          primaryEvidenceSource = line.replace('Primary Source:', '').trim();
          continue;
        }
        if (line.startsWith('Confidence:')) {
          confidenceLevel = line.replace('Confidence:', '').trim();
          continue;
        }
        if (line.startsWith('Reviewer:')) {
          reviewer = line.replace('Reviewer:', '').trim();
          continue;
        }
        if (line.startsWith('Date:')) {
          assessmentDate = line.replace('Date:', '').trim();
          continue;
        }
        if (line.startsWith('Notes:')) {
          mode = 'evidenceNotes';
          assessmentNotesLines.push(line.replace('Notes:', '').trim());
          continue;
        }
        if (line.startsWith('Documents:')) {
          mode = 'docs';
          docsLines.push(line.replace('Documents:', '').trim());
          continue;
        }

        // Advisor Profile parser
        if (line.startsWith('Primary Contact:')) {
          primaryContact = line.replace('Primary Contact:', '').trim();
          continue;
        }
        if (line.startsWith('Title:')) {
          title = line.replace('Title:', '').trim();
          continue;
        }
        if (line.startsWith('Email:')) {
          email = line.replace('Email:', '').trim();
          continue;
        }
        if (line.startsWith('Mobile Phone:')) {
          mobilePhone = line.replace('Mobile Phone:', '').trim();
          continue;
        }
        if (line.startsWith('EA Name:')) {
          eaName = line.replace('EA Name:', '').trim();
          continue;
        }
        if (line.startsWith('EA Email:')) {
          eaEmail = line.replace('EA Email:', '').trim();
          continue;
        }
        if (line.startsWith('EA Phone:')) {
          eaPhone = line.replace('EA Phone:', '').trim();
          continue;
        }
        if (line.startsWith('Team Members:')) {
          const membersStr = line.replace('Team Members:', '').trim();
          teamMembers = membersStr ? membersStr.split(',').map(m => m.trim()) : [];
          continue;
        }
        if (line.startsWith('Current Affiliation:')) {
          currentFirmAffiliation = line.replace('Current Affiliation:', '').trim();
          continue;
        }
        if (line.startsWith('Years In Business:')) {
          yearsInBusiness = line.replace('Years In Business:', '').trim();
          continue;
        }
        if (line.startsWith('Years At Current Firm:')) {
          yearsAtCurrentFirm = line.replace('Years At Current Firm:', '').trim();
          continue;
        }
        if (line.startsWith('Timeline:')) {
          expectedTransitionTimeline = line.replace('Timeline:', '').trim();
          continue;
        }
        if (line.startsWith('Reason:')) {
          mode = 'reason';
          reasonForTransitionLines.push(line.replace('Reason:', '').trim());
          continue;
        }

        // Assessment Status parser
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

        // Accumulators
        if (mode === 'evidenceNotes') {
          assessmentNotesLines.push(line);
        } else if (mode === 'docs') {
          docsLines.push(line);
        } else if (mode === 'reason') {
          reasonForTransitionLines.push(line);
        } else if (mode === 'internalNotes') {
          internalNotesLines.push(line);
        } else if (mode === 'general') {
          generalNotesLines.push(line);
        } else if (mode === 'criteria') {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const rest = parts.slice(1).join(':').trim();
            const tokens = rest.split('|');
            let status = 'Meets Expectations';
            let comments = '';
            let createFinding = false;
            let evidenceType = 'CRM Export';
            let evidenceSummary = '';
            let evidenceConfidence = 'High';
            let evidenceReviewedBy = reviewerName || 'CTS Admin';
            let evidenceReviewDate = new Date().toISOString().split('T')[0];

            tokens.forEach(tok => {
              const trimmed = tok.trim();
              if (trimmed.startsWith('status=')) {
                status = trimmed.replace('status=', '').trim();
              } else if (trimmed.startsWith('comments=')) {
                comments = trimmed.replace('comments=', '').trim();
              } else if (trimmed.startsWith('createFinding=')) {
                createFinding = trimmed.replace('createFinding=', '').trim() === 'true';
              } else if (trimmed.startsWith('evidenceType=')) {
                evidenceType = trimmed.replace('evidenceType=', '').trim();
              } else if (trimmed.startsWith('evidenceSummary=')) {
                evidenceSummary = trimmed.replace('evidenceSummary=', '').trim();
              } else if (trimmed.startsWith('evidenceConfidence=')) {
                evidenceConfidence = trimmed.replace('evidenceConfidence=', '').trim();
              } else if (trimmed.startsWith('evidenceReviewedBy=')) {
                evidenceReviewedBy = trimmed.replace('evidenceReviewedBy=', '').trim();
              } else if (trimmed.startsWith('evidenceReviewDate=')) {
                evidenceReviewDate = trimmed.replace('evidenceReviewDate=', '').trim();
              }
            });
            criteria[key] = {
              status,
              comments,
              createFinding,
              evidenceType,
              evidenceSummary,
              evidenceConfidence,
              evidenceReviewedBy,
              evidenceReviewDate
            };
          }
        }
      }

      return {
        primaryEvidenceSource,
        confidenceLevel,
        reviewer: reviewer || reviewerName || '',
        assessmentDate,
        assessmentNotes: assessmentNotesLines.join('\n').trim(),
        supportingDocumentsReviewed: docsLines.join('\n').trim(),
        
        primaryContact,
        title,
        email,
        mobilePhone,
        eaName,
        eaEmail,
        eaPhone,
        teamMembers,
        currentFirmAffiliation,
        yearsInBusiness,
        yearsAtCurrentFirm,
        expectedTransitionTimeline,
        reasonForTransition: reasonForTransitionLines.join('\n').trim(),

        assessmentStage,
        assessmentOwner,
        priority,
        expectedCompletionDate,
        tags,
        internalNotes: internalNotesLines.join('\n').trim(),

        criteria,
        generalNotes: generalNotesLines.join('\n').trim()
      };
    } catch (e) {
      return defaults;
    }
  };

  const parsedEvidence = parseNotesField(initialData.notes || '');

  // Advisor Profile details state
  const [advisorProfile, setAdvisorProfile] = useState({
    primaryContact: parsedEvidence.primaryContact,
    title: parsedEvidence.title,
    email: parsedEvidence.email,
    mobilePhone: parsedEvidence.mobilePhone,
    eaName: parsedEvidence.eaName,
    eaEmail: parsedEvidence.eaEmail,
    eaPhone: parsedEvidence.eaPhone,
    teamMembers: parsedEvidence.teamMembers,
    currentFirmAffiliation: parsedEvidence.currentFirmAffiliation || 'Independent RIA',
    yearsInBusiness: parsedEvidence.yearsInBusiness,
    yearsAtCurrentFirm: parsedEvidence.yearsAtCurrentFirm,
    expectedTransitionTimeline: parsedEvidence.expectedTransitionTimeline || 'Researching',
    reasonForTransition: parsedEvidence.reasonForTransition
  });

  const [newTeamMember, setNewTeamMember] = useState('');

  // Assessment Status details state
  const [assessmentStatus, setAssessmentStatus] = useState({
    stage: parsedEvidence.assessmentStage || 'Discovery Call Scheduled',
    owner: parsedEvidence.assessmentOwner || reviewerName || 'CTS Admin',
    priority: parsedEvidence.priority || 'Normal',
    expectedCompletionDate: parsedEvidence.expectedCompletionDate || '',
    tags: parsedEvidence.tags || [] as string[],
    internalNotes: parsedEvidence.internalNotes || ''
  });

  const [newTag, setNewTag] = useState('');

  // Assessment Evidence details state
  const [evidenceData, setEvidenceData] = useState({
    primaryEvidenceSource: parsedEvidence.primaryEvidenceSource,
    confidenceLevel: parsedEvidence.confidenceLevel,
    reviewer: parsedEvidence.reviewer || reviewerName,
    assessmentDate: parsedEvidence.assessmentDate,
    assessmentNotes: parsedEvidence.assessmentNotes,
    supportingDocumentsReviewed: parsedEvidence.supportingDocumentsReviewed
  });

  // Collapsible evidence panel toggle state
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  // Client Intelligence details state
  const [clientIntelligence, setClientIntelligence] = useState({
    evidenceType: 'CRM Export',
    householdsReviewed: '',
    estimatedTotalHouseholds: '',
    
    // Sliders & Notes
    emailPercent: initialData.emailCompletenessPercent ?? 80,
    emailNotes: '',
    phonePercent: initialData.phoneCompletenessPercent ?? 80,
    phoneNotes: '',
    addressPercent: initialData.addressCompletenessPercent ?? 80,
    addressNotes: '',
    
    dobPercent: 80,
    dobNotes: '',
    ssnPercent: 80,
    ssnNotes: '',
    employmentPercent: 80,
    employmentNotes: '',
    incomePercent: 80,
    incomeNotes: '',
    netWorthPercent: 80,
    netWorthNotes: '',
    experiencePercent: 80,
    experienceNotes: ''
  });

  const getStatusFromPercent = (pct: number | null | undefined) => {
    if (pct === null || pct === undefined) return 'Meets Expectations';
    if (pct >= 90) return 'Meets Expectations';
    if (pct >= 50) return 'Needs Review';
    return 'Deficiency Identified';
  };

  const [clientCriteria, setClientCriteria] = useState(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const initialCriteria = {
      email: { status: getStatusFromPercent(initialData.emailCompletenessPercent), comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
      phone: { status: getStatusFromPercent(initialData.phoneCompletenessPercent), comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
      address: { status: getStatusFromPercent(initialData.addressCompletenessPercent), comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
      dob: { status: 'Meets Expectations', comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
      ssn: { status: 'Meets Expectations', comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
      employment: { status: 'Meets Expectations', comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
      income: { status: 'Meets Expectations', comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
      netWorth: { status: 'Meets Expectations', comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
      experience: { status: 'Meets Expectations', comments: '', createFinding: false, evidenceType: 'CRM Export', evidenceSummary: '', evidenceConfidence: 'High', evidenceReviewedBy: reviewerName || 'CTS Admin', evidenceReviewDate: todayStr },
    };

    if (parsedEvidence.criteria) {
      Object.keys(parsedEvidence.criteria).forEach(k => {
        if ((initialCriteria as any)[k]) {
          (initialCriteria as any)[k] = {
            ...((initialCriteria as any)[k]),
            ...parsedEvidence.criteria[k]
          };
        }
      });
    }

    return initialCriteria;
  });

  // Form State - keep all existing DB fields to prevent schema compilation / validation errors
  const [formData, setFormData] = useState({
    advisorId: initialData.advisorId || '',
    advisorName: initialData.advisorName || '',
    firmName: initialData.firmName || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    currentFirm: initialData.currentFirm || '',
    currentCustodian: initialData.currentCustodian || '',
    futureCustodian: initialData.futureCustodian || '',
    businessModel: initialData.businessModel || 'Unknown',
    protocolStatus: initialData.protocolStatus || 'Unsure',
    totalAum: initialData.totalAum || '',
    annualRevenue: initialData.annualRevenue || '',
    households: initialData.households || '',
    accounts: initialData.accounts || '',
    staffCount: initialData.staffCount || '',
    crm: initialData.crm || '',
    notes: parsedEvidence.generalNotes,

    // Client Data
    emailCompletenessPercent: initialData.emailCompletenessPercent ?? 80,
    phoneCompletenessPercent: initialData.phoneCompletenessPercent ?? 80,
    addressCompletenessPercent: initialData.addressCompletenessPercent ?? 80,
    householdingQualityScore: initialData.householdingQualityScore ?? 5,
    duplicateRecordRiskScore: initialData.duplicateRecordRiskScore ?? 5,
    clientNotesQualityScore: initialData.clientNotesQualityScore ?? 5,

    // KYC
    kycUpdateFrequency: initialData.kycUpdateFrequency || 'Ad-hoc',
    trustedContactCompletenessPercent: initialData.trustedContactCompletenessPercent ?? 50,
    beneficiaryReviewStatus: initialData.beneficiaryReviewStatus || 'None',
    riskToleranceCurrentPercent: initialData.riskToleranceCurrentPercent ?? 50,
    investmentObjectiveCurrentPercent: initialData.investmentObjectiveCurrentPercent ?? 50,
    missingSignatureRiskScore: initialData.missingSignatureRiskScore ?? 3,
    documentStorageQualityScore: initialData.documentStorageQualityScore ?? 5,

    // Transfer Complexity
    percentIraAccounts: initialData.percentIraAccounts ?? 50,
    percentTrustAccounts: initialData.percentTrustAccounts ?? 15,
    percentEntityAccounts: initialData.percentEntityAccounts ?? 5,
    percentAnnuityAltAccounts: initialData.percentAnnuityAltAccounts ?? 10,
    directBusinessAmount: initialData.directBusinessAmount || '',
    heldAwayAssetsNotes: initialData.heldAwayAssetsNotes || '',
    transferComplexityScore: initialData.transferComplexityScore ?? 5,

    // Operational
    staffCapacityScore: initialData.staffCapacityScore ?? 5,
    crmExportQualityScore: initialData.crmExportQualityScore ?? 5,
    taskManagementScore: initialData.taskManagementScore ?? 5,
    digitalSignatureReadinessScore: initialData.digitalSignatureReadinessScore ?? 5,
    communicationPlanScore: initialData.communicationPlanScore ?? 5,

    // Compliance
    employmentAgreementReviewed: initialData.employmentAgreementReviewed ?? false,
    nonSolicitNonCompeteConcerns: initialData.nonSolicitNonCompeteConcerns ?? false,
    legalReviewStatus: initialData.legalReviewStatus || 'None',
    complianceRiskNotes: initialData.complianceRiskNotes || '',
  });

  const step2Sections = [
    'Client Data Completeness',
    'Household Relationships',
    'Contact Information',
    'Trusted Contacts',
    'Beneficiaries',
    'Client Reviews',
    'Risk Profiles',
    'Investment Objectives',
    'Client Notes',
    'Special Client Circumstances'
  ];

  const step3Sections = [
    'CRM',
    'Document Storage',
    'Digital Signatures',
    'Workflow',
    'Staff Responsibilities',
    'Task Management',
    'Calendar & Follow-up',
    'File Organization',
    'Reporting',
    'Business Continuity'
  ];

  const step4Sections = [
    'Account Types',
    'Trust Accounts',
    'Entity Accounts',
    'Retirement Accounts',
    'Insurance Business',
    'Alternative Investments',
    'Direct Business',
    'Held Away Assets',
    'Concentration Risk',
    'Special Transfer Considerations'
  ];

  const categoriesList = [
    { key: 'email', label: 'Email Addresses' },
    { key: 'phone', label: 'Phone Numbers' },
    { key: 'address', label: 'Mailing Addresses' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'ssn', label: 'Social Security / Tax ID' },
    { key: 'employment', label: 'Employment Information' },
    { key: 'income', label: 'Annual Income' },
    { key: 'netWorth', label: 'Net Worth' },
    { key: 'experience', label: 'Investment Experience' },
  ];

  const calculateOverallCompleteness = () => {
    let sum = 0;
    let count = 0;
    Object.keys(clientCriteria).forEach(key => {
      const crit = clientCriteria[key as keyof typeof clientCriteria];
      if (crit.status === 'Meets Expectations') {
        sum += 100;
        count++;
      } else if (crit.status === 'Needs Review') {
        sum += 50;
        count++;
      } else if (crit.status === 'Deficiency Identified') {
        sum += 0;
        count++;
      }
      // Not Applicable is ignored (count and sum not incremented)
    });
    return count > 0 ? Math.round(sum / count) : 0;
  };

  const getRatingInfo = (score: number) => {
    if (score >= 90) return { label: 'Green', bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    if (score >= 75) return { label: 'Yellow', bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-500/30' };
    if (score >= 60) return { label: 'Orange', bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-500/30' };
    return { label: 'Red', bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-500/30' };
  };

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.advisorName || !formData.firmName) {
      setError('Advisor Name and Firm Name are required fields.');
      setActiveTab('profile');
      return;
    }

    setLoading(true);
    setError(null);

    const getPercentFromStatus = (status: string) => {
      if (status === 'Meets Expectations') return 100;
      if (status === 'Needs Review') return 50;
      if (status === 'Deficiency Identified') return 0;
      return 100; // Not Applicable
    };

    // Serialize all advisor profile, assessment status, criteria, and evidence info into the notes column
    const serializedNotes = `
[Assessment Evidence]
Primary Source: ${evidenceData.primaryEvidenceSource}
Confidence: ${evidenceData.confidenceLevel}
Reviewer: ${evidenceData.reviewer}
Date: ${evidenceData.assessmentDate}
Notes: ${evidenceData.assessmentNotes}
Documents: ${evidenceData.supportingDocumentsReviewed}

[Advisor Profile]
Primary Contact: ${advisorProfile.primaryContact}
Title: ${advisorProfile.title}
Email: ${advisorProfile.email}
Mobile Phone: ${advisorProfile.mobilePhone}
EA Name: ${advisorProfile.eaName}
EA Email: ${advisorProfile.eaEmail}
EA Phone: ${advisorProfile.eaPhone}
Team Members: ${advisorProfile.teamMembers.join(', ')}
Current Affiliation: ${advisorProfile.currentFirmAffiliation}
Years In Business: ${advisorProfile.yearsInBusiness}
Years At Current Firm: ${advisorProfile.yearsAtCurrentFirm}
Timeline: ${advisorProfile.expectedTransitionTimeline}
Reason: ${advisorProfile.reasonForTransition}

[Assessment Status]
Stage: ${assessmentStatus.stage}
Owner: ${assessmentStatus.owner}
Priority: ${assessmentStatus.priority}
Expected Completion Date: ${assessmentStatus.expectedCompletionDate}
Tags: ${assessmentStatus.tags.join(', ')}
Internal Notes: ${assessmentStatus.internalNotes}

[Client Data Completeness Criteria]
${Object.keys(clientCriteria).map(k => {
  const c = clientCriteria[k as keyof typeof clientCriteria];
  const evSummary = (c.evidenceSummary || '').replace(/\n/g, ' ').replace(/\|/g, '');
  const comms = (c.comments || '').replace(/\n/g, ' ').replace(/\|/g, '');
  return `${k}: status=${c.status} | comments=${comms} | createFinding=${c.createFinding} | evidenceType=${c.evidenceType} | evidenceSummary=${evSummary} | evidenceConfidence=${c.evidenceConfidence} | evidenceReviewedBy=${c.evidenceReviewedBy} | evidenceReviewDate=${c.evidenceReviewDate}`;
}).join('\n')}

[General Notes]
${formData.notes}
`.trim();

    // Sync clientIntelligence back to original formData fields so they persist in the db
    const finalPayload = {
      ...formData,
      notes: serializedNotes,
      emailCompletenessPercent: getPercentFromStatus(clientCriteria.email.status),
      phoneCompletenessPercent: getPercentFromStatus(clientCriteria.phone.status),
      addressCompletenessPercent: getPercentFromStatus(clientCriteria.address.status),
    };

    const url = isEdit ? `/api/audits/${initialData.id}` : '/api/audits';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save assessment.');
      }

      router.push(`/audits/${data.id || initialData.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const steps: { id: TabType; label: string }[] = [
    { id: 'profile', label: 'Practice Profile' },
    { id: 'clientIntelligence', label: 'Client Intelligence' },
    { id: 'operationalReadiness', label: 'Operational Readiness' },
    { id: 'transitionComplexity', label: 'Transition Complexity' },
    { id: 'review', label: 'Review' },
  ];

  const navigateTab = (direction: 'next' | 'back') => {
    const tabOrder: TabType[] = ['profile', 'clientIntelligence', 'operationalReadiness', 'transitionComplexity', 'review'];
    const currentIndex = tabOrder.indexOf(activeTab);
    
    if (direction === 'next' && currentIndex < tabOrder.length - 1) {
      if (activeTab === 'profile') {
        if (!formData.advisorName || !formData.firmName) {
          setError('Advisor Name and Firm Name are required fields.');
          return;
        }
        setError(null);
      }
      setActiveTab(tabOrder[currentIndex + 1]);
    } else if (direction === 'back' && currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {isEdit ? `Edit Assessment: ${formData.advisorName}` : 'New Assessment'}
          </h1>
          <p className="text-sm text-slate-400">
            {isEdit 
              ? 'Modify advisor metrics and update computed Know Your Book™ Index scores.'
              : 'Enter advisor book statistics from discovery calls to assess transition readiness.'
            }
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => router.push(isEdit ? `/audits/${initialData.id}` : '/dashboard')}
          className="flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Cancel
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded bg-rose-950/40 border border-rose-500/30 text-rose-400 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Step Progress Indicator */}
      <div className="flex items-center justify-between border border-slate-700/60 bg-[#1c2541]/50 rounded-lg p-4 select-none overflow-x-auto gap-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                activeTab === step.id
                  ? 'bg-[#d4af37] text-[#0b1329]'
                  : index < steps.indexOf(steps.find(s => s.id === activeTab)!)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {index + 1}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                activeTab === step.id ? 'text-slate-100' : 'text-slate-500'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="text-slate-600 font-light mx-2 shrink-0">→</div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Form Content Cards */}
      <Card>
        <CardContent className="pt-6">
          
          {/* STEP 1: PRACTICE PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700/40 pb-2">Practice Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="advisorName">Advisor Name *</Label>
                  <Input
                    id="advisorName"
                    name="advisorName"
                    value={formData.advisorName}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="firmName">Firm Name *</Label>
                  <Input
                    id="firmName"
                    name="firmName"
                    value={formData.firmName}
                    onChange={handleChange}
                    placeholder="e.g. Alpha Wealth Management"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currentFirm">Current Firm (Broker-Dealer/RIA)</Label>
                  <Input
                    id="currentFirm"
                    name="currentFirm"
                    value={formData.currentFirm}
                    onChange={handleChange}
                    placeholder="e.g. Wells Fargo Advisors"
                  />
                </div>
                <div>
                  <Label htmlFor="currentCustodian">Current Custodian</Label>
                  <Input
                    id="currentCustodian"
                    name="currentCustodian"
                    value={formData.currentCustodian}
                    onChange={handleChange}
                    placeholder="e.g. First Clearing"
                  />
                </div>
                <div>
                  <Label htmlFor="futureCustodian">Future Custodian Target (Optional)</Label>
                  <Input
                    id="futureCustodian"
                    name="futureCustodian"
                    value={formData.futureCustodian}
                    onChange={handleChange}
                    placeholder="e.g. Schwab / Fidelity"
                  />
                </div>
                <div>
                  <Label htmlFor="businessModel">Business Model</Label>
                  <Select
                    id="businessModel"
                    name="businessModel"
                    value={formData.businessModel}
                    onChange={handleChange}
                  >
                    <option value="RIA">RIA</option>
                    <option value="Broker Dealer">Broker Dealer</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Unknown">Unknown</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="protocolStatus">Protocol Status</Label>
                  <Select
                    id="protocolStatus"
                    name="protocolStatus"
                    value={formData.protocolStatus}
                    onChange={handleChange}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Unsure">Unsure</option>
                  </Select>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700/40 pb-2 pt-2">Financials & Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="totalAum">AUM ($ Millions)</Label>
                  <Input
                    id="totalAum"
                    name="totalAum"
                    type="number"
                    step="any"
                    value={formData.totalAum}
                    onChange={handleChange}
                    placeholder="e.g. 150.5"
                  />
                </div>
                <div>
                  <Label htmlFor="annualRevenue">Annual Revenue ($)</Label>
                  <Input
                    id="annualRevenue"
                    name="annualRevenue"
                    type="number"
                    value={formData.annualRevenue}
                    onChange={handleChange}
                    placeholder="e.g. 1200000"
                  />
                </div>
                <div>
                  <Label htmlFor="households">Number of Households</Label>
                  <Input
                    id="households"
                    name="households"
                    type="number"
                    value={formData.households}
                    onChange={handleChange}
                    placeholder="e.g. 180"
                  />
                </div>
                <div>
                  <Label htmlFor="accounts">Number of Accounts</Label>
                  <Input
                    id="accounts"
                    name="accounts"
                    type="number"
                    value={formData.accounts}
                    onChange={handleChange}
                    placeholder="e.g. 450"
                  />
                </div>
                <div>
                  <Label htmlFor="staffCount">Staff Count</Label>
                  <Input
                    id="staffCount"
                    name="staffCount"
                    type="number"
                    value={formData.staffCount}
                    onChange={handleChange}
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="crm">CRM</Label>
                <Input
                  id="crm"
                  name="crm"
                  value={formData.crm}
                  onChange={handleChange}
                  placeholder="e.g. Redtail, Salesforce, Wealthbox"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Summarize findings from discovery calls..."
                />
              </div>

              {/* Advisor Profile Group */}
              <div className="border-t border-slate-700/60 pt-6 mt-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700/40 pb-2">Advisor Profile</h3>
                
                {/* Primary Contact Group */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-300 text-sm">Primary Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="primaryContact">Name</Label>
                      <Input
                        id="primaryContact"
                        value={advisorProfile.primaryContact}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, primaryContact: e.target.value }))}
                        placeholder="Primary contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="profileTitle">Title</Label>
                      <Input
                        id="profileTitle"
                        value={advisorProfile.title}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Managing Partner"
                      />
                    </div>
                    <div>
                      <Label htmlFor="profileEmail">Email</Label>
                      <Input
                        id="profileEmail"
                        type="email"
                        value={advisorProfile.email}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="advisor@firm.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="profileMobile">Mobile Phone</Label>
                      <Input
                        id="profileMobile"
                        value={advisorProfile.mobilePhone}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, mobilePhone: e.target.value }))}
                        placeholder="Mobile number"
                      />
                    </div>
                  </div>
                </div>

                {/* Executive Assistant Group */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-slate-300 text-sm">Executive Assistant</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="eaName">Name</Label>
                      <Input
                        id="eaName"
                        value={advisorProfile.eaName}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, eaName: e.target.value }))}
                        placeholder="EA name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eaEmail">Email</Label>
                      <Input
                        id="eaEmail"
                        type="email"
                        value={advisorProfile.eaEmail}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, eaEmail: e.target.value }))}
                        placeholder="ea@firm.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="eaPhone">Phone</Label>
                      <Input
                        id="eaPhone"
                        value={advisorProfile.eaPhone}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, eaPhone: e.target.value }))}
                        placeholder="EA phone"
                      />
                    </div>
                  </div>
                </div>

                {/* Transition Team Members Group */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-slate-300 text-sm">Transition Team Members</h4>
                  <div className="flex gap-3 max-w-md">
                    <Input
                      id="newTeamMember"
                      value={newTeamMember}
                      onChange={(e) => setNewTeamMember(e.target.value)}
                      placeholder="Add team member name..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (newTeamMember.trim()) {
                          setAdvisorProfile(prev => ({
                            ...prev,
                            teamMembers: [...prev.teamMembers, newTeamMember.trim()]
                          }));
                          setNewTeamMember('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {advisorProfile.teamMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {advisorProfile.teamMembers.map((member, index) => (
                        <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200">
                          <span>{member}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAdvisorProfile(prev => ({
                                ...prev,
                                teamMembers: prev.teamMembers.filter((_, idx) => idx !== index)
                              }));
                            }}
                            className="text-slate-400 hover:text-rose-400 font-bold ml-1 text-sm focus:outline-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Affiliations & Timelines Group */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-slate-300 text-sm">Affiliations & Timeline</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="currentFirmAffiliation">Current Firm Affiliation</Label>
                      <Select
                        id="currentFirmAffiliation"
                        value={advisorProfile.currentFirmAffiliation}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, currentFirmAffiliation: e.target.value }))}
                      >
                        <option value="Independent RIA">Independent RIA</option>
                        <option value="Hybrid RIA">Hybrid RIA</option>
                        <option value="Wirehouse">Wirehouse</option>
                        <option value="Independent Broker Dealer">Independent Broker Dealer</option>
                        <option value="Regional Broker Dealer">Regional Broker Dealer</option>
                        <option value="Bank">Bank</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Other">Other</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="yearsInBusiness">Years in Business</Label>
                      <Input
                        id="yearsInBusiness"
                        type="number"
                        value={advisorProfile.yearsInBusiness}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, yearsInBusiness: e.target.value }))}
                        placeholder="Years"
                      />
                    </div>
                    <div>
                      <Label htmlFor="yearsAtCurrentFirm">Years at Current Firm</Label>
                      <Input
                        id="yearsAtCurrentFirm"
                        type="number"
                        value={advisorProfile.yearsAtCurrentFirm}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, yearsAtCurrentFirm: e.target.value }))}
                        placeholder="Years"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expectedTransitionTimeline">Expected Transition Timeline</Label>
                      <Select
                        id="expectedTransitionTimeline"
                        value={advisorProfile.expectedTransitionTimeline}
                        onChange={(e) => setAdvisorProfile(prev => ({ ...prev, expectedTransitionTimeline: e.target.value }))}
                      >
                        <option value="Researching">Researching</option>
                        <option value="3-6 Months">3-6 Months</option>
                        <option value="6-12 Months">6-12 Months</option>
                        <option value="12+ Months">12+ Months</option>
                        <option value="Unknown">Unknown</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Reason for Transition Group */}
                <div>
                  <Label htmlFor="reasonForTransition">Reason for Considering a Transition</Label>
                  <Textarea
                    id="reasonForTransition"
                    value={advisorProfile.reasonForTransition}
                    onChange={(e) => setAdvisorProfile(prev => ({ ...prev, reasonForTransition: e.target.value }))}
                    placeholder="Enter multiline details of why they are considering transitioning..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Assessment Status Group */}
              <div className="border-t border-slate-700/60 pt-6 mt-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700/40 pb-2">Assessment Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="assessmentStage">Assessment Stage</Label>
                    <Select
                      id="assessmentStage"
                      value={assessmentStatus.stage}
                      onChange={(e) => setAssessmentStatus(prev => ({ ...prev, stage: e.target.value }))}
                    >
                      <option value="Discovery Call Scheduled">Discovery Call Scheduled</option>
                      <option value="Discovery Complete">Discovery Complete</option>
                      <option value="Assessment In Progress">Assessment In Progress</option>
                      <option value="Waiting on Advisor">Waiting on Advisor</option>
                      <option value="Waiting on Staff">Waiting on Staff</option>
                      <option value="Assessment Complete">Assessment Complete</option>
                      <option value="Cleanup In Progress">Cleanup In Progress</option>
                      <option value="Transition Planning">Transition Planning</option>
                      <option value="Transition Ready">Transition Ready</option>
                      <option value="Client Engaged">Client Engaged</option>
                      <option value="Archived">Archived</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assessmentOwner">Assessment Owner</Label>
                    <Select
                      id="assessmentOwner"
                      value={assessmentStatus.owner}
                      onChange={(e) => setAssessmentStatus(prev => ({ ...prev, owner: e.target.value }))}
                    >
                      <option value="CTS Admin">CTS Admin</option>
                      <option value="CTS Staff">CTS Staff</option>
                      <option value="CTS Advisor Success">CTS Advisor Success</option>
                      <option value="CTS Transition Manager">CTS Transition Manager</option>
                      {reviewerName && <option value={reviewerName}>{reviewerName}</option>}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assessmentPriority">Priority</Label>
                    <Select
                      id="assessmentPriority"
                      value={assessmentStatus.priority}
                      onChange={(e) => setAssessmentStatus(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="expectedCompletionDate">Expected Completion Date</Label>
                    <Input
                      id="expectedCompletionDate"
                      type="date"
                      value={assessmentStatus.expectedCompletionDate}
                      onChange={(e) => setAssessmentStatus(prev => ({ ...prev, expectedCompletionDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Internal Tags Group */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-slate-300 text-sm">Internal Tags</h4>
                  <div className="flex gap-3 max-w-md">
                    <Input
                      id="newTag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag (e.g. RIA, Wirehouse, Protocol)..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (newTag.trim()) {
                          setAssessmentStatus(prev => ({
                            ...prev,
                            tags: [...prev.tags, newTag.trim()]
                          }));
                          setNewTag('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {/* Preset Tags Clicker */}
                  <div className="flex flex-wrap gap-1.5 items-center pt-1.5">
                    <span className="text-slate-400 text-xs mr-1 font-medium">Quick presets:</span>
                    {['RIA', 'Wirehouse', 'Protocol', 'Non-Protocol', 'Large Book', 'Complex Trusts', 'Hybrid', 'High Priority'].map(preset => {
                      const hasTag = assessmentStatus.tags.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            if (hasTag) {
                              setAssessmentStatus(prev => ({
                                ...prev,
                                tags: prev.tags.filter(t => t !== preset)
                              }));
                            } else {
                              setAssessmentStatus(prev => ({
                                ...prev,
                                tags: [...prev.tags, preset]
                              }));
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-200 font-semibold ${
                            hasTag 
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>

                  {assessmentStatus.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {assessmentStatus.tags.map((tag, index) => (
                        <div key={index} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200">
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAssessmentStatus(prev => ({
                                ...prev,
                                tags: prev.tags.filter((_, idx) => idx !== index)
                              }));
                            }}
                            className="text-slate-400 hover:text-rose-400 font-bold ml-1 text-sm focus:outline-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Internal CTS Notes */}
                <div>
                  <Label htmlFor="internalNotes">Internal CTS Notes</Label>
                  <Textarea
                    id="internalNotes"
                    value={assessmentStatus.internalNotes}
                    onChange={(e) => setAssessmentStatus(prev => ({ ...prev, internalNotes: e.target.value }))}
                    placeholder="Enter large multiline internal CTS notes..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CLIENT INTELLIGENCE */}
          {activeTab === 'clientIntelligence' && (
            <div className="space-y-4">
              <div className="border-b border-slate-700/40 pb-3 mb-6">
                <h3 className="text-xl font-bold text-slate-100">Client Intelligence</h3>
                <p className="text-xs text-slate-400 mt-1">Information architecture guidelines for client intelligence parameters.</p>
              </div>
              <div className="space-y-3">
                {step2Sections.map((section) => {
                  const isOpen = !!openSections[section];
                  return (
                    <div key={section} className="border border-slate-700/60 rounded-lg overflow-hidden bg-[#111930]/40 transition-all duration-200">
                      <button
                        type="button"
                        onClick={() => toggleSection(section)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-200 hover:bg-slate-800/10 transition-all duration-200"
                      >
                        <span>{section}</span>
                        <span className="text-slate-400 font-semibold text-base">
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </button>
                      
                      {isOpen && (
                        <div className="px-5 py-4 border-t border-slate-700/40 bg-[#0b1329]/50 min-h-[40px]">
                          {section === 'Client Data Completeness' ? (
                            <div className="space-y-4 bg-slate-900/20 p-5 rounded-lg border border-slate-700/40 text-sm">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label htmlFor="evidenceType">Evidence Type</Label>
                                  <Select
                                    id="evidenceType"
                                    value={clientIntelligence.evidenceType}
                                    onChange={(e) => setClientIntelligence(prev => ({ ...prev, evidenceType: e.target.value }))}
                                  >
                                    <option value="CRM Export">CRM Export</option>
                                    <option value="Custodian Export">Custodian Export</option>
                                    <option value="Manual Review">Manual Review</option>
                                    <option value="Advisor Interview">Advisor Interview</option>
                                    <option value="Other">Other</option>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="householdsReviewed">Households Reviewed</Label>
                                  <Input
                                    id="householdsReviewed"
                                    type="number"
                                    value={clientIntelligence.householdsReviewed}
                                    onChange={(e) => setClientIntelligence(prev => ({ ...prev, householdsReviewed: e.target.value }))}
                                    placeholder="e.g. 150"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="estimatedTotalHouseholds">Estimated Total Households</Label>
                                  <Input
                                    id="estimatedTotalHouseholds"
                                    type="number"
                                    value={clientIntelligence.estimatedTotalHouseholds}
                                    onChange={(e) => setClientIntelligence(prev => ({ ...prev, estimatedTotalHouseholds: e.target.value }))}
                                    placeholder="e.g. 180"
                                  />
                                </div>
                              </div>

                              <div className="border-t border-slate-700/40 pt-4">
                                <h4 className="font-bold text-slate-200 text-sm mb-3">Structured Criteria & Gaps</h4>
                                <div className="space-y-4">
                                  {categoriesList.map((cat) => {
                                    const crit = clientCriteria[cat.key as keyof typeof clientCriteria] || { status: 'Meets Expectations', comments: '', createFinding: false };
                                    return (
                                      <div key={cat.key} className="border-b border-slate-800 pb-3">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                                          <div className="lg:col-span-3 font-semibold text-slate-350 text-xs pt-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span>{cat.label}</span>
                                              {crit.evidenceSummary ? (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-wider select-none">
                                                  Evidence Logged
                                                </span>
                                              ) : (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-850 text-slate-500 border border-slate-700/60 rounded font-semibold select-none">
                                                  No Evidence
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="lg:col-span-3">
                                            <select
                                              value={crit.status}
                                              onChange={(e) => {
                                                const newStatus = e.target.value;
                                                const autoCheck = newStatus === 'Needs Review' || newStatus === 'Deficiency Identified';
                                                setClientCriteria(prev => ({
                                                  ...prev,
                                                  [cat.key]: {
                                                    ...prev[cat.key as keyof typeof clientCriteria],
                                                    status: newStatus,
                                                    createFinding: autoCheck ? true : prev[cat.key as keyof typeof clientCriteria].createFinding
                                                  }
                                                }));
                                              }}
                                              className="w-full bg-[#0b1329] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37]"
                                            >
                                              <option value="Meets Expectations">Meets Expectations</option>
                                              <option value="Needs Review">Needs Review</option>
                                              <option value="Deficiency Identified">Deficiency Identified</option>
                                              <option value="Not Applicable">Not Applicable</option>
                                            </select>
                                          </div>
                                          <div className="lg:col-span-4">
                                            <textarea
                                              value={crit.comments}
                                              onChange={(e) => {
                                                const newComments = e.target.value;
                                                setClientCriteria(prev => ({
                                                  ...prev,
                                                  [cat.key]: {
                                                    ...prev[cat.key as keyof typeof clientCriteria],
                                                    comments: newComments
                                                  }
                                                }));
                                              }}
                                              placeholder="Reviewer Comments..."
                                              rows={1}
                                              className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37] resize-none"
                                            />
                                          </div>
                                          <div className="lg:col-span-2 flex items-center justify-between pt-2">
                                            <div className="flex items-center">
                                              <input
                                                type="checkbox"
                                                id={`createFinding-${cat.key}`}
                                                checked={crit.createFinding}
                                                onChange={(e) => {
                                                  const checked = e.target.checked;
                                                  setClientCriteria(prev => ({
                                                    ...prev,
                                                    [cat.key]: {
                                                      ...prev[cat.key as keyof typeof clientCriteria],
                                                      createFinding: checked
                                                    }
                                                  }));
                                                }}
                                                className="w-4 h-4 rounded text-[#d4af37] bg-[#0b1329] border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                              />
                                              <label htmlFor={`createFinding-${cat.key}`} className="text-xs font-bold text-slate-350 cursor-pointer ml-1.5 select-none">
                                                Finding
                                              </label>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setExpandedEvidence(prev => ({
                                                  ...prev,
                                                  [cat.key]: !prev[cat.key]
                                                }));
                                              }}
                                              className="text-xs font-bold text-[#d4af37] hover:text-[#f3d36b] transition-colors ml-2 select-none"
                                            >
                                              {expandedEvidence[cat.key] ? 'Close' : 'Evidence'}
                                            </button>
                                          </div>
                                        </div>

                                        {expandedEvidence[cat.key] && (
                                          <div className="mt-3 p-4 bg-slate-900/40 rounded-lg border border-slate-800/80 space-y-3 text-slate-200">
                                            <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Log Evidence — {cat.label}</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-500">Evidence Type</label>
                                                <select
                                                  value={crit.evidenceType || 'CRM Export'}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setClientCriteria(prev => ({
                                                      ...prev,
                                                      [cat.key]: {
                                                        ...prev[cat.key as keyof typeof clientCriteria],
                                                        evidenceType: val
                                                      }
                                                    }));
                                                  }}
                                                  className="w-full bg-[#0b1329] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37]"
                                                >
                                                  <option value="CRM Export">CRM Export</option>
                                                  <option value="Custodian Export">Custodian Export</option>
                                                  <option value="Client File">Client File</option>
                                                  <option value="Sample File Review">Sample File Review</option>
                                                  <option value="Advisor Interview">Advisor Interview</option>
                                                  <option value="Staff Interview">Staff Interview</option>
                                                  <option value="Document Inventory">Document Inventory</option>
                                                  <option value="Compliance Manual">Compliance Manual</option>
                                                  <option value="Other">Other</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-500">Confidence Level</label>
                                                <select
                                                  value={crit.evidenceConfidence || 'High'}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setClientCriteria(prev => ({
                                                      ...prev,
                                                      [cat.key]: {
                                                        ...prev[cat.key as keyof typeof clientCriteria],
                                                        evidenceConfidence: val
                                                      }
                                                    }));
                                                  }}
                                                  className="w-full bg-[#0b1329] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37]"
                                                >
                                                  <option value="High">High</option>
                                                  <option value="Medium">Medium</option>
                                                  <option value="Low">Low</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-500">Supporting File</label>
                                                <div className="border border-dashed border-slate-700 rounded px-3 py-1.5 text-[10px] text-slate-500 bg-[#0b1329]/50 flex items-center justify-between cursor-not-allowed select-none">
                                                  <span>No file attached</span>
                                                  <span className="font-bold text-slate-600">Upload (Coming Soon)</span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-semibold text-slate-500">Evidence Summary *</label>
                                              <textarea
                                                value={crit.evidenceSummary || ''}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setClientCriteria(prev => ({
                                                    ...prev,
                                                    [cat.key]: {
                                                      ...prev[cat.key as keyof typeof clientCriteria],
                                                      evidenceSummary: val
                                                    }
                                                  }));
                                                }}
                                                placeholder="Provide detailed description of evidence, CRM exports, or interview files reviewed..."
                                                rows={2}
                                                className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37] resize-none"
                                              />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] text-slate-500 pt-1">
                                              <div>Reviewed By: <span className="font-semibold text-slate-400">{crit.evidenceReviewedBy}</span></div>
                                              <div className="md:text-right">Review Date: <span className="font-semibold text-slate-400">{crit.evidenceReviewDate}</span></div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Overall score calculation display */}
                              {(() => {
                                const score = calculateOverallCompleteness();
                                const rating = getRatingInfo(score);
                                return (
                                  <div className={`mt-6 p-4 rounded-lg border ${rating.border} ${rating.bg} flex items-center justify-between`}>
                                    <div>
                                      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Overall Client Data Completeness</span>
                                      <span className="text-xs text-slate-500 mt-1 block">Average of all categories</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-widest ${
                                        rating.label === 'Green' ? 'bg-[#10b981]/20 text-[#10b981]' :
                                        rating.label === 'Yellow' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                                        rating.label === 'Orange' ? 'bg-[#f97316]/20 text-[#f97316]' :
                                        'bg-[#ef4444]/20 text-[#ef4444]'
                                      }`}>
                                        {rating.label}
                                      </span>
                                      <span className="text-3xl font-extrabold text-slate-100">
                                        {score}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 italic">
                              (Empty)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: OPERATIONAL READINESS */}
          {activeTab === 'operationalReadiness' && (
            <div className="space-y-4">
              <div className="border-b border-slate-700/40 pb-3 mb-6">
                <h3 className="text-xl font-bold text-slate-100">Operational Readiness</h3>
                <p className="text-xs text-slate-400 mt-1">Information architecture guidelines for operational parameters.</p>
              </div>
              <div className="space-y-3">
                {step3Sections.map((section) => {
                  const isOpen = !!openSections[section];
                  return (
                    <div key={section} className="border border-slate-700/60 rounded-lg overflow-hidden bg-[#111930]/40 transition-all duration-200">
                      <button
                        type="button"
                        onClick={() => toggleSection(section)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-200 hover:bg-slate-800/10 transition-all duration-200"
                      >
                        <span>{section}</span>
                        <span className="text-slate-400 font-semibold text-base">
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-5 py-4 border-t border-slate-700/40 text-xs text-slate-500 italic bg-[#0b1329]/50 min-h-[40px]">
                          (Empty)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: TRANSITION COMPLEXITY */}
          {activeTab === 'transitionComplexity' && (
            <div className="space-y-4">
              <div className="border-b border-slate-700/40 pb-3 mb-6">
                <h3 className="text-xl font-bold text-slate-100">Transition Complexity</h3>
                <p className="text-xs text-slate-400 mt-1">Information architecture guidelines for transfer and complexity parameters.</p>
              </div>
              <div className="space-y-3">
                {step4Sections.map((section) => {
                  const isOpen = !!openSections[section];
                  return (
                    <div key={section} className="border border-slate-700/60 rounded-lg overflow-hidden bg-[#111930]/40 transition-all duration-200">
                      <button
                        type="button"
                        onClick={() => toggleSection(section)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-200 hover:bg-slate-800/10 transition-all duration-200"
                      >
                        <span>{section}</span>
                        <span className="text-slate-400 font-semibold text-base">
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-5 py-4 border-t border-slate-700/40 text-xs text-slate-500 italic bg-[#0b1329]/50 min-h-[40px]">
                          (Empty)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700/40 pb-2">Review Assessment Profile</h3>
              
              <div className="bg-[#111930] rounded-lg p-6 border border-slate-700/40 space-y-6 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <span className="text-slate-400 font-medium block">Advisor Name:</span>
                    <span className="text-slate-100 font-bold text-base mt-0.5 block">{formData.advisorName || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Firm Name:</span>
                    <span className="text-slate-100 font-bold text-base mt-0.5 block">{formData.firmName || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Current Firm:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.currentFirm || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Current Custodian:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.currentCustodian || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Future Custodian:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.futureCustodian || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Business Model:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.businessModel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Protocol Status:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.protocolStatus}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">AUM ($ Millions):</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.totalAum ? `$${formData.totalAum}M` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Annual Revenue:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">
                      {formData.annualRevenue ? `$${Number(formData.annualRevenue).toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Number of Households:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.households || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Number of Accounts:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.accounts || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Staff Count:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.staffCount || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">CRM:</span>
                    <span className="text-slate-200 font-semibold mt-0.5 block">{formData.crm || 'N/A'}</span>
                  </div>
                </div>

                {formData.notes && (
                  <div className="border-t border-slate-700/40 pt-4">
                    <span className="text-slate-400 font-medium block mb-1">Notes:</span>
                    <p className="text-slate-300 whitespace-pre-line bg-slate-900/40 p-4 rounded border border-slate-800/80 leading-relaxed">
                      {formData.notes}
                    </p>
                  </div>
                )}

                {/* Advisor Profile Review Section */}
                <div className="border-t border-slate-700/40 pt-4 space-y-3">
                  <span className="text-[#d4af37] font-semibold block uppercase tracking-wider">Advisor Profile Summary</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <span className="text-slate-400 font-medium block">Primary Contact:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">
                        {advisorProfile.primaryContact || 'N/A'} {advisorProfile.title ? `(${advisorProfile.title})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Contact Info:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">
                        {advisorProfile.email ? `${advisorProfile.email} | ` : ''} {advisorProfile.mobilePhone || 'No Phone'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Executive Assistant:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">
                        {advisorProfile.eaName || 'None'} {advisorProfile.eaEmail ? `(${advisorProfile.eaEmail})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Transition Team:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">
                        {advisorProfile.teamMembers.length > 0 ? advisorProfile.teamMembers.join(', ') : 'None added'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Affiliation:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">{advisorProfile.currentFirmAffiliation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Timeline:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">{advisorProfile.expectedTransitionTimeline}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Experience:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">
                        {advisorProfile.yearsInBusiness ? `${advisorProfile.yearsInBusiness} Years in Business` : 'N/A'} 
                        {advisorProfile.yearsAtCurrentFirm ? ` | ${advisorProfile.yearsAtCurrentFirm} Years at Current Firm` : ''}
                      </span>
                    </div>
                  </div>
                  {advisorProfile.reasonForTransition && (
                    <div className="pt-2">
                      <span className="text-slate-400 font-medium block mb-1">Reason for Transition:</span>
                      <p className="text-slate-300 whitespace-pre-line bg-slate-900/20 p-3 rounded border border-slate-800/80 leading-relaxed">
                        {advisorProfile.reasonForTransition}
                      </p>
                    </div>
                  )}
                </div>

                {/* Assessment Status Review Section */}
                <div className="border-t border-slate-700/40 pt-4 space-y-3">
                  <span className="text-[#d4af37] font-semibold block uppercase tracking-wider">Assessment Status Summary</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <span className="text-slate-400 font-medium block">Assessment Stage:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">{assessmentStatus.stage}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Assessment Owner:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">{assessmentStatus.owner}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Priority Level:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">{assessmentStatus.priority}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Expected Completion:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">{assessmentStatus.expectedCompletionDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Internal Tags:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">
                        {assessmentStatus.tags.length > 0 ? assessmentStatus.tags.join(', ') : 'None'}
                      </span>
                    </div>
                  </div>
                  {assessmentStatus.internalNotes && (
                    <div className="pt-2">
                      <span className="text-slate-400 font-medium block mb-1">Internal CTS Notes:</span>
                      <p className="text-slate-300 whitespace-pre-line bg-slate-900/20 p-3 rounded border border-slate-800/80 leading-relaxed">
                        {assessmentStatus.internalNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Client Intelligence Review Section */}
                <div className="border-t border-slate-700/40 pt-4 space-y-3">
                  <span className="text-[#d4af37] font-semibold block uppercase tracking-wider">Client Intelligence Summary</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <span className="text-slate-400 font-medium block">Evidence Type:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">{clientIntelligence.evidenceType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Households Reviewed / Total:</span>
                      <span className="text-slate-200 font-semibold mt-0.5 block">
                        {clientIntelligence.householdsReviewed || 'N/A'} / {clientIntelligence.estimatedTotalHouseholds || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Overall Data Completeness Score:</span>
                      <span className="text-slate-100 font-bold mt-0.5 block">{calculateOverallCompleteness()}%</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Assessment Evidence Section */}
                <div className="border border-slate-700/60 rounded-lg overflow-hidden bg-[#111930]/40 mt-6">
                  <button
                    type="button"
                    onClick={() => toggleSection('Assessment Evidence')}
                    className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-slate-200 hover:bg-slate-800/10 transition-all duration-200"
                  >
                    <span>Assessment Evidence</span>
                    <span className="text-slate-400 font-semibold text-base">
                      {openSections['Assessment Evidence'] ? '▲' : '▼'}
                    </span>
                  </button>

                  {openSections['Assessment Evidence'] && (
                    <div className="p-5 space-y-4 text-sm border-t border-slate-700/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="primaryEvidenceSource">Primary Evidence Source</Label>
                          <Select
                            id="primaryEvidenceSource"
                            value={evidenceData.primaryEvidenceSource}
                            onChange={(e) => setEvidenceData(prev => ({ ...prev, primaryEvidenceSource: e.target.value }))}
                          >
                            <option value="CRM Export">CRM Export</option>
                            <option value="Custodian Export">Custodian Export</option>
                            <option value="Advisor Interview">Advisor Interview</option>
                            <option value="Staff Interview">Staff Interview</option>
                            <option value="Manual Sample Review">Manual Sample Review</option>
                            <option value="Multiple Sources">Multiple Sources</option>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="confidenceLevel">Confidence Level</Label>
                          <Select
                            id="confidenceLevel"
                            value={evidenceData.confidenceLevel}
                            onChange={(e) => setEvidenceData(prev => ({ ...prev, confidenceLevel: e.target.value }))}
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="reviewer">Reviewer</Label>
                          <Input
                            id="reviewer"
                            type="text"
                            value={evidenceData.reviewer}
                            onChange={(e) => setEvidenceData(prev => ({ ...prev, reviewer: e.target.value }))}
                            placeholder="Reviewer Name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="assessmentDate">Assessment Date</Label>
                          <Input
                            id="assessmentDate"
                            type="date"
                            value={evidenceData.assessmentDate}
                            onChange={(e) => setEvidenceData(prev => ({ ...prev, assessmentDate: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="assessmentNotes">Assessment Notes</Label>
                        <Textarea
                          id="assessmentNotes"
                          value={evidenceData.assessmentNotes}
                          onChange={(e) => setEvidenceData(prev => ({ ...prev, assessmentNotes: e.target.value }))}
                          placeholder="Enter multiline assessment notes..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="supportingDocumentsReviewed">Supporting Documents Reviewed</Label>
                        <Textarea
                          id="supportingDocumentsReviewed"
                          value={evidenceData.supportingDocumentsReviewed}
                          onChange={(e) => setEvidenceData(prev => ({ ...prev, supportingDocumentsReviewed: e.target.value }))}
                          placeholder="Enter list of reviewed documents..."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-between border-t border-slate-700/40 pt-6 mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigateTab('back')}
            disabled={activeTab === 'profile'}
            className="flex items-center gap-1.5"
          >
            Previous
          </Button>

          {activeTab !== 'review' ? (
            <Button
              type="button"
              onClick={() => navigateTab('next')}
              className="flex items-center gap-1.5"
            >
              Next <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <Save size={16} /> {loading ? 'Saving...' : 'Save Assessment Details'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
