'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Edit, Trash2, Key, Shield, UserX, UserCheck, 
  Settings, FileText, Database, BookOpen, Layers, CheckSquare, PlusCircle 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLogin: string | null;
  mustChangePassword: boolean;
}

interface CurrentUser {
  userId: string;
  email: string;
  name?: string | null;
  role?: string | null;
}

interface DocumentType {
  id: string;
  name: string;
  category: string;
  description: string | null;
  active: boolean;
  displayOrder: number;
}

interface RequirementLibrary {
  id: string;
  name: string;
  description: string | null;
  category: string;
  appliesToAccountTypes: string;
  required: boolean;
  critical: boolean;
  weight: number;
  displayOrder: number;
  active: boolean;
  documentTypes: DocumentType[];
}

interface ProfileRequirement {
  id: string;
  profileId: string;
  requirementId: string;
  state: string; // Required, Optional, Hidden
  overrideWeight: number | null;
  requirement: RequirementLibrary;
}

interface RequirementProfile {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  profileRequirements: ProfileRequirement[];
}

interface AccountType {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  displayOrder: number;
}

export default function SettingsClient({
  initialUsers,
  currentUser,
  initialDocumentTypes,
  initialRequirementLibrary,
  initialRequirementProfiles,
  initialAccountTypes,
}: {
  initialUsers: User[];
  currentUser: CurrentUser;
  initialDocumentTypes: DocumentType[];
  initialRequirementLibrary: RequirementLibrary[];
  initialRequirementProfiles: RequirementProfile[];
  initialAccountTypes: AccountType[];
}) {
  const router = useRouter();
  const [activeMainTab, setActiveMainTab] = useState<'users' | 'methodology'>('users');
  const [activeMethodologyTab, setActiveMethodologyTab] = useState<'docs' | 'library' | 'profiles' | 'accountTypes'>('docs');

  // Lists state
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>(initialDocumentTypes);
  const [requirementLibrary, setRequirementLibrary] = useState<RequirementLibrary[]>(initialRequirementLibrary);
  const [requirementProfiles, setRequirementProfiles] = useState<RequirementProfile[]>(initialRequirementProfiles);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>(initialAccountTypes);

  // Common Loading
  const [loading, setLoading] = useState(false);

  // ==========================================
  // 1. STATE FOR USERS
  // ==========================================
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Read Only');
  const [active, setActive] = useState(true);
  const [userFormError, setUserFormError] = useState<string | null>(null);

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('Read Only');
    setActive(true);
    setUserFormError(null);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setEmail(user.email);
    setRole(user.role);
    setActive(user.active);
    setUserFormError(null);
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    if (!firstName || !lastName || !email || !role) {
      setUserFormError('All fields marked * are required');
      return;
    }
    setLoading(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, role, active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user');
      if (editingUser) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? data.user : u));
      } else {
        setUsers(prev => [data.user, ...prev]);
      }
      setShowUserModal(false);
      router.refresh();
    } catch (err: any) {
      setUserFormError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserActiveStatus = async (user: User) => {
    if (user.id === currentUser.userId) {
      alert('You cannot disable your own Super Admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to toggle status for ${user.firstName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');
      setUsers(prev => prev.map(u => u.id === user.id ? data.user : u));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerPasswordReset = async (user: User) => {
    if (!confirm(`Trigger password reset for ${user.firstName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerPasswordReset: true }),
      });
      if (!res.ok) throw new Error('Failed to reset password');
      alert('Password reset successfully triggered.');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. STATE FOR DOCUMENT TYPES
  // ==========================================
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentType | null>(null);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Client Information');
  const [docDescription, setDocDescription] = useState('');
  const [docActive, setDocActive] = useState(true);
  const [docDisplayOrder, setDocDisplayOrder] = useState('0');
  const [docError, setDocError] = useState<string | null>(null);

  const handleOpenAddDoc = () => {
    setEditingDoc(null);
    setDocName('');
    setDocCategory('Client Information');
    setDocDescription('');
    setDocActive(true);
    setDocDisplayOrder('0');
    setDocError(null);
    setShowDocModal(true);
  };

  const handleOpenEditDoc = (doc: DocumentType) => {
    setEditingDoc(doc);
    setDocName(doc.name);
    setDocCategory(doc.category);
    setDocDescription(doc.description || '');
    setDocActive(doc.active);
    setDocDisplayOrder(doc.displayOrder.toString());
    setDocError(null);
    setShowDocModal(true);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);
    if (!docName || !docCategory) {
      setDocError('Name and Category are required.');
      return;
    }
    setLoading(true);
    try {
      const url = editingDoc ? `/api/document-types/${editingDoc.id}` : '/api/document-types';
      const method = editingDoc ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: docName,
          category: docCategory,
          description: docDescription,
          active: docActive,
          displayOrder: parseInt(docDisplayOrder) || 0
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save Document Type');
      if (editingDoc) {
        setDocumentTypes(prev => prev.map(d => d.id === editingDoc.id ? data.documentType : d));
      } else {
        setDocumentTypes(prev => [...prev, data.documentType]);
      }
      setShowDocModal(false);
      router.refresh();
    } catch (err: any) {
      setDocError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Document Type? This will affect library requirements linking to it.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/document-types/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete Document Type');
      setDocumentTypes(prev => prev.filter(d => d.id !== id));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. STATE FOR REQUIREMENT LIBRARY
  // ==========================================
  const [showReqModal, setShowReqModal] = useState(false);
  const [editingReq, setEditingReq] = useState<RequirementLibrary | null>(null);
  const [reqName, setReqName] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqCategory, setReqCategory] = useState('Client Information');
  const [reqAppliesTo, setReqAppliesTo] = useState('All');
  const [reqRequired, setReqRequired] = useState(true);
  const [reqCritical, setReqCritical] = useState(false);
  const [reqWeight, setReqWeight] = useState('1.0');
  const [reqDisplayOrder, setReqDisplayOrder] = useState('0');
  const [reqActive, setReqActive] = useState(true);
  const [reqSelectedDocs, setReqSelectedDocs] = useState<string[]>([]);
  const [reqError, setReqError] = useState<string | null>(null);

  const handleOpenAddReq = () => {
    setEditingReq(null);
    setReqName('');
    setReqDescription('');
    setReqCategory('Client Information');
    setReqAppliesTo('All');
    setReqRequired(true);
    setReqCritical(false);
    setReqWeight('1.0');
    setReqDisplayOrder('0');
    setReqActive(true);
    setReqSelectedDocs([]);
    setReqError(null);
    setShowReqModal(true);
  };

  const handleOpenEditReq = (req: RequirementLibrary) => {
    setEditingReq(req);
    setReqName(req.name);
    setReqDescription(req.description || '');
    setReqCategory(req.category);
    setReqAppliesTo(req.appliesToAccountTypes);
    setReqRequired(req.required);
    setReqCritical(req.critical);
    setReqWeight(req.weight.toString());
    setReqDisplayOrder(req.displayOrder.toString());
    setReqActive(req.active);
    setReqSelectedDocs(req.documentTypes.map(d => d.id));
    setReqError(null);
    setShowReqModal(true);
  };

  const handleSaveReq = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(null);
    if (!reqName || !reqCategory || !reqAppliesTo) {
      setReqError('Name, Category, and Applies To are required.');
      return;
    }
    setLoading(true);
    try {
      const url = editingReq ? `/api/requirement-library/${editingReq.id}` : '/api/requirement-library';
      const method = editingReq ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reqName,
          description: reqDescription,
          category: reqCategory,
          appliesToAccountTypes: reqAppliesTo,
          required: reqRequired,
          critical: reqCritical,
          weight: parseFloat(reqWeight) || 1.0,
          displayOrder: parseInt(reqDisplayOrder) || 0,
          active: reqActive,
          documentTypeIds: reqSelectedDocs
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save requirement');
      if (editingReq) {
        setRequirementLibrary(prev => prev.map(r => r.id === editingReq.id ? data.requirement : r));
      } else {
        setRequirementLibrary(prev => [...prev, data.requirement]);
      }
      setShowReqModal(false);
      router.refresh();
    } catch (err: any) {
      setReqError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReq = async (id: string) => {
    if (!confirm('Are you sure you want to delete this requirement from the library?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/requirement-library/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete requirement');
      setRequirementLibrary(prev => prev.filter(r => r.id !== id));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. STATE FOR REQUIREMENT PROFILES & OVERRIDES
  // ==========================================
  const [selectedProfileId, setSelectedProfileId] = useState<string>(requirementProfiles[0]?.id || '');
  const selectedProfile = requirementProfiles.find(p => p.id === selectedProfileId);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<RequirementProfile | null>(null);
  const [profileNameState, setProfileNameState] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [profileActive, setProfileActive] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleOpenAddProfile = () => {
    setEditingProfile(null);
    setProfileNameState('');
    setProfileDescription('');
    setProfileActive(true);
    setProfileError(null);
    setShowProfileModal(true);
  };

  const handleOpenEditProfile = (prof: RequirementProfile) => {
    setEditingProfile(prof);
    setProfileNameState(prof.name);
    setProfileDescription(prof.description || '');
    setProfileActive(prof.active);
    setProfileError(null);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (!profileNameState) {
      setProfileError('Profile Name is required.');
      return;
    }
    setLoading(true);
    try {
      const url = editingProfile ? `/api/requirement-profiles/${editingProfile.id}` : '/api/requirement-profiles';
      const method = editingProfile ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileNameState,
          description: profileDescription,
          active: profileActive
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      if (editingProfile) {
        setRequirementProfiles(prev => prev.map(p => p.id === editingProfile.id ? data.profile : p));
      } else {
        setRequirementProfiles(prev => [...prev, data.profile]);
        setSelectedProfileId(data.profile.id);
      }
      setShowProfileModal(false);
      router.refresh();
    } catch (err: any) {
      setProfileError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile? All account assignments to this profile will fallback to Master Requirements.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/requirement-profiles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete profile');
      setRequirementProfiles(prev => prev.filter(p => p.id !== id));
      if (selectedProfileId === id) {
        setSelectedProfileId(requirementProfiles[0]?.id || '');
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignmentOverride = async (reqId: string, state: string, overrideWeightVal: string) => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const oWeight = overrideWeightVal.trim() === '' ? null : parseFloat(overrideWeightVal);
      const res = await fetch('/api/profile-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfileId,
          requirementId: reqId,
          state,
          overrideWeight: oWeight
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile override');
      
      // Update local state
      setRequirementProfiles(prev => prev.map(p => {
        if (p.id !== selectedProfileId) return p;
        const exists = p.profileRequirements.some(pr => pr.requirementId === reqId);
        let updatedPRs;
        if (exists) {
          updatedPRs = p.profileRequirements.map(pr => pr.requirementId === reqId ? data.profileRequirement : pr);
        } else {
          updatedPRs = [...p.profileRequirements, data.profileRequirement];
        }
        return { ...p, profileRequirements: updatedPRs };
      }));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 5. STATE FOR ACCOUNT TYPES
  // ==========================================
  const [showAcctModal, setShowAcctModal] = useState(false);
  const [editingAcct, setEditingAcct] = useState<AccountType | null>(null);
  const [acctName, setAcctName] = useState('');
  const [acctDescription, setAcctDescription] = useState('');
  const [acctActive, setAcctActive] = useState(true);
  const [acctDisplayOrder, setAcctDisplayOrder] = useState('0');
  const [acctError, setAcctError] = useState<string | null>(null);

  const handleOpenAddAcct = () => {
    setEditingAcct(null);
    setAcctName('');
    setAcctDescription('');
    setAcctActive(true);
    setAcctDisplayOrder('0');
    setAcctError(null);
    setShowAcctModal(true);
  };

  const handleOpenEditAcct = (acc: AccountType) => {
    setEditingAcct(acc);
    setAcctName(acc.name);
    setAcctDescription(acc.description || '');
    setAcctActive(acc.active);
    setAcctDisplayOrder(acc.displayOrder.toString());
    setAcctError(null);
    setShowAcctModal(true);
  };

  const handleSaveAcct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcctError(null);
    if (!acctName) {
      setAcctError('Name is required.');
      return;
    }
    setLoading(true);
    try {
      const url = editingAcct ? `/api/account-types/${editingAcct.id}` : '/api/account-types';
      const method = editingAcct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: acctName,
          description: acctDescription,
          active: acctActive,
          displayOrder: parseInt(acctDisplayOrder) || 0
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save Account Type');
      if (editingAcct) {
        setAccountTypes(prev => prev.map(a => a.id === editingAcct.id ? data.accountType : a));
      } else {
        setAccountTypes(prev => [...prev, data.accountType]);
      }
      setShowAcctModal(false);
      router.refresh();
    } catch (err: any) {
      setAcctError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAcct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Account Type?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/account-types/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete Account Type');
      setAccountTypes(prev => prev.filter(a => a.id !== id));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Main UI categories list for forms
  const categoriesList = [
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

  return (
    <div className="flex flex-col md:flex-row gap-6 items-stretch">
      {/* SIDEBAR NAVIGATION PANEL */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-2">
        <div className="p-4 bg-[#1c2541] border border-slate-700/60 rounded-lg space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold px-2">Settings Sections</p>
          
          <button
            onClick={() => setActiveMainTab('users')}
            className={`w-full text-left px-3 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition-all ${
              activeMainTab === 'users'
                ? 'bg-[#d4af37]/15 text-[#d4af37] border-l-2 border-[#d4af37]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Shield size={16} />
            User Administration
          </button>
          
          <button
            onClick={() => setActiveMainTab('methodology')}
            className={`w-full text-left px-3 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition-all ${
              activeMainTab === 'methodology'
                ? 'bg-[#d4af37]/15 text-[#d4af37] border-l-2 border-[#d4af37]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Settings size={16} />
            Methodology Rules
          </button>
        </div>

        {activeMainTab === 'methodology' && (
          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg space-y-1 animate-fadeIn">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold px-2.5 mb-1.5">Rule Entities</p>
            <button
              onClick={() => setActiveMethodologyTab('docs')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-medium flex items-center gap-2 ${
                activeMethodologyTab === 'docs' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <FileText size={13} />
              Document Types
            </button>
            <button
              onClick={() => setActiveMethodologyTab('library')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-medium flex items-center gap-2 ${
                activeMethodologyTab === 'library' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <BookOpen size={13} />
              Requirement Library
            </button>
            <button
              onClick={() => setActiveMethodologyTab('profiles')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-medium flex items-center gap-2 ${
                activeMethodologyTab === 'profiles' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Layers size={13} />
              Requirement Profiles
            </button>
            <button
              onClick={() => setActiveMethodologyTab('accountTypes')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-medium flex items-center gap-2 ${
                activeMethodologyTab === 'accountTypes' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Database size={13} />
              Account Types
            </button>
          </div>
        )}
      </div>

      {/* RIGHT WORKSPACE CONTENT CONTAINER */}
      <div className="flex-1 min-w-0 space-y-6">
        
        {/* SECTION 1: USER MANAGEMENT DISPLAY */}
        {activeMainTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-100">User Access Management</h2>
                <p className="text-xs text-slate-400">Configure assessors, advisors, read-only permissions, and trigger password resets.</p>
              </div>
              <Button onClick={handleOpenAddUser} size="sm" className="flex items-center gap-1.5">
                <Plus size={14} /> Add User
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400 font-medium">
                      <th className="px-6 py-3.5">Name</th>
                      <th className="px-6 py-3.5">Email</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-200">
                          {`${u.firstName || ''} ${u.lastName || ''}`}
                          {u.mustChangePassword && (
                            <Badge variant="advisory" className="ml-2 text-[8px] tracking-wide font-extrabold uppercase">Setup Pending</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400">{u.email}</td>
                        <td className="px-6 py-4">
                          <Badge variant={u.role === 'Super Admin' ? 'ready' : 'advisory'} className="text-[10px] py-0.5 uppercase">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold ${u.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {u.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-[#d4af37]" title="Reset Password" onClick={() => triggerPasswordReset(u)}>
                              <Key size={13} />
                            </Button>
                            <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-slate-400" title="Edit User" onClick={() => handleOpenEditUser(u)}>
                              <Edit size={13} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`p-1 h-7 w-7 ${u.active ? 'text-rose-400' : 'text-emerald-400'}`} 
                              title={u.active ? 'Disable' : 'Enable'} 
                              disabled={u.id === currentUser.userId}
                              onClick={() => toggleUserActiveStatus(u)}
                            >
                              {u.active ? <UserX size={13} /> : <UserCheck size={13} />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SECTION 2: METHODOLOGY RULES DISPLAY */}
        {activeMainTab === 'methodology' && (
          <div className="space-y-6">
            
            {/* SUB-SECTION A: DOCUMENT TYPES TAB */}
            {activeMethodologyTab === 'docs' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Document Type Catalog</h2>
                    <p className="text-xs text-slate-400">Classify physical transition document templates and layout requirements.</p>
                  </div>
                  <Button onClick={handleOpenAddDoc} size="sm" className="flex items-center gap-1">
                    <Plus size={14} /> Add Document Type
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400">
                          <th className="px-6 py-3">Display Order</th>
                          <th className="px-6 py-3">Document Name</th>
                          <th className="px-6 py-3">UI Category</th>
                          <th className="px-6 py-3">Description</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {documentTypes.map(doc => (
                          <tr key={doc.id} className="hover:bg-slate-800/10">
                            <td className="px-6 py-3 text-slate-400 font-mono text-xs">{doc.displayOrder}</td>
                            <td className="px-6 py-3 font-semibold text-slate-200">{doc.name}</td>
                            <td className="px-6 py-3 text-slate-300"><Badge variant="neutral">{doc.category}</Badge></td>
                            <td className="px-6 py-3 text-slate-400 text-xs truncate max-w-[200px]">{doc.description || '-'}</td>
                            <td className="px-6 py-3">
                              <span className={doc.active ? 'text-emerald-400' : 'text-slate-500'}>{doc.active ? 'Active' : 'Inactive'}</span>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-slate-400" onClick={() => handleOpenEditDoc(doc)}>
                                  <Edit size={13} />
                                </Button>
                                <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-rose-400" onClick={() => handleDeleteDoc(doc.id)}>
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SUB-SECTION B: REQUIREMENT LIBRARY TAB */}
            {activeMethodologyTab === 'library' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Global Requirement Library</h2>
                    <p className="text-xs text-slate-400">Manage all requirements, account associations, default weights, and document links.</p>
                  </div>
                  <Button onClick={handleOpenAddReq} size="sm" className="flex items-center gap-1">
                    <Plus size={14} /> Add Requirement
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400">
                          <th className="px-6 py-3">Order</th>
                          <th className="px-6 py-3">Requirement</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3">Applies To</th>
                          <th className="px-6 py-3">Critical</th>
                          <th className="px-6 py-3 font-mono">Weight</th>
                          <th className="px-6 py-3">Docs Linked</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {requirementLibrary.map(req => (
                          <tr key={req.id} className="hover:bg-slate-800/10">
                            <td className="px-6 py-3 text-slate-400 font-mono text-xs">{req.displayOrder}</td>
                            <td className="px-6 py-3 font-semibold text-slate-200">
                              {req.name} {!req.active && <Badge variant="critical" className="ml-1 text-[8px] uppercase">Disabled</Badge>}
                            </td>
                            <td className="px-6 py-3 text-slate-400 text-xs">{req.category}</td>
                            <td className="px-6 py-3 text-xs text-slate-300">
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{req.appliesToAccountTypes}</span>
                            </td>
                            <td className="px-6 py-3 text-center">
                              {req.critical ? <span className="text-rose-400 font-extrabold text-[10px] bg-rose-950/30 px-1 py-0.5 rounded border border-rose-800/40">CRITICAL</span> : <span className="text-slate-500">-</span>}
                            </td>
                            <td className="px-6 py-3 font-mono text-xs">{req.weight}</td>
                            <td className="px-6 py-3 text-slate-400 text-xs">
                              {req.documentTypes.map(d => d.name).join(', ') || '-'}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-slate-400" onClick={() => handleOpenEditReq(req)}>
                                  <Edit size={13} />
                                </Button>
                                <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-rose-400" onClick={() => handleDeleteReq(req.id)}>
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SUB-SECTION C: REQUIREMENT PROFILES & ASSIGNMENTS TAB */}
            {activeMethodologyTab === 'profiles' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Custodian & Transition Profiles</h2>
                    <p className="text-xs text-slate-400">Select a profile to customize requirements status overrides (Required/Optional/Hidden) and weight criteria.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleOpenAddProfile} size="sm" className="flex items-center gap-1">
                      <Plus size={14} /> Add Profile
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-slate-900/30 border border-slate-800 p-4 rounded-lg">
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <label className="text-xs text-slate-400 font-bold uppercase">Selected Active Profile</label>
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] text-slate-200"
                    >
                      {requirementProfiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.name === 'CTS Master Requirements' ? '(Master)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  {selectedProfile && selectedProfile.name !== 'CTS Master Requirements' && (
                    <div className="flex gap-2 self-end">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenEditProfile(selectedProfile)}>
                        Edit Info
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/20" onClick={() => handleDeleteProfile(selectedProfile.id)}>
                        Delete Profile
                      </Button>
                    </div>
                  )}
                </div>

                {selectedProfile && (
                  <div className="space-y-3">
                    <div className="border-b border-slate-800 pb-2">
                      <h3 className="font-extrabold text-[#d4af37] text-sm uppercase tracking-wider">{selectedProfile.name} Requirements Overrides</h3>
                      <p className="text-xs text-slate-400">{selectedProfile.description || 'No description provided.'}</p>
                    </div>

                    <Card>
                      <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400">
                              <th className="px-6 py-3">Requirement</th>
                              <th className="px-6 py-3">Category</th>
                              <th className="px-6 py-3">Library Default</th>
                              <th className="px-6 py-3 w-52">Active Status Override</th>
                              <th className="px-6 py-3 w-40">Weight Override</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {requirementLibrary.map(req => {
                              const assignment = selectedProfile.profileRequirements.find(pr => pr.requirementId === req.id);
                              const currentState = assignment ? assignment.state : 'Required';
                              const currentWeightVal = assignment?.overrideWeight !== null && assignment?.overrideWeight !== undefined
                                ? assignment.overrideWeight.toString()
                                : '';

                              return (
                                <tr key={req.id} className="hover:bg-slate-800/10">
                                  <td className="px-6 py-3 font-semibold text-slate-200">
                                    {req.name} {req.critical && <Badge variant="critical" className="ml-1.5 text-[8px] uppercase">Critical</Badge>}
                                  </td>
                                  <td className="px-6 py-3 text-slate-400 text-xs">{req.category}</td>
                                  <td className="px-6 py-3 text-xs text-slate-400">
                                    {req.required ? 'Required' : 'Optional'} | Weight: {req.weight}
                                  </td>
                                  <td className="px-6 py-3">
                                    <select
                                      value={currentState}
                                      onChange={(e) => handleUpdateAssignmentOverride(req.id, e.target.value, currentWeightVal)}
                                      className="bg-[#0b1329] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37] w-full"
                                    >
                                      <option value="Required">Required</option>
                                      <option value="Optional">Optional</option>
                                      <option value="Hidden">Hidden (Do Not Show)</option>
                                    </select>
                                  </td>
                                  <td className="px-6 py-3">
                                    <input
                                      type="number"
                                      step="0.1"
                                      placeholder={`Default (${req.weight})`}
                                      value={currentWeightVal}
                                      onChange={(e) => handleUpdateAssignmentOverride(req.id, currentState, e.target.value)}
                                      className="bg-[#0b1329] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#d4af37] w-full font-mono"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* SUB-SECTION D: ACCOUNT TYPES TAB */}
            {activeMethodologyTab === 'accountTypes' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Registered Account Types</h2>
                    <p className="text-xs text-slate-400">Manage account categories mapped inside client transition files.</p>
                  </div>
                  <Button onClick={handleOpenAddAcct} size="sm" className="flex items-center gap-1">
                    <Plus size={14} /> Add Account Type
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400">
                          <th className="px-6 py-3">Display Order</th>
                          <th className="px-6 py-3">Account Type Name</th>
                          <th className="px-6 py-3">Description</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {accountTypes.map(acc => (
                          <tr key={acc.id} className="hover:bg-slate-800/10">
                            <td className="px-6 py-3 text-slate-400 font-mono text-xs">{acc.displayOrder}</td>
                            <td className="px-6 py-3 font-semibold text-slate-200">{acc.name}</td>
                            <td className="px-6 py-3 text-slate-400 text-xs">{acc.description || '-'}</td>
                            <td className="px-6 py-3">
                              <span className={acc.active ? 'text-emerald-400' : 'text-slate-500'}>{acc.active ? 'Active' : 'Disabled'}</span>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-slate-400" onClick={() => handleOpenEditAcct(acc)}>
                                  <Edit size={13} />
                                </Button>
                                <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-rose-400" onClick={() => handleDeleteAcct(acc.id)}>
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ========================================================
          MODAL DIALOGS & FORMS (CRUD PORTALS)
         ======================================================== */}
      
      {/* 1. USER ADD/EDIT DIALOG */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl">
            <CardHeader>
              <CardTitle>{editingUser ? 'Edit System Assessor' : 'Create System Assessor'}</CardTitle>
              <CardDescription>Configure credential authorization privileges.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveUser} className="space-y-4 text-slate-100">
                {userFormError && (
                  <div className="bg-rose-950/25 border border-rose-500/20 text-rose-300 text-xs p-3 rounded">{userFormError}</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">First Name *</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Last Name *</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Email Address *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Permission Role *</label>
                  <select value={role} onChange={e => setRole(e.target.value)} disabled={editingUser?.id === currentUser.userId} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]">
                    <option value="Super Admin">Super Admin</option>
                    <option value="CTS Consultant">CTS Consultant</option>
                    <option value="Read Only">Read Only</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowUserModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save User'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. DOCUMENT TYPE ADD/EDIT DIALOG */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl">
            <CardHeader>
              <CardTitle>{editingDoc ? 'Edit Document Type' : 'Add Document Type'}</CardTitle>
              <CardDescription>Setup metadata indexes for checking physical paperwork files.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveDoc} className="space-y-4 text-slate-100">
                {docError && (
                  <div className="bg-rose-950/25 border border-rose-500/20 text-rose-300 text-xs p-3 rounded">{docError}</div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-400">Document Type Name *</label>
                  <input type="text" placeholder="ACH Authorization" value={docName} onChange={e => setDocName(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Category *</label>
                  <select value={docCategory} onChange={e => setDocCategory(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]">
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Description</label>
                  <textarea placeholder="Form used for bank routing overrides..." value={docDescription} onChange={e => setDocDescription(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] h-20 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Display Order</label>
                    <input type="number" value={docDisplayOrder} onChange={e => setDocDisplayOrder(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Active</label>
                    <select value={docActive ? 'true' : 'false'} onChange={e => setDocActive(e.target.value === 'true')} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowDocModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Document Type'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. REQUIREMENT LIBRARY ADD/EDIT DIALOG */}
      {showReqModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader>
              <CardTitle>{editingReq ? 'Edit Audit Requirement' : 'Add Audit Requirement'}</CardTitle>
              <CardDescription>Add checks to advisor books with score-weight factors.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveReq} className="space-y-4 text-slate-100">
                {reqError && (
                  <div className="bg-rose-950/25 border border-rose-500/20 text-rose-300 text-xs p-3 rounded">{reqError}</div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-400">Requirement Name *</label>
                  <input type="text" placeholder="Trust Certification Required" value={reqName} onChange={e => setReqName(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Description</label>
                  <textarea placeholder="Specify what this rule checks..." value={reqDescription} onChange={e => setReqDescription(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] h-16 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Category *</label>
                    <select value={reqCategory} onChange={e => setReqCategory(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]">
                      {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Applies To Account Types *</label>
                    <input type="text" placeholder="All, Trust, IRA, Roth IRA" value={reqAppliesTo} onChange={e => setReqAppliesTo(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                    <p className="text-[10px] text-slate-400 mt-1">Use 'All' or comma separated types.</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-900/40 p-3 rounded border border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={reqRequired} onChange={e => setReqRequired(e.target.checked)} className="rounded bg-[#0b1329] border-slate-700 text-[#d4af37] focus:ring-0" />
                    <span className="text-xs text-slate-200 font-bold">Required</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={reqCritical} onChange={e => setReqCritical(e.target.checked)} className="rounded bg-[#0b1329] border-slate-700 text-[#d4af37] focus:ring-0" />
                    <span className="text-xs text-slate-200 font-bold text-rose-400">Critical Item</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={reqActive} onChange={e => setReqActive(e.target.checked)} className="rounded bg-[#0b1329] border-slate-700 text-[#d4af37] focus:ring-0" />
                    <span className="text-xs text-slate-200 font-bold">Active</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Scoring Weight</label>
                    <input type="number" step="0.1" value={reqWeight} onChange={e => setReqWeight(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Display Order</label>
                    <input type="number" value={reqDisplayOrder} onChange={e => setReqDisplayOrder(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Associate Document Templates</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#0b1329] p-3 rounded border border-slate-800 max-h-40 overflow-y-auto">
                    {documentTypes.map(doc => (
                      <label key={doc.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reqSelectedDocs.includes(doc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReqSelectedDocs(prev => [...prev, doc.id]);
                            } else {
                              setReqSelectedDocs(prev => prev.filter(id => id !== doc.id));
                            }
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-[#d4af37] focus:ring-0"
                        />
                        {doc.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowReqModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Requirement'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. REQUIREMENT PROFILE ADD/EDIT DIALOG */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl">
            <CardHeader>
              <CardTitle>{editingProfile ? 'Edit Profile Info' : 'Create Custom Profile'}</CardTitle>
              <CardDescription>Setup customized custodian-specific transition audits.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 text-slate-100">
                {profileError && (
                  <div className="bg-rose-950/25 border border-rose-500/20 text-rose-300 text-xs p-3 rounded">{profileError}</div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-400">Profile Name *</label>
                  <input type="text" placeholder="Schwab Audit Profile" value={profileNameState} onChange={e => setProfileNameState(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Description</label>
                  <textarea placeholder="Special transition rules for Schwab custodial accounts..." value={profileDescription} onChange={e => setProfileDescription(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] h-24 resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowProfileModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. ACCOUNT TYPE ADD/EDIT DIALOG */}
      {showAcctModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-[#1c2541] border border-slate-700/80 shadow-2xl">
            <CardHeader>
              <CardTitle>{editingAcct ? 'Edit Account Type' : 'Add Account Type'}</CardTitle>
              <CardDescription>Setup structural options for checklists.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAcct} className="space-y-4 text-slate-100">
                {acctError && (
                  <div className="bg-rose-950/25 border border-rose-500/20 text-rose-300 text-xs p-3 rounded">{acctError}</div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-400">Account Type Name *</label>
                  <input type="text" placeholder="Inherited IRA" value={acctName} onChange={e => setAcctName(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Description</label>
                  <textarea placeholder="IRA inherited by non-spouse beneficiaries..." value={acctDescription} onChange={e => setAcctDescription(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] h-20 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Display Order</label>
                    <input type="number" value={acctDisplayOrder} onChange={e => setAcctDisplayOrder(e.target.value)} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Active</label>
                    <select value={acctActive ? 'true' : 'false'} onChange={e => setAcctActive(e.target.value === 'true')} className="w-full bg-[#0b1329] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37]">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setShowAcctModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Account Type'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
