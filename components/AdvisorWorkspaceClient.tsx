'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Briefcase, Plus, FileText, Edit, Printer, CheckSquare, File, Phone, BookOpen, Clock, Users, Building, Mail, Trash2, Pin, Lock, FileUp, AlertTriangle, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';
import { getScoreRating } from '@/lib/scoring';

interface Contact {
  id: string;
  contactType: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  preferredContactMethod: string;
  roleInTransition: string | null;
  notes: string | null;
  primaryContact: boolean;
  createdAt: string;
}

interface JournalEntry {
  id: string;
  advisorId: string;
  title: string;
  entryType: string;
  date: string;
  author: string;
  summary: string;
  detailedNotes: string | null;
  confidential: boolean;
  pinned: boolean;
  createdAt: string;
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



interface Finding {
  id: string;
  assessmentId: string;
  category: string;
  title: string;
  description: string;
  severity: string; // Critical, High, Moderate, Low
  impact: string | null;
  recommendation: string | null;
  owner: string; // CTS, Advisor, Advisor Staff, Compliance, Legal, Unknown
  status: string; // Open, In Progress, Resolved, Not Applicable
  reviewerNotes: string | null;
  evidenceSummary: string | null;
  createdAt: string;

  priority: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  resolutionNotes: string | null;
}

interface Assessment {
  id: string;
  notes: string | null;
  overallReadinessScore: number;
  createdAt: string;
  findings: Finding[];
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
  name: string;
  primaryClientName: string;
  secondaryClientName: string | null;
  totalAum: number | null;
  revenue: number | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  readinessStatus: string;
  accounts: Account[];
}

interface Advisor {
  id: string;
  name: string;
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
  createdAt: string;
  assessments: Assessment[];
  contacts: Contact[];
  journalEntries: JournalEntry[];
  householdRecords: Household[];
}

const parseNotesField = (notesText: string | null) => {
  const defaults = {
    primaryContact: '',
    title: '',
    email: '',
    mobilePhone: '',
    eaName: '',
    eaEmail: '',
    eaPhone: '',
    teamMembers: [] as string[],
    reasonForTransition: '',
    expectedTransitionTimeline: 'Researching',
    stage: 'Discovery Call Scheduled',
    owner: 'CTS Admin',
    priority: 'Normal',
    tags: [] as string[],
    internalNotes: '',
    generalNotes: ''
  };

  if (!notesText) {
    return defaults;
  }

  try {
    const lines = notesText.split('\n');
    let primaryContact = '';
    let title = '';
    let email = '';
    let mobilePhone = '';
    let eaName = '';
    let eaEmail = '';
    let eaPhone = '';
    let teamMembers: string[] = [];
    let reasonForTransitionLines: string[] = [];
    let expectedTransitionTimeline = 'Researching';

    let stage = 'Discovery Call Scheduled';
    let owner = 'CTS Admin';
    let priority = 'Normal';
    let tags: string[] = [];
    let internalNotesLines: string[] = [];
    let generalNotesLines: string[] = [];
    
    let mode: 'none' | 'evidenceNotes' | 'docs' | 'reason' | 'internalNotes' | 'general' = 'none';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
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
      if (line.includes('[General Notes]')) {
        mode = 'general';
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
        stage = line.replace('Stage:', '').trim();
        continue;
      }
      if (line.startsWith('Owner:')) {
        owner = line.replace('Owner:', '').trim();
        continue;
      }
      if (line.startsWith('Priority:')) {
        priority = line.replace('Priority:', '').trim();
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
      if (mode === 'reason') {
        reasonForTransitionLines.push(line);
      } else if (mode === 'internalNotes') {
        internalNotesLines.push(line);
      } else if (mode === 'general') {
        generalNotesLines.push(line);
      }
    }

    return {
      primaryContact,
      title,
      email,
      mobilePhone,
      eaName,
      eaEmail,
      eaPhone,
      teamMembers,
      reasonForTransition: reasonForTransitionLines.join('\n').trim(),
      expectedTransitionTimeline,
      stage,
      owner,
      priority,
      tags,
      internalNotes: internalNotesLines.join('\n').trim(),
      generalNotes: generalNotesLines.join('\n').trim()
    };
  } catch (e) {
    return defaults;
  }
};

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

export default function AdvisorWorkspaceClient({ 
  advisor,
  activeProfiles = []
}: { 
  advisor: Advisor;
  activeProfiles?: ActiveProfile[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'findings' | 'contacts' | 'journal' | 'tasks' | 'documents' | 'timeline' | 'households'>('overview');
  
  const [contacts, setContacts] = useState<Contact[]>(advisor.contacts);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(advisor.journalEntries);
  const [assessments, setAssessments] = useState<Assessment[]>(advisor.assessments);

  // Findings selection state
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    advisor.assessments[0]?.id || ''
  );

  // CRUD / Modal states for Contacts Tab
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // CRUD / Modal states for Journal Tab
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [editingJournal, setEditingJournal] = useState<JournalEntry | null>(null);

  // CRUD / Modal states for Findings Tab
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Contact Form Field States
  const [contactType, setContactType] = useState('Advisor');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState('Email');
  const [roleInTransition, setRoleInTransition] = useState('');
  const [notes, setNotes] = useState('');
  const [primaryContact, setPrimaryContact] = useState(false);

  // Journal Form Field States
  const [entryTitle, setEntryTitle] = useState('');
  const [entryType, setEntryType] = useState('General');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalSummary, setJournalSummary] = useState('');
  const [detailedNotes, setDetailedNotes] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Finding Form Field States
  const [findingCategory, setFindingCategory] = useState('Client Records');
  const [findingTitle, setFindingTitle] = useState('');
  const [findingDescription, setFindingDescription] = useState('');
  const [findingSeverity, setFindingSeverity] = useState('High');
  const [findingImpact, setFindingImpact] = useState('');
  const [findingRecommendation, setFindingRecommendation] = useState('');
  const [findingOwner, setFindingOwner] = useState('CTS');
  const [findingStatus, setFindingStatus] = useState('Open');
  const [findingReviewerNotes, setFindingReviewerNotes] = useState('');
  const [findingEvidenceSummary, setFindingEvidenceSummary] = useState('');

  const [findingPriority, setFindingPriority] = useState('Normal');
  const [findingAssignedTo, setFindingAssignedTo] = useState('Advisor Staff');
  const [findingDueDate, setFindingDueDate] = useState('');
  const [findingResolutionNotes, setFindingResolutionNotes] = useState('');

  // Scoring Helpers
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

  // Findings Table Sorting States
  const [sortField, setSortField] = useState<'category' | 'title' | 'severity' | 'owner' | 'status'>('severity');
  const [sortAsc, setSortAsc] = useState(true);

  // Parse notes from latest assessment to retrieve fallback details
  const latestAssessment = assessments.length > 0 ? assessments[0] : null;
  const parsedData = parseNotesField(latestAssessment?.notes ?? null);

  // Derive dynamic Primary Contact & EA
  const dynamicPrimaryContact = contacts.find(c => c.primaryContact);
  const dynamicEA = contacts.find(c => c.contactType === 'Executive Assistant');

  // Sort Journal Entries: Pinned entries first, then by date desc
  const sortedJournalEntries = [...journalEntries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Overview Tab displays exactly the 3 most recent entries by date desc
  const overviewJournalEntries = [...journalEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Findings computation for the selected assessment
  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);
  const activeFindings = selectedAssessment?.findings || [];

  // Finding Severity Counts
  const critCount = activeFindings.filter(f => f.severity === 'Critical').length;
  const highCount = activeFindings.filter(f => f.severity === 'High').length;
  const modCount = activeFindings.filter(f => f.severity === 'Moderate').length;
  const lowCount = activeFindings.filter(f => f.severity === 'Low').length;

  // Sorting Comparison Matrix
  const severityRank: Record<string, number> = { Critical: 1, High: 2, Moderate: 3, Low: 4 };
  const statusRank: Record<string, number> = { Open: 1, 'In Progress': 2, Resolved: 3, 'Not Applicable': 4 };

  const sortedFindings = [...activeFindings].sort((a, b) => {
    let comp = 0;
    if (sortField === 'severity') {
      comp = (severityRank[a.severity] || 9) - (severityRank[b.severity] || 9);
    } else if (sortField === 'status') {
      comp = (statusRank[a.status] || 9) - (statusRank[b.status] || 9);
    } else {
      const valA = (a[sortField] || '').toLowerCase();
      const valB = (b[sortField] || '').toLowerCase();
      if (valA < valB) comp = -1;
      else if (valA > valB) comp = 1;
    }
    return sortAsc ? comp : -comp;
  });

  const toggleSort = (field: 'category' | 'title' | 'severity' | 'owner' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const tabsList = [
    { id: 'overview', label: 'Overview', icon: <Building size={16} /> },
    { id: 'households', label: 'Households', icon: <Home size={16} /> },
    { id: 'assessments', label: 'Assessments', icon: <FileText size={16} /> },
    { id: 'findings', label: 'Findings', icon: <AlertTriangle size={16} /> },
    { id: 'contacts', label: 'Contacts', icon: <Users size={16} /> },
    { id: 'journal', label: 'Journal', icon: <BookOpen size={16} /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
    { id: 'documents', label: 'Documents', icon: <File size={16} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
  ] as const;

  const resetForm = () => {
    setContactType('Advisor');
    setName('');
    setTitle('');
    setCompany('');
    setEmail('');
    setPhone('');
    setMobilePhone('');
    setPreferredContactMethod('Email');
    setRoleInTransition('');
    setNotes('');
    setPrimaryContact(false);
    setFormError(null);
  };

  const resetJournalForm = () => {
    setEntryTitle('');
    setEntryType('General');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setJournalSummary('');
    setDetailedNotes('');
    setConfidential(false);
    setPinned(false);
    setFormError(null);
  };

  const resetFindingForm = () => {
    setFindingCategory('Client Records');
    setFindingTitle('');
    setFindingDescription('');
    setFindingSeverity('High');
    setFindingImpact('');
    setFindingRecommendation('');
    setFindingOwner('CTS');
    setFindingStatus('Open');
    setFindingReviewerNotes('');
    setFindingPriority('Normal');
    setFindingAssignedTo('Advisor Staff');
    setFindingDueDate('');
    setFindingResolutionNotes('');
    setFormError(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setEditingContact(null);
    setShowContactModal(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setContactType(contact.contactType);
    setName(contact.name);
    setTitle(contact.title || '');
    setCompany(contact.company || '');
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setMobilePhone(contact.mobilePhone || '');
    setPreferredContactMethod(contact.preferredContactMethod);
    setRoleInTransition(contact.roleInTransition || '');
    setNotes(contact.notes || '');
    setPrimaryContact(contact.primaryContact);
    setFormError(null);
    setShowContactModal(true);
  };

  const handleOpenAddJournalModal = () => {
    resetJournalForm();
    setEditingJournal(null);
    setShowJournalModal(true);
  };

  const handleOpenEditJournalModal = (entry: JournalEntry) => {
    setEditingJournal(entry);
    setEntryTitle(entry.title);
    setEntryType(entry.entryType);
    setEntryDate(entry.date);
    setJournalSummary(entry.summary);
    setDetailedNotes(entry.detailedNotes || '');
    setConfidential(entry.confidential);
    setPinned(entry.pinned);
    setFormError(null);
    setShowJournalModal(true);
  };

  const handleOpenAddFindingModal = () => {
    if (!selectedAssessmentId) {
      alert('Please complete or select an assessment first.');
      return;
    }
    resetFindingForm();
    setEditingFinding(null);
    setShowFindingModal(true);
  };

  const handleOpenEditFindingModal = (finding: Finding) => {
    setEditingFinding(finding);
    setFindingCategory(finding.category);
    setFindingTitle(finding.title);
    setFindingDescription(finding.description);
    setFindingSeverity(finding.severity);
    setFindingImpact(finding.impact || '');
    setFindingRecommendation(finding.recommendation || '');
    setFindingOwner(finding.owner);
    setFindingStatus(finding.status);
    setFindingReviewerNotes(finding.reviewerNotes || '');
    setFindingPriority(finding.priority || 'Normal');
    setFindingAssignedTo(finding.assignedTo || 'Advisor Staff');
    setFindingDueDate(finding.dueDate ? new Date(finding.dueDate).toISOString().split('T')[0] : '');
    setFindingResolutionNotes(finding.resolutionNotes || '');
    setFormError(null);
    setShowFindingModal(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactType) {
      setFormError('Name and Contact Type are required fields.');
      return;
    }

    setLoading(true);
    setFormError(null);

    const payload = {
      advisorId: advisor.id,
      contactType,
      name,
      title,
      company,
      email,
      phone,
      mobilePhone,
      preferredContactMethod,
      roleInTransition,
      notes,
      primaryContact
    };

    try {
      if (editingContact) {
        const res = await fetch(`/api/contacts/${editingContact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update contact.');
        const data = await res.json();
        
        setContacts(prev => {
          let list = prev.map(c => c.id === editingContact.id ? data.contact : c);
          if (primaryContact) {
            list = list.map(c => c.id !== editingContact.id ? { ...c, primaryContact: false } : c);
          }
          return list;
        });
      } else {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create contact.');
        const data = await res.json();
        
        setContacts(prev => {
          let list = [data.contact, ...prev];
          if (primaryContact) {
            list = list.map(c => c.id !== data.contact.id ? { ...c, primaryContact: false } : c);
          }
          return list;
        });
      }
      setShowContactModal(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete contact.');
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (err: any) {
      alert(err.message || 'Error deleting contact.');
    }
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryTitle || !entryType || !entryDate) {
      setFormError('Title, Type, and Date are required fields.');
      return;
    }

    setLoading(true);
    setFormError(null);

    const payload = {
      advisorId: advisor.id,
      title: entryTitle,
      entryType,
      date: entryDate,
      summary: journalSummary,
      detailedNotes,
      confidential,
      pinned
    };

    try {
      if (editingJournal) {
        const res = await fetch(`/api/journal/${editingJournal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update journal entry.');
        const data = await res.json();
        setJournalEntries(prev => prev.map(j => j.id === editingJournal.id ? data.entry : j));
      } else {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create journal entry.');
        const data = await res.json();
        setJournalEntries(prev => [data.entry, ...prev]);
      }
      setShowJournalModal(false);
      resetJournalForm();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinToggle = async (entry: JournalEntry) => {
    try {
      const res = await fetch(`/api/journal/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          entryType: entry.entryType,
          date: entry.date,
          summary: entry.summary,
          detailedNotes: entry.detailedNotes,
          confidential: entry.confidential,
          pinned: !entry.pinned
        })
      });
      if (!res.ok) throw new Error('Failed to update pin status.');
      const data = await res.json();
      setJournalEntries(prev => prev.map(j => j.id === entry.id ? data.entry : j));
    } catch (err: any) {
      alert(err.message || 'Error updating pin status.');
    }
  };

  const handleDeleteJournal = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    try {
      const res = await fetch(`/api/journal/${entryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete journal entry.');
      setJournalEntries(prev => prev.filter(j => j.id !== entryId));
    } catch (err: any) {
      alert(err.message || 'Error deleting journal entry.');
    }
  };

  const handleSaveFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingTitle || !findingCategory || !findingSeverity || !findingOwner || !findingStatus) {
      setFormError('Category, Title, Severity, Owner, and Status are required.');
      return;
    }

    setLoading(true);
    setFormError(null);

    const payload = {
      assessmentId: selectedAssessmentId,
      category: findingCategory,
      title: findingTitle,
      description: findingDescription,
      severity: findingSeverity,
      impact: findingImpact,
      recommendation: findingRecommendation,
      owner: findingOwner,
      status: findingStatus,
      reviewerNotes: findingReviewerNotes,
      priority: findingPriority,
      assignedTo: findingAssignedTo,
      dueDate: findingDueDate || null,
      resolutionNotes: findingResolutionNotes
    };

    try {
      if (editingFinding) {
        const res = await fetch(`/api/findings/${editingFinding.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update finding.');
        const data = await res.json();

        setAssessments(prev =>
          prev.map(a =>
            a.id === selectedAssessmentId
              ? { ...a, findings: a.findings.map(f => f.id === editingFinding.id ? data.finding : f) }
              : a
          )
        );
      } else {
        const res = await fetch('/api/findings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create finding.');
        const data = await res.json();

        setAssessments(prev =>
          prev.map(a =>
            a.id === selectedAssessmentId
              ? { ...a, findings: [data.finding, ...a.findings] }
              : a
          )
        );
      }
      setShowFindingModal(false);
      resetFindingForm();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    if (!confirm('Are you sure you want to delete this finding?')) return;
    try {
      const res = await fetch(`/api/findings/${findingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete finding.');
      setAssessments(prev =>
        prev.map(a =>
          a.id === selectedAssessmentId
            ? { ...a, findings: a.findings.filter(f => f.id !== findingId) }
            : a
        )
      );
    } catch (err: any) {
      alert(err.message || 'Error deleting finding.');
    }
  };

  // Households and Accounts state
  const [households, setHouseholds] = useState<Household[]>(advisor.householdRecords || []);
  const [expandedHouseholds, setExpandedHouseholds] = useState<Record<string, boolean>>({});

  // Synchronize component states when advisor prop gets refreshed on server
  React.useEffect(() => {
    setHouseholds(advisor.householdRecords || []);
  }, [advisor.householdRecords]);

  React.useEffect(() => {
    setAssessments(advisor.assessments);
  }, [advisor.assessments]);

  React.useEffect(() => {
    setContacts(advisor.contacts);
  }, [advisor.contacts]);

  React.useEffect(() => {
    setJournalEntries(advisor.journalEntries);
  }, [advisor.journalEntries]);

  // Household Modal States
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
  const [hhName, setHhName] = useState('');
  const [hhPrimaryClient, setHhPrimaryClient] = useState('');
  const [hhSecondaryClient, setHhSecondaryClient] = useState('');
  const [hhTotalAum, setHhTotalAum] = useState('');
  const [hhRevenue, setHhRevenue] = useState('');
  const [hhEmail, setHhEmail] = useState('');
  const [hhPhone, setHhPhone] = useState('');
  const [hhAddress, setHhAddress] = useState('');
  const [hhNotes, setHhNotes] = useState('');
  const [hhReadiness, setHhReadiness] = useState('Not Reviewed');

  // Account Modal States
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountHouseholdId, setAccountHouseholdId] = useState('');
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('Individual');
  const [accValue, setAccValue] = useState('');
  const [accCustodian, setAccCustodian] = useState('');
  const [accRegistration, setAccRegistration] = useState('');
  const [accNotes, setAccNotes] = useState('');
  const [accReadiness, setAccReadiness] = useState('Not Reviewed');

  // Checklist Modal States
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [activeChecklistAccount, setActiveChecklistAccount] = useState<Account | null>(null);
  const [checklistItemsState, setChecklistItemsState] = useState<AccountChecklistItem[]>([]);

  // Household handlers
  const handleOpenAddHousehold = () => {
    setEditingHousehold(null);
    setHhName('');
    setHhPrimaryClient('');
    setHhSecondaryClient('');
    setHhTotalAum('');
    setHhRevenue('');
    setHhEmail('');
    setHhPhone('');
    setHhAddress('');
    setHhNotes('');
    setHhReadiness('Not Reviewed');
    setShowHouseholdModal(true);
  };

  const handleOpenEditHousehold = (hh: Household) => {
    setEditingHousehold(hh);
    setHhName(hh.name);
    setHhPrimaryClient(hh.primaryClientName);
    setHhSecondaryClient(hh.secondaryClientName || '');
    setHhTotalAum(hh.totalAum !== null ? hh.totalAum.toString() : '');
    setHhRevenue(hh.revenue !== null ? hh.revenue.toString() : '');
    setHhEmail(hh.email || '');
    setHhPhone(hh.phone || '');
    setHhAddress(hh.address || '');
    setHhNotes(hh.notes || '');
    setHhReadiness(hh.readinessStatus);
    setShowHouseholdModal(true);
  };

  const handleSaveHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hhName || !hhPrimaryClient) {
      alert('Household Name and Primary Client Name are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        advisorId: advisor.id,
        name: hhName,
        primaryClientName: hhPrimaryClient,
        secondaryClientName: hhSecondaryClient,
        totalAum: hhTotalAum ? parseFloat(hhTotalAum) : null,
        revenue: hhRevenue ? parseFloat(hhRevenue) : null,
        email: hhEmail,
        phone: hhPhone,
        address: hhAddress,
        notes: hhNotes,
        readinessStatus: hhReadiness,
      };

      if (editingHousehold) {
        const res = await fetch(`/api/households/${editingHousehold.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update household.');
        const data = await res.json();
        setHouseholds(prev => prev.map(h => h.id === editingHousehold.id ? { ...data.household, accounts: h.accounts } : h));
      } else {
        const res = await fetch('/api/households', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create household.');
        const data = await res.json();
        setHouseholds(prev => [...prev, { ...data.household, accounts: [] }].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowHouseholdModal(false);
    } catch (err: any) {
      alert(err.message || 'Error saving household.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHousehold = async (hhId: string) => {
    if (!confirm('Are you sure you want to delete this household? All nested accounts and checklists will be permanently deleted.')) return;
    try {
      const res = await fetch(`/api/households/${hhId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete household.');
      setHouseholds(prev => prev.filter(h => h.id !== hhId));
    } catch (err: any) {
      alert(err.message || 'Error deleting household.');
    }
  };

  // Account handlers
  const handleOpenAddAccount = (hhId: string) => {
    setAccountHouseholdId(hhId);
    setEditingAccount(null);
    setAccName('');
    setAccType('Individual');
    setAccValue('');
    setAccCustodian('');
    setAccRegistration('');
    setAccNotes('');
    setAccReadiness('Not Reviewed');
    setShowAccountModal(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccountHouseholdId(acc.householdId);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccValue(acc.value !== null ? acc.value.toString() : '');
    setAccCustodian(acc.custodian || '');
    setAccRegistration(acc.registration || '');
    setAccNotes(acc.notes || '');
    setAccReadiness(acc.readinessStatus);
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accType) {
      alert('Account Name and Type are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        householdId: accountHouseholdId,
        name: accName,
        type: accType,
        value: accValue ? parseFloat(accValue) : null,
        custodian: accCustodian,
        registration: accRegistration,
        notes: accNotes,
        readinessStatus: accReadiness,
      };

      if (editingAccount) {
        const res = await fetch(`/api/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update account.');
        const data = await res.json();
        
        setHouseholds(prev => prev.map(h => {
          if (h.id === accountHouseholdId) {
            return {
              ...h,
              accounts: h.accounts.map(a => a.id === editingAccount.id ? { ...data.account, checklistItems: a.checklistItems } : a)
            };
          }
          return h;
        }));
      } else {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create account.');
        const data = await res.json();
        
        setHouseholds(prev => prev.map(h => {
          if (h.id === accountHouseholdId) {
            return {
              ...h,
              accounts: [...h.accounts, data.account].sort((a, b) => a.name.localeCompare(b.name))
            };
          }
          return h;
        }));
      }
      setShowAccountModal(false);
    } catch (err: any) {
      alert(err.message || 'Error saving account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (hhId: string, accId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      const res = await fetch(`/api/accounts/${accId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account.');
      setHouseholds(prev => prev.map(h => {
        if (h.id === hhId) {
          return {
            ...h,
            accounts: h.accounts.filter(a => a.id !== accId)
          };
        }
        return h;
      }));
    } catch (err: any) {
      alert(err.message || 'Error deleting account.');
    }
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
          updated.verifiedBy = 'CTS Auditor';
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

      const results = await Promise.all(promises);
      
      const updatedChecklistItems = checklistItemsState.map(item => {
        const savedResult = results.find(r => r && r.checklistItem && r.checklistItem.itemKey === item.itemKey);
        return savedResult ? savedResult.checklistItem : item;
      });

      setHouseholds(prev => prev.map(h => {
        if (h.id === activeChecklistAccount.householdId) {
          return {
            ...h,
            accounts: h.accounts.map(a => a.id === activeChecklistAccount.id ? { ...a, checklistItems: updatedChecklistItems } : a)
          };
        }
        return h;
      }));

      router.refresh();
      setShowChecklistModal(false);
    } catch (err: any) {
      alert(err.message || 'Error saving checklist.');
    } finally {
      setLoading(false);
    }
  };

  const toggleHouseholdExpanded = (hhId: string) => {
    setExpandedHouseholds(prev => ({
      ...prev,
      [hhId]: !prev[hhId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Back button and page actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link href="/dashboard" className="flex items-center text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/audits/new?advisorId=${advisor.id}`}>
            <Button className="flex items-center gap-2">
              <Plus size={16} /> New Assessment
            </Button>
          </Link>
        </div>
      </div>

      {/* Advisor Header Workspace Info */}
      <div className="bg-[#1c2541] border border-slate-700/60 rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Briefcase size={22} className="text-[#d4af37]" />
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">{advisor.name}</h1>
              <Badge variant="neutral" className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 font-bold uppercase text-[10px] tracking-wider">
                {advisor.businessModel}
              </Badge>
            </div>
            <p className="text-slate-400 font-semibold mt-1.5 text-sm">{advisor.firmName}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-slate-900/40 p-4 rounded-lg border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Total AUM:</span>
              <span className="text-slate-200 font-bold">{advisor.totalAum ? `$${advisor.totalAum}M` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Protocol Status:</span>
              <span className="text-slate-200 font-bold">{advisor.protocolStatus}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Current Custodian:</span>
              <span className="text-slate-200 font-bold">{advisor.currentCustodian || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Future Custodian:</span>
              <span className="text-slate-200 font-bold">{advisor.futureCustodian || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation list */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 select-none scrollbar-none">
        {tabsList.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold tracking-wide transition-all duration-200 shrink-0 ${
              activeTab === tab.id
                ? 'border-[#d4af37] text-slate-100 bg-slate-800/10'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Advisor Profile Details</CardTitle>
                  <CardDescription>Primary contacts, Executive Assistant profiles, and team members.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  
                  {/* Primary Contact details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 font-medium block">Primary Contact Name:</span>
                      <span className="text-slate-200 font-semibold text-base block mt-0.5">
                        {dynamicPrimaryContact ? dynamicPrimaryContact.name : (parsedData.primaryContact || advisor.name)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Title:</span>
                      <span className="text-slate-200 font-semibold text-base block mt-0.5">
                        {dynamicPrimaryContact ? (dynamicPrimaryContact.title || 'Primary Contact') : (parsedData.title || 'Advisor')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Email:</span>
                      <span className="text-slate-200 font-semibold block mt-0.5">
                        {dynamicPrimaryContact ? (dynamicPrimaryContact.email || 'N/A') : (parsedData.email || advisor.email || 'N/A')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Mobile Phone:</span>
                      <span className="text-slate-200 font-semibold block mt-0.5">
                        {dynamicPrimaryContact ? (dynamicPrimaryContact.mobilePhone || 'N/A') : (parsedData.mobilePhone || advisor.phone || 'N/A')}
                      </span>
                    </div>
                  </div>

                  {/* Executive Assistant details */}
                  <div className="border-t border-slate-700/40 pt-4 space-y-3">
                    <h4 className="font-bold text-slate-300 text-sm">Executive Assistant Info</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-slate-400 font-medium block">EA Name:</span>
                        <span className="text-slate-200 font-semibold block mt-0.5">
                          {dynamicEA ? dynamicEA.name : (parsedData.eaName || 'N/A')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">EA Email:</span>
                        <span className="text-slate-200 font-semibold block mt-0.5">
                          {dynamicEA ? (dynamicEA.email || 'N/A') : (parsedData.eaEmail || 'N/A')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">EA Phone:</span>
                        <span className="text-slate-200 font-semibold block mt-0.5">
                          {dynamicEA ? (dynamicEA.phone || 'N/A') : (parsedData.eaPhone || 'N/A')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transition Team Members */}
                  <div className="border-t border-slate-700/40 pt-4">
                    <h4 className="font-bold text-slate-300 text-sm mb-2">Transition Team Members</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.teamMembers.length > 0 ? (
                        parsedData.teamMembers.map((member, index) => (
                          <span key={index} className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
                            {member}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">No transition team members designated</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RECENT JOURNAL ENTRIES PANEL */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen size={18} className="text-[#d4af37]" />
                    Recent Consulting Journal Logs
                  </CardTitle>
                  <CardDescription>The 3 most recent meetings, phone calls, or risk summaries logged.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {overviewJournalEntries.length > 0 ? (
                    <div className="divide-y divide-slate-800 space-y-4">
                      {overviewJournalEntries.map((j) => (
                        <div key={j.id} className="pt-4 first:pt-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200">{j.title}</span>
                              <Badge variant="neutral" className="bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 text-[10px] py-0.5">
                                {j.entryType}
                              </Badge>
                              {j.confidential && (
                                <span title="Confidential Entry">
                                  <Lock size={12} className="text-rose-400" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold">{j.date}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{j.summary}</p>
                          <div className="text-[10px] text-slate-500 mt-1 font-medium">Logged by: {j.author}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-500 italic">
                      No consulting journal entries logged yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Transition Information</CardTitle>
                <CardDescription>Affiliation histories and reasons for transitioning.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="text-slate-400 font-medium block">Years in Business:</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{advisor.staffCount ? `${advisor.staffCount} Staff Members` : ''}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Expected Timeline:</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{parsedData.expectedTransitionTimeline}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Transition Reasons:</span>
                  <p className="text-xs text-slate-300 bg-slate-900/40 border border-slate-800 p-3 rounded leading-relaxed mt-1.5 whitespace-pre-line">
                    {parsedData.reasonForTransition || 'No reason specified'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ASSESSMENTS TAB */}
        {activeTab === 'assessments' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Know Your Book™ Assessments</CardTitle>
                <CardDescription>Assessments loaded for this advisor profile.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {assessments.length > 0 ? (
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400 font-medium">
                      <th className="px-6 py-3.5">Assessment Date</th>
                      <th className="px-6 py-3.5">Stage & Owner</th>
                      <th className="px-6 py-3.5">Priority & Tags</th>
                      <th className="px-6 py-3.5 text-center">Index Score</th>
                      <th className="px-6 py-3.5 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {assessments.map((assessment) => {
                      const rating = getScoreRating(assessment.overallReadinessScore);
                      const status = parseNotesField(assessment.notes);
                      const dateStr = new Date(assessment.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });

                      return (
                        <tr key={assessment.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-200">{dateStr}</td>
                          <td className="px-6 py-4">
                            <Badge variant="neutral" className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 text-xs font-semibold">
                              {status.stage}
                            </Badge>
                            <div className="text-[10px] text-slate-400 mt-1 font-medium">Owner: {status.owner}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                status.priority === 'Urgent' || status.priority === 'High'
                                  ? 'critical'
                                  : 'neutral'
                              }
                            >
                              {status.priority}
                            </Badge>
                            {status.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 max-w-[160px]">
                                {status.tags.map((tag, idx) => (
                                  <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded font-semibold">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`text-sm font-bold ${rating.textClass}`}>
                                {assessment.overallReadinessScore}%
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                {rating.rating}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right no-print">
                            <div className="flex justify-end gap-2">
                              <Link href={`/audits/${assessment.id}`}>
                                <Button variant="secondary" size="sm" className="flex items-center gap-1">
                                  <FileText size={12} /> View
                                </Button>
                              </Link>
                              <Link href={`/audits/${assessment.id}/edit`}>
                                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                  <Edit size={12} /> Edit
                                </Button>
                              </Link>
                              <Link href={`/audits/${assessment.id}/print`} target="_blank">
                                <Button variant="ghost" size="sm">
                                  <Printer size={12} />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No assessments completed for this advisor.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FINDINGS TAB */}
        {activeTab === 'findings' && (
          <div className="space-y-6">
            {/* Assessment selector dropdown and add finding button */}
            <div className="bg-[#1c2541] border border-slate-700/60 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Select Assessment</span>
                {assessments.length > 0 ? (
                  <select
                    value={selectedAssessmentId}
                    onChange={(e) => setSelectedAssessmentId(e.target.value)}
                    className="bg-[#0b1329] border border-slate-700 text-slate-200 text-sm py-2 h-10 rounded px-3 focus:outline-none w-full sm:w-72 font-semibold"
                  >
                    {assessments.map(a => {
                      const dateStr = new Date(a.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                      return (
                        <option key={a.id} value={a.id}>
                          {dateStr} — Index: {a.overallReadinessScore}%
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <span className="text-slate-500 italic text-sm block">No assessments completed.</span>
                )}
              </div>
              <Button onClick={handleOpenAddFindingModal} disabled={!selectedAssessmentId} className="flex items-center gap-2">
                <Plus size={16} /> Add Finding
              </Button>
            </div>

            {/* Severity Counts Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#2e0814]/30 border border-rose-500/20 rounded-lg flex flex-col">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Critical</span>
                <span className="text-3xl font-black text-rose-300 mt-1">{critCount}</span>
              </div>
              <div className="p-4 bg-[#2d1109]/30 border border-orange-500/20 rounded-lg flex flex-col">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">High</span>
                <span className="text-3xl font-black text-orange-300 mt-1">{highCount}</span>
              </div>
              <div className="p-4 bg-[#2b1f09]/30 border border-amber-500/20 rounded-lg flex flex-col">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Moderate</span>
                <span className="text-3xl font-black text-amber-300 mt-1">{modCount}</span>
              </div>
              <div className="p-4 bg-[#0d233a]/30 border border-blue-500/20 rounded-lg flex flex-col">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Low</span>
                <span className="text-3xl font-black text-blue-300 mt-1">{lowCount}</span>
              </div>
            </div>

            {/* Findings Listing Table */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                {activeFindings.length > 0 ? (
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400 font-medium select-none">
                        <th onClick={() => toggleSort('category')} className="px-6 py-3.5 cursor-pointer hover:bg-slate-800/40 transition-colors">
                          Category {sortField === 'category' && (sortAsc ? '▲' : '▼')}
                        </th>
                        <th onClick={() => toggleSort('title')} className="px-6 py-3.5 cursor-pointer hover:bg-slate-800/40 transition-colors">
                          Title {sortField === 'title' && (sortAsc ? '▲' : '▼')}
                        </th>
                        <th onClick={() => toggleSort('severity')} className="px-6 py-3.5 cursor-pointer text-center hover:bg-slate-800/40 transition-colors w-28">
                          Severity {sortField === 'severity' && (sortAsc ? '▲' : '▼')}
                        </th>
                        <th onClick={() => toggleSort('owner')} className="px-6 py-3.5 cursor-pointer hover:bg-slate-800/40 transition-colors w-32">
                          Owner {sortField === 'owner' && (sortAsc ? '▲' : '▼')}
                        </th>
                        <th onClick={() => toggleSort('status')} className="px-6 py-3.5 cursor-pointer hover:bg-slate-800/40 transition-colors w-32">
                          Status {sortField === 'status' && (sortAsc ? '▲' : '▼')}
                        </th>
                        <th className="px-6 py-3.5 text-right no-print w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sortedFindings.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-300">{f.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-200">{f.title}</div>
                            <div className="text-xs text-slate-400 mt-1 max-w-sm line-clamp-2">{f.description}</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {f.priority && (
                                <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                                  Priority: {f.priority}
                                </span>
                              )}
                              {f.assignedTo && (
                                <span className="text-[9px] bg-slate-800 border border-[#d4af37]/20 text-[#d4af37] px-1.5 py-0.5 rounded font-semibold">
                                  Assigned: {f.assignedTo}
                                </span>
                              )}
                              {f.dueDate && (
                                <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                                  Due: {new Date(f.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {f.resolutionNotes && (
                              <div className="text-[10px] text-amber-300 mt-2 bg-amber-950/20 px-2 rounded border border-amber-900/20 w-fit">
                                <span className="font-bold uppercase tracking-wider text-[8px] text-amber-450 mr-1">Resolution:</span>
                                {f.resolutionNotes}
                              </div>
                            )}
                            {f.evidenceSummary && (
                              <div className="text-[10px] text-emerald-450/90 font-semibold mt-1.5 bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-900/20 w-fit">
                                <span className="font-bold text-slate-400 mr-1.5 uppercase tracking-wide text-[8px]">Evidence:</span>
                                {f.evidenceSummary}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge
                              variant={
                                f.severity === 'Critical' || f.severity === 'High'
                                  ? 'critical'
                                  : 'neutral'
                              }
                              className={
                                f.severity === 'Critical'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : f.severity === 'High'
                                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                  : f.severity === 'Moderate'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }
                            >
                              {f.severity}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-slate-300 font-medium">
                            {f.owner}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={f.status === 'Resolved' ? 'ready' : 'neutral'}
                              className={
                                f.status === 'Open'
                                  ? 'bg-[#1c2541] text-slate-300 border border-slate-700/60'
                                  : f.status === 'In Progress'
                                  ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                                  : f.status === 'Resolved'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700/40'
                              }
                            >
                              {f.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right no-print">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEditFindingModal(f)} className="p-1 h-7 w-7 text-slate-400 hover:text-slate-100">
                                  <Edit size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteFinding(f.id)} className="p-1 h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20">
                                  <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-slate-500 italic">
                    No findings logged for this assessment. Click "Add Finding" to document a gap.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Advisor Contacts</CardTitle>
                <CardDescription>Associated team members, legal, tax, or custodian transition partners.</CardDescription>
              </div>
              <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                <Plus size={16} /> Add Contact
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {contacts.length > 0 ? (
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400 font-medium">
                      <th className="px-6 py-3.5">Name</th>
                      <th className="px-6 py-3.5">Contact Type</th>
                      <th className="px-6 py-3.5">Company / Title</th>
                      <th className="px-6 py-3.5">Contact Details</th>
                      <th className="px-6 py-3.5 text-center">Pref. Method</th>
                      <th className="px-6 py-3.5 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{c.name}</span>
                            {c.primaryContact && (
                              <Badge variant="ready" className="text-[9px] px-1 py-0 bg-emerald-500/20 text-emerald-400">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="neutral" className="bg-slate-800 text-slate-300 border border-slate-700 text-xs">
                            {c.contactType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <div className="font-medium">{c.title || '—'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{c.company || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {c.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail size={12} className="text-slate-500" />
                              <span className="text-xs">{c.email}</span>
                            </div>
                          )}
                          {(c.phone || c.mobilePhone) && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Phone size={12} className="text-slate-500" />
                              <span className="text-[10px] text-slate-400">
                                {c.phone && `O: ${c.phone}`} {c.mobilePhone && `M: ${c.mobilePhone}`}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-slate-300">
                          {c.preferredContactMethod}
                        </td>
                        <td className="px-6 py-4 text-right no-print">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(c)} className="p-1 h-7 w-7 text-slate-400 hover:text-slate-100">
                              <Edit size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(c.id)} className="p-1 h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-slate-500 italic">
                  No contacts found. Click "Add Contact" to build your transition network.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* JOURNAL TAB */}
        {activeTab === 'journal' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Consulting Journal</CardTitle>
                <CardDescription>Log call histories, risk assessments, operational updates, and compliance notes.</CardDescription>
              </div>
              <Button onClick={handleOpenAddJournalModal} className="flex items-center gap-2">
                <Plus size={16} /> Add Entry
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {sortedJournalEntries.length > 0 ? (
                <div className="space-y-6">
                  {sortedJournalEntries.map((j) => (
                    <div
                      key={j.id}
                      className={`p-5 rounded-lg border transition-all ${
                        j.pinned
                          ? 'bg-[#1c2541] border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.1)]'
                          : 'bg-slate-900/30 border-slate-800 hover:border-slate-700/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {j.pinned && (
                            <Pin size={14} className="text-[#d4af37] fill-[#d4af37]" />
                          )}
                          <h3 className="font-bold text-slate-200 text-lg leading-tight">{j.title}</h3>
                          <Badge variant="neutral" className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 text-xs font-semibold">
                            {j.entryType}
                          </Badge>
                          {j.confidential && (
                            <Badge variant="neutral" className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] flex items-center gap-1">
                              <Lock size={10} /> Confidential
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400 no-print ml-auto sm:ml-0">
                          <span className="mr-2 font-medium">{j.date}</span>
                          <button
                            type="button"
                            onClick={() => handlePinToggle(j)}
                            className={`p-1 rounded hover:bg-slate-800 ${j.pinned ? 'text-[#d4af37]' : 'text-slate-500 hover:text-slate-300'}`}
                            title={j.pinned ? 'Unpin Entry' : 'Pin Entry'}
                          >
                            <Pin size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditJournalModal(j)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                            title="Edit Entry"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJournal(j.id)}
                            className="p-1 rounded hover:bg-slate-800 text-rose-400 hover:text-rose-300"
                            title="Delete Entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="text-sm text-slate-300 mt-2 font-semibold">
                        {j.summary}
                      </div>

                      {j.detailedNotes && (
                        <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80 leading-relaxed whitespace-pre-line">
                          {j.detailedNotes}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-4 bg-slate-950/20 px-3 py-1.5 rounded border border-slate-850 h-fit w-fit select-none">
                        <FileUp size={11} />
                        <span>Attachments Placeholder</span>
                      </div>

                      <div className="text-[10px] text-slate-500 mt-3 font-semibold text-right">
                        Logged by: {j.author}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-550 italic">
                  No journal entries logged. Click "Add Entry" to log call files or transition notes.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <Card>
            <CardHeader>
              <CardTitle>Advisor Tasks</CardTitle>
              <CardDescription>Remediation tasks and transition steps.</CardDescription>
            </CardHeader>
            <CardContent className="py-12 text-center text-slate-500 italic">
              Tasks workspace workspace is coming soon.
            </CardContent>
          </Card>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Evidence files, custodian paperwork, and reports.</CardDescription>
            </CardHeader>
            <CardContent className="py-12 text-center text-slate-500 italic">
              Documents repository workspace is coming soon.
            </CardContent>
          </Card>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <Card>
            <CardHeader>
              <CardTitle>Transition Timeline</CardTitle>
              <CardDescription>Transition milestone trackers and calendar logs.</CardDescription>
            </CardHeader>
            <CardContent className="py-12 text-center text-slate-500 italic">
              Timeline tracker workspace is coming soon.
            </CardContent>
          </Card>
        )}

        {/* HOUSEHOLDS TAB */}
        {activeTab === 'households' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Client Households</CardTitle>
                <CardDescription>Assess transition readiness, KYC data, and account documentation for each client household.</CardDescription>
              </div>
              <Button onClick={handleOpenAddHousehold} className="flex items-center gap-2">
                <Plus size={16} /> Add Household
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {households.length > 0 ? (
                households.map((hh) => {
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
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-900/40 hover:bg-slate-900/60 transition-colors cursor-pointer select-none gap-4" onClick={() => toggleHouseholdExpanded(hh.id)}>
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                          <div>
                            <span className="font-bold text-slate-100 text-base">{hh.name}</span>
                            <span className="text-xs text-slate-400 block mt-0.5">Primary: {hh.primaryClientName} {hh.secondaryClientName ? `| Secondary: ${hh.secondaryClientName}` : ''}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3" onClick={e => e.stopPropagation()}>
                          <div className="text-center px-3 border-r border-slate-800">
                            <span className={`text-sm font-extrabold ${ratingClass}`}>{hhReadinessScore}%</span>
                            <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider">Readiness</span>
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
                          
                          {/* Action controls */}
                          <div className="flex items-center gap-1 ml-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenAddAccount(hh.id)} className="text-slate-400 hover:text-slate-100 px-2 py-1 text-xs flex items-center gap-1 border border-slate-700/50 hover:bg-slate-800">
                              <Plus size={12} /> Add Acc
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditHousehold(hh)} className="p-1 h-7 w-7 text-slate-400 hover:text-slate-100">
                              <Edit size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteHousehold(hh.id)} className="p-1 h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20">
                              <Trash2 size={14} />
                            </Button>
                          </div>
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
                              {!hh.email && !hh.phone && !hh.address && <span className="text-slate-500 italic">No contact details loaded.</span>}
                            </div>
                            <div className="md:col-span-2 bg-[#1c2541]/40 p-3 rounded border border-slate-800">
                              <span className="text-slate-500 block uppercase tracking-wider font-bold mb-1">Household Notes</span>
                              <p className="text-slate-300 mt-1 whitespace-pre-line">{hh.notes || 'No general notes for this household.'}</p>
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
                                          <div className="flex justify-end gap-1.5">
                                            <Button variant="secondary" size="sm" onClick={() => handleOpenChecklist(acc)} className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 border-slate-700/50 hover:bg-slate-800">
                                              Checklist
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditAccount(acc)} className="p-1 h-6 w-6 text-slate-400 hover:text-slate-100">
                                              <Edit size={12} />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAccount(hh.id, acc.id)} className="p-1 h-6 w-6 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20">
                                              <Trash2 size={12} />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-6 text-slate-500 italic bg-slate-900/10 rounded border border-dashed border-slate-800 text-[11px]">
                              No accounts created yet. Click "Add Account" to configure client accounts.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-500 italic border border-dashed border-slate-800 rounded">
                  No client households mapped. Click "Add Household" to partition the advisor book.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* CONTACT CRUD MODAL OVERLAY */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader>
              <CardTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</CardTitle>
              <CardDescription>Specify the credentials of a transition team member.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveContact} className="space-y-4 text-slate-100">
                {formError && (
                  <div className="bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs p-3 rounded">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Contact Type *</label>
                    <select
                      value={contactType}
                      onChange={(e) => setContactType(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="Advisor">Advisor</option>
                      <option value="Executive Assistant">Executive Assistant</option>
                      <option value="Partner">Partner</option>
                      <option value="Attorney">Attorney</option>
                      <option value="CPA">CPA</option>
                      <option value="Compliance Contact">Compliance Contact</option>
                      <option value="OSJ / Supervisory Contact">OSJ / Supervisory Contact</option>
                      <option value="Custodian Contact">Custodian Contact</option>
                      <option value="Operations Contact">Operations Contact</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Compliance Officer"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Company</label>
                    <input
                      type="text"
                      placeholder="e.g. LPL Financial"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Email</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Phone</label>
                    <input
                      type="text"
                      placeholder="555-0100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Mobile Phone</label>
                    <input
                      type="text"
                      placeholder="555-0101"
                      value={mobilePhone}
                      onChange={(e) => setMobilePhone(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Preferred Contact Method</label>
                    <select
                      value={preferredContactMethod}
                      onChange={(e) => setPreferredContactMethod(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="Text">Text</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-6 space-x-2">
                    <input
                      type="checkbox"
                      id="primaryContact"
                      checked={primaryContact}
                      onChange={(e) => setPrimaryContact(e.target.checked)}
                      className="w-4 h-4 rounded text-[#d4af37] bg-[#0b1329] border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="primaryContact" className="text-xs font-bold text-slate-300 cursor-pointer">
                      Primary Contact
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Role in Transition</label>
                  <textarea
                    placeholder="Describe their tasks, transition goals, or legal involvement..."
                    rows={2}
                    value={roleInTransition}
                    onChange={(e) => setRoleInTransition(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Notes</label>
                  <textarea
                    placeholder="General comments..."
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowContactModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Contact'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* JOURNAL CRUD MODAL OVERLAY */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader>
              <CardTitle>{editingJournal ? 'Edit Journal Entry' : 'Log New Journal Entry'}</CardTitle>
              <CardDescription>Document key meetings, calls, risks, or compliance notes.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveJournal} className="space-y-4 text-slate-100">
                {formError && (
                  <div className="bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs p-3 rounded">
                    {formError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Entry Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Discovery Interview Summary"
                    value={entryTitle}
                    onChange={(e) => setEntryTitle(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Entry Type *</label>
                    <select
                      value={entryType}
                      onChange={(e) => setEntryType(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="Discovery Call">Discovery Call</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Internal Note">Internal Note</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Operations">Operations</option>
                      <option value="Transition Planning">Transition Planning</option>
                      <option value="Risk">Risk</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Date *</label>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Entry Summary *</label>
                  <input
                    type="text"
                    placeholder="Brief 1-sentence summary of the entry..."
                    value={journalSummary}
                    onChange={(e) => setJournalSummary(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Detailed Notes</label>
                  <textarea
                    placeholder="Enter rich details, conversation bullet points, or next steps..."
                    rows={4}
                    value={detailedNotes}
                    onChange={(e) => setDetailedNotes(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="confidential"
                        checked={confidential}
                        onChange={(e) => setConfidential(e.target.checked)}
                        className="w-4 h-4 rounded text-[#d4af37] bg-[#0b1329] border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <label htmlFor="confidential" className="text-xs font-bold text-slate-300 cursor-pointer flex items-center gap-1">
                        <Lock size={12} /> Confidential
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="pinned"
                        checked={pinned}
                        onChange={(e) => setPinned(e.target.checked)}
                        className="w-4 h-4 rounded text-[#d4af37] bg-[#0b1329] border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <label htmlFor="pinned" className="text-xs font-bold text-slate-300 cursor-pointer flex items-center gap-1">
                        <Pin size={12} /> Pinned
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-2 rounded select-none cursor-not-allowed opacity-60">
                    <FileUp size={12} />
                    <span>Upload Attachments (Coming Soon)</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowJournalModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Entry'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FINDING CRUD MODAL OVERLAY */}
      {showFindingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader>
              <CardTitle>{editingFinding ? 'Edit Finding' : 'Log New Assessment Finding'}</CardTitle>
              <CardDescription>Document core outputs, gaps, or compliance warnings identified.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveFinding} className="space-y-4 text-slate-100">
                {formError && (
                  <div className="bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs p-3 rounded">
                    {formError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Finding Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Missing Beneficiary Designations"
                    value={findingTitle}
                    onChange={(e) => setFindingTitle(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Category *</label>
                    <select
                      value={findingCategory}
                      onChange={(e) => setFindingCategory(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="Client Records">Client Records</option>
                      <option value="KYC">KYC</option>
                      <option value="Documentation">Documentation</option>
                      <option value="Operations">Operations</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Account Types">Account Types</option>
                      <option value="Technology">Technology</option>
                      <option value="Communication">Communication</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Severity *</label>
                    <select
                      value={findingSeverity}
                      onChange={(e) => setFindingSeverity(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Description *</label>
                  <textarea
                    placeholder="Provide a clear description of the identified gap..."
                    rows={3}
                    value={findingDescription}
                    onChange={(e) => setFindingDescription(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Owner / Assigned To *</label>
                    <select
                      value={findingOwner}
                      onChange={(e) => setFindingOwner(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="CTS">CTS</option>
                      <option value="Advisor">Advisor</option>
                      <option value="Advisor Staff">Advisor Staff</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Legal">Legal</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">CTS Consultant Assigned</label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={findingAssignedTo}
                      onChange={(e) => setFindingAssignedTo(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Priority</label>
                    <select
                      value={findingPriority}
                      onChange={(e) => setFindingPriority(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Normal">Normal</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Status *</label>
                    <select
                      value={findingStatus}
                      onChange={(e) => setFindingStatus(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Verified">Verified</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Due Date</label>
                    <input
                      type="date"
                      value={findingDueDate}
                      onChange={(e) => setFindingDueDate(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Resolution Notes</label>
                  <textarea
                    placeholder="Specify resolution notes..."
                    rows={2}
                    value={findingResolutionNotes}
                    onChange={(e) => setFindingResolutionNotes(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Impact</label>
                  <textarea
                    placeholder="Describe operational, compliance, or transition timing impacts..."
                    rows={2}
                    value={findingImpact}
                    onChange={(e) => setFindingImpact(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Recommendation</label>
                  <textarea
                    placeholder="Provide remediation actions..."
                    rows={2}
                    value={findingRecommendation}
                    onChange={(e) => setFindingRecommendation(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Reviewer Notes</label>
                  <textarea
                    placeholder="Internal audit notes..."
                    rows={2}
                    value={findingReviewerNotes}
                    onChange={(e) => setFindingReviewerNotes(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowFindingModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Finding'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HOUSEHOLD CRUD MODAL OVERLAY */}
      {showHouseholdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader>
              <CardTitle>{editingHousehold ? 'Edit Household' : 'Add New Household'}</CardTitle>
              <CardDescription>Add a new household to this advisor book.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveHousehold} className="space-y-4 text-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Household Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Miller Family Trust"
                    value={hhName}
                    onChange={e => setHhName(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Primary Client Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. John Miller"
                      value={hhPrimaryClient}
                      onChange={e => setHhPrimaryClient(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Secondary Client Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah Miller"
                      value={hhSecondaryClient}
                      onChange={e => setHhSecondaryClient(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Total AUM ($ Millions)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2.5"
                      value={hhTotalAum}
                      onChange={e => setHhTotalAum(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Annual Revenue ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 15000"
                      value={hhRevenue}
                      onChange={e => setHhRevenue(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Email</label>
                    <input
                      type="email"
                      placeholder="e.g. john@miller.com"
                      value={hhEmail}
                      onChange={e => setHhEmail(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. 555-0100"
                      value={hhPhone}
                      onChange={e => setHhPhone(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Main St, New York, NY"
                    value={hhAddress}
                    onChange={e => setHhAddress(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Readiness Status</label>
                  <select
                    value={hhReadiness}
                    onChange={e => setHhReadiness(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="Ready">Ready</option>
                    <option value="Minor Cleanup">Minor Cleanup</option>
                    <option value="Significant Cleanup">Significant Cleanup</option>
                    <option value="Not Ready">Not Ready</option>
                    <option value="Not Reviewed">Not Reviewed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Notes</label>
                  <textarea
                    placeholder="Specify notes or data remediation requirements..."
                    value={hhNotes}
                    onChange={e => setHhNotes(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowHouseholdModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Household'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ACCOUNT CRUD MODAL OVERLAY */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader>
              <CardTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</CardTitle>
              <CardDescription>Add a client account associated with this household.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAccount} className="space-y-4 text-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Account Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. John Miller IRA"
                    value={accName}
                    onChange={e => setAccName(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Account Type *</label>
                    <select
                      value={accType}
                      onChange={e => setAccType(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Joint">Joint</option>
                      <option value="Trust">Trust</option>
                      <option value="IRA">IRA</option>
                      <option value="Roth IRA">Roth IRA</option>
                      <option value="Inherited IRA">Inherited IRA</option>
                      <option value="SEP IRA">SEP IRA</option>
                      <option value="SIMPLE IRA">SIMPLE IRA</option>
                      <option value="401(k)">401(k)</option>
                      <option value="529">529</option>
                      <option value="Entity">Entity</option>
                      <option value="Estate">Estate</option>
                      <option value="Annuity">Annuity</option>
                      <option value="Alternative Investment">Alternative Investment</option>
                      <option value="Direct Business">Direct Business</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Account Value ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500000"
                      value={accValue}
                      onChange={e => setAccValue(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Custodian</label>
                    <input
                      type="text"
                      placeholder="e.g. Schwab"
                      value={accCustodian}
                      onChange={e => setAccCustodian(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Registration</label>
                    <input
                      type="text"
                      placeholder="e.g. Traditional IRA"
                      value={accRegistration}
                      onChange={e => setAccRegistration(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Readiness Status</label>
                  <select
                    value={accReadiness}
                    onChange={e => setAccReadiness(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="Ready">Ready</option>
                    <option value="Missing Items">Missing Items</option>
                    <option value="Needs Review">Needs Review</option>
                    <option value="Not Ready">Not Ready</option>
                    <option value="Not Reviewed">Not Reviewed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Notes</label>
                  <textarea
                    placeholder="Specify notes or data gaps..."
                    value={accNotes}
                    onChange={e => setAccNotes(e.target.value)}
                    className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowAccountModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Account'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TRANSITION PACKET CHECKLIST MODAL */}
      {showChecklistModal && activeChecklistAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader>
              <CardTitle>Transition Packet Checklist</CardTitle>
              <CardDescription>
                Account: <span className="font-bold text-slate-100">{activeChecklistAccount.name}</span> | Type: {activeChecklistAccount.type} | Custodian: {activeChecklistAccount.custodian || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto p-6 space-y-6 flex-1 pr-4 max-h-[60vh]">
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
                            <div key={item.id} className="p-3 rounded-md border border-slate-800 bg-slate-900/25 flex flex-col gap-2.5">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <span className="font-bold text-xs text-slate-200">
                                  {item.itemName} {isCritical && <span className="text-rose-500 font-extrabold text-[10px] ml-1 bg-rose-950/30 px-1 py-0.5 rounded border border-rose-500/20">CRITICAL</span>}
                                </span>
                                <select
                                  value={item.status}
                                  onChange={e => handleUpdateChecklistItem(item.itemKey, 'status', e.target.value)}
                                  className="bg-[#0b1329] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37] w-full sm:w-40"
                                >
                                  <option value="Unknown">Unknown</option>
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

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="secondary" onClick={() => setShowChecklistModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveChecklist} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Checklist Items'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
