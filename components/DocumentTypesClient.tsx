'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Button, Card, CardContent, Input, Label, Select, Badge, Textarea } from '@/components/ui';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Check, FileText, Upload, Download } from 'lucide-react';

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

interface DocumentType {
  id: string;
  name: string;
  documentKey: string;
  category: string;
  description: string | null;
  typicalAccountTypes: string;
  critical: boolean;
  active: boolean;
  notes: string | null;
  displayOrder: number;
}

interface DocumentTypesClientProps {
  initialDocTypes: DocumentType[];
  userRole: string;
}

export default function DocumentTypesClient({ initialDocTypes, userRole }: DocumentTypesClientProps) {
  const [docTypes, setDocTypes] = useState<DocumentType[]>(initialDocTypes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCritical, setSelectedCritical] = useState('All');
  const [selectedActive, setSelectedActive] = useState('All');

  // Modal control states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    documentKey: '',
    category: '',
    description: '',
    typicalAccountTypes: 'All',
    critical: false,
    active: true,
    notes: '',
    displayOrder: 0
  });

  const [modalError, setModalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isReadOnly = userRole === 'Read Only';

  const handleExportCSV = () => {
    const csvRows = [];
    csvRows.push(['Document Key', 'Name', 'Category', 'Description', 'Typical Account Types', 'Critical', 'Active', 'Notes', 'Display Order'].join(','));
    
    docTypes.forEach(doc => {
      const row = [
        `"${(doc.documentKey || '').replace(/"/g, '""')}"`,
        `"${(doc.name || '').replace(/"/g, '""')}"`,
        `"${(doc.category || '').replace(/"/g, '""')}"`,
        `"${(doc.description || '').replace(/"/g, '""')}"`,
        `"${(doc.typicalAccountTypes || '').replace(/"/g, '""')}"`,
        doc.critical ? 'Yes' : 'No',
        doc.active ? 'Yes' : 'No',
        `"${(doc.notes || '').replace(/"/g, '""')}"`,
        doc.displayOrder
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "document_types_library.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsedRows = localParseCSV(text);
      if (parsedRows.length <= 1) {
        alert('CSV file is empty or invalid.');
        return;
      }

      const headers = parsedRows[0].map(h => h.trim().toLowerCase());
      const dataRows = parsedRows.slice(1);

      const getVal = (row: string[], colName: string, defaultVal: string = ''): string => {
        const idx = headers.indexOf(colName.toLowerCase());
        return idx !== -1 && row[idx] !== undefined ? row[idx] : defaultVal;
      };

      const documentTypes = dataRows.map(row => {
        const rawCritical = getVal(row, 'Critical').toLowerCase();
        const rawActive = getVal(row, 'Active').toLowerCase();
        return {
          documentKey: getVal(row, 'Document Key') || getVal(row, 'key'),
          name: getVal(row, 'Name') || getVal(row, 'title'),
          category: getVal(row, 'Category'),
          description: getVal(row, 'Description'),
          typicalAccountTypes: getVal(row, 'Typical Account Types') || getVal(row, 'appliesTo') || 'All',
          critical: rawCritical === 'yes' || rawCritical === 'true',
          active: rawActive !== 'no' && rawActive !== 'false',
          notes: getVal(row, 'Notes') || getVal(row, 'comment'),
          displayOrder: parseInt(getVal(row, 'Display Order') || getVal(row, 'order') || '0')
        };
      }).filter(d => d.name && d.documentKey && d.category);

      if (documentTypes.length === 0) {
        alert('No valid document types found in the CSV.');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/document-types/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentTypes })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to import CSV.');
        }

        alert(`Successfully imported ${data.count} document types!`);
        
        const resList = await fetch('/api/document-types');
        if (resList.ok) {
          const listData = await resList.json();
          setDocTypes(listData.documentTypes);
        }
      } catch (err: any) {
        alert(err.message || 'Error importing CSV file.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = new Set(docTypes.map(d => d.category));
    return ['All', ...Array.from(cats)];
  }, [docTypes]);

  // Filtering & Search logic
  const filteredDocTypes = useMemo(() => {
    return docTypes.filter(doc => {
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.documentKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
      
      const matchesCritical = 
        selectedCritical === 'All' || 
        (selectedCritical === 'Critical' && doc.critical) ||
        (selectedCritical === 'Standard' && !doc.critical);

      const matchesActive = 
        selectedActive === 'All' || 
        (selectedActive === 'Active' && doc.active) ||
        (selectedActive === 'Inactive' && !doc.active);

      return matchesSearch && matchesCategory && matchesCritical && matchesActive;
    });
  }, [docTypes, searchQuery, selectedCategory, selectedCritical, selectedActive]);

  const openAddModal = () => {
    setFormData({
      name: '',
      documentKey: 'doc_',
      category: '',
      description: '',
      typicalAccountTypes: 'All',
      critical: false,
      active: true,
      notes: '',
      displayOrder: docTypes.length + 1
    });
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (doc: DocumentType) => {
    setCurrentDocType(doc);
    setFormData({
      name: doc.name,
      documentKey: doc.documentKey,
      category: doc.category,
      description: doc.description || '',
      typicalAccountTypes: doc.typicalAccountTypes,
      critical: doc.critical,
      active: doc.active,
      notes: doc.notes || '',
      displayOrder: doc.displayOrder
    });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setLoading(true);

    try {
      if (!formData.name || !formData.documentKey || !formData.category) {
        throw new Error('Name, Document Key, and Category are required.');
      }

      const response = await fetch('/api/document-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create document type.');
      }

      setDocTypes(prev => [...prev, data.documentType].sort((a, b) => a.displayOrder - b.displayOrder));
      setIsAddModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDocType) return;
    setModalError(null);
    setLoading(true);

    try {
      if (!formData.name || !formData.documentKey || !formData.category) {
        throw new Error('Name, Document Key, and Category are required.');
      }

      const response = await fetch(`/api/document-types/${currentDocType.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update document type.');
      }

      setDocTypes(prev => prev.map(d => d.id === currentDocType.id ? data.documentType : d).sort((a, b) => a.displayOrder - b.displayOrder));
      setIsEditModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Error occurred while updating.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the "${name}" document type?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/document-types/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete document type.');
      }

      setDocTypes(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error occurred while deleting document type.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-[#1c2541]/40 border border-slate-800 p-4 rounded-lg">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search document types..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="h-9 py-1 text-xs"
            >
              <option value="All">All Categories</option>
              {categories.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>

          <div className="w-full sm:w-36">
            <Select
              value={selectedCritical}
              onChange={e => setSelectedCritical(e.target.value)}
              className="h-9 py-1 text-xs"
            >
              <option value="All">All Severity</option>
              <option value="Critical">Critical Only</option>
              <option value="Standard">Standard Only</option>
            </Select>
          </div>

          <div className="w-full sm:w-32">
            <Select
              value={selectedActive}
              onChange={e => setSelectedActive(e.target.value)}
              className="h-9 py-1 text-xs"
            >
              <option value="All">All Status</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="ghost"
            className="flex items-center gap-1.5 h-9 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-slate-100 hover:bg-slate-800"
          >
            <Download size={14} /> Export CSV
          </Button>

          {!isReadOnly && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportCSV}
                accept=".csv"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="ghost"
                className="flex items-center gap-1.5 h-9 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-slate-100 hover:bg-slate-800"
              >
                <Upload size={14} /> Import CSV
              </Button>
              <Button
                onClick={openAddModal}
                className="flex items-center gap-1.5 h-9 text-xs font-bold uppercase tracking-wider bg-[#d4af37] text-[#0b1329] hover:bg-[#bfa032]"
              >
                <Plus size={14} /> Add Document Type
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Document Types Table */}
      <Card className="border-slate-800 shadow-2xl">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="px-5 py-3.5 w-52">Name</th>
                <th className="px-5 py-3.5 w-40">Document Key</th>
                <th className="px-5 py-3.5 w-32">Category</th>
                <th className="px-5 py-3.5 w-60">Typical Account Types</th>
                <th className="px-5 py-3.5 w-32">Severity</th>
                <th className="px-5 py-3.5 w-24">Status</th>
                <th className="px-5 py-3.5 w-40">Notes</th>
                {!isReadOnly && <th className="px-5 py-3.5 w-24 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDocTypes.length > 0 ? (
                filteredDocTypes.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-200">{doc.name}</div>
                      {doc.description && <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{doc.description}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-[10px] text-[#d4af37] bg-[#d4af37]/5 border border-[#d4af37]/20 px-1.5 py-0.5 rounded font-mono">
                        {doc.documentKey}
                      </code>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-medium">{doc.category}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {doc.typicalAccountTypes.split(',').map((t, idx) => (
                          <span key={idx} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {doc.critical ? (
                        <Badge variant="critical" className="font-bold tracking-wider text-[9px] uppercase">Critical</Badge>
                      ) : (
                        <Badge variant="neutral" className="font-bold tracking-wider text-[9px] uppercase">Standard</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {doc.active ? (
                        <Badge variant="ready" className="font-bold tracking-wider text-[9px] uppercase">Active</Badge>
                      ) : (
                        <Badge variant="neutral" className="font-bold tracking-wider text-[9px] uppercase text-slate-500">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[10px] text-slate-500 italic max-w-[200px] truncate" title={doc.notes || ''}>
                      {doc.notes || '—'}
                    </td>
                    {!isReadOnly && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(doc)}
                            className="p-1 text-slate-400 hover:text-[#d4af37] transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.name)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isReadOnly ? 7 : 8} className="px-5 py-10 text-center text-slate-500 text-xs italic">
                    No document types match your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ADD DOCUMENT TYPE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={16} className="text-[#d4af37]" /> Add Document Type
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              {modalError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/20 text-rose-400 text-[11px] rounded flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="add-name">Document Name *</Label>
                <Input
                  id="add-name"
                  type="text"
                  required
                  placeholder="ACH Authorization"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="add-key">Document Key *</Label>
                <Input
                  id="add-key"
                  type="text"
                  required
                  placeholder="doc_achAuthorization"
                  value={formData.documentKey}
                  onChange={e => setFormData(prev => ({ ...prev, documentKey: e.target.value }))}
                />
                <span className="text-[10px] text-slate-500">Unique alphanumeric key format `doc_something`.</span>
              </div>

              <div className="space-y-1">
                <Label htmlFor="add-category">Category *</Label>
                <Input
                  id="add-category"
                  type="text"
                  required
                  placeholder="Banking"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="add-description">Description</Label>
                <Textarea
                  id="add-description"
                  placeholder="ACH Transfer authorization form details..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-16"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="add-acctypes">Typical Account Types</Label>
                <Input
                  id="add-acctypes"
                  type="text"
                  placeholder="All or Trust, Joint, IRA"
                  value={formData.typicalAccountTypes}
                  onChange={e => setFormData(prev => ({ ...prev, typicalAccountTypes: e.target.value }))}
                />
                <span className="text-[10px] text-slate-500">Comma-separated string of account types.</span>
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.critical}
                    onChange={e => setFormData(prev => ({ ...prev, critical: e.target.checked }))}
                    className="accent-[#d4af37] rounded"
                  />
                  <span>Critical (Readiness Flag)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="accent-[#d4af37] rounded"
                  />
                  <span>Active Catalog Item</span>
                </label>
              </div>

              <div className="space-y-1">
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea
                  id="add-notes"
                  placeholder="Internal audit notes or regulatory references..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-16"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#d4af37] text-[#0b1329] hover:bg-[#bfa032]">
                  {loading ? 'Creating...' : 'Create Document Type'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCUMENT TYPE MODAL */}
      {isEditModalOpen && currentDocType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Edit2 size={14} className="text-[#d4af37]" /> Edit Document Type
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {modalError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/20 text-rose-400 text-[11px] rounded flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="edit-name">Document Name *</Label>
                <Input
                  id="edit-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-key">Document Key *</Label>
                <Input
                  id="edit-key"
                  type="text"
                  required
                  value={formData.documentKey}
                  onChange={e => setFormData(prev => ({ ...prev, documentKey: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-category">Category *</Label>
                <Input
                  id="edit-category"
                  type="text"
                  required
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-16"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-acctypes">Typical Account Types</Label>
                <Input
                  id="edit-acctypes"
                  type="text"
                  value={formData.typicalAccountTypes}
                  onChange={e => setFormData(prev => ({ ...prev, typicalAccountTypes: e.target.value }))}
                />
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.critical}
                    onChange={e => setFormData(prev => ({ ...prev, critical: e.target.checked }))}
                    className="accent-[#d4af37] rounded"
                  />
                  <span>Critical (Readiness Flag)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="accent-[#d4af37] rounded"
                  />
                  <span>Active Catalog Item</span>
                </label>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-16"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#d4af37] text-[#0b1329] hover:bg-[#bfa032]">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
