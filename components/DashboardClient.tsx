'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Plus, Search, Briefcase, Database, Users, TrendingUp, BarChart2, Edit } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge, MetricCard } from '@/components/ui';
import { getScoreRating } from '@/lib/scoring';

interface Assessment {
  id: string;
  notes: string | null;
  overallReadinessScore: number;
  createdAt: string;
}

interface Advisor {
  id: string;
  name: string;
  firmName: string;
  email: string | null;
  phone: string | null;
  businessModel: string;
  protocolStatus: string;
  totalAum: number | null;
  annualRevenue: number | null;
  crm: string | null;
  createdAt: string;
  assessments: Assessment[];
}

const parseStatus = (notesText: string | null) => {
  const defaults = {
    stage: 'Discovery Call Scheduled',
    owner: 'CTS Admin',
    priority: 'Normal',
    tags: [] as string[]
  };

  if (!notesText || !notesText.includes('[Assessment Status]')) {
    return defaults;
  }

  try {
    const lines = notesText.split('\n');
    let stage = 'Discovery Call Scheduled';
    let owner = 'CTS Admin';
    let priority = 'Normal';
    let tags: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('Stage:')) {
        stage = line.replace('Stage:', '').trim();
      } else if (line.startsWith('Owner:')) {
        owner = line.replace('Owner:', '').trim();
      } else if (line.startsWith('Priority:')) {
        priority = line.replace('Priority:', '').trim();
      } else if (line.startsWith('Tags:')) {
        const tagsStr = line.replace('Tags:', '').trim();
        tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];
      }
    }

    return { stage, owner, priority, tags };
  } catch (e) {
    return defaults;
  }
};

export default function DashboardClient({ initialAdvisors }: { initialAdvisors: Advisor[] }) {
  const router = useRouter();
  const [advisors, setAdvisors] = useState<Advisor[]>(initialAdvisors);
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Parse advisors and extract their latest assessment details
  const parsedAdvisors = advisors.map(advisor => {
    const latestAssessment = advisor.assessments.length > 0 ? advisor.assessments[0] : null;
    const status = latestAssessment ? parseStatus(latestAssessment.notes) : {
      stage: 'Discovery Call Scheduled',
      owner: 'CTS Admin',
      priority: 'Normal',
      tags: []
    };
    return {
      ...advisor,
      latestAssessment,
      status
    };
  });

  // Unique lists for dropdown filters
  const stages = Array.from(new Set(parsedAdvisors.filter(a => a.latestAssessment).map(a => a.status.stage)));
  const owners = Array.from(new Set(parsedAdvisors.filter(a => a.latestAssessment).map(a => a.status.owner)));
  const priorities = Array.from(new Set(parsedAdvisors.filter(a => a.latestAssessment).map(a => a.status.priority)));
  const allTags = Array.from(new Set(parsedAdvisors.filter(a => a.latestAssessment).flatMap(a => a.status.tags)));

  // Filter advisors list
  const filteredAdvisors = parsedAdvisors.filter((adv) => {
    const matchesSearch =
      adv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adv.firmName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModel = modelFilter === 'All' || adv.businessModel === modelFilter;
    const matchesStage = stageFilter === 'All' || adv.status.stage === stageFilter;
    const matchesOwner = ownerFilter === 'All' || adv.status.owner === ownerFilter;
    const matchesPriority = priorityFilter === 'All' || adv.status.priority === priorityFilter;
    const matchesTag = tagFilter === 'All' || adv.status.tags.includes(tagFilter);
    
    return matchesSearch && matchesModel && matchesStage && matchesOwner && matchesPriority && matchesTag;
  });

  // Calculate Metrics
  const totalAdvisors = filteredAdvisors.length;
  
  const scoredAdvisors = filteredAdvisors.filter(a => a.latestAssessment);
  const avgScore = scoredAdvisors.length > 0 
    ? Math.round(scoredAdvisors.reduce((acc, curr) => acc + (curr.latestAssessment?.overallReadinessScore || 0), 0) / scoredAdvisors.length)
    : 0;

  const totalAum = Math.round(
    filteredAdvisors.reduce((acc, curr) => acc + (curr.totalAum || 0), 0) * 10
  ) / 10;

  // Score rating distribution based on latest assessment scores
  const distribution = scoredAdvisors.reduce(
    (acc, curr) => {
      const score = curr.latestAssessment?.overallReadinessScore || 0;
      if (score >= 80) acc.green++;
      else if (score >= 60) acc.yellow++;
      else acc.red++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 }
  );

  // Chart Data: Compare latest assessment scores of the recent 8 advisors
  const chartData = [...scoredAdvisors]
    .slice(0, 8)
    .reverse()
    .map((adv) => ({
      name: adv.firmName.length > 15 ? `${adv.firmName.substring(0, 12)}...` : adv.firmName,
      fullName: adv.firmName,
      score: adv.latestAssessment?.overallReadinessScore || 0,
    }));

  const getBarColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      {/* Header and CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Know Your Book™ Dashboard</h1>
          <p className="text-sm text-slate-400">Manage advisor profiles and view Know Your Book™ Index assessments.</p>
        </div>
        <Link href="/audits/new">
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            New Assessment
          </Button>
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Advisors"
          value={totalAdvisors}
          icon={<Users size={20} className="text-[#d4af37]" />}
        />
        <MetricCard
          title="Avg. Know Your Book™ Index"
          value={scoredAdvisors.length > 0 ? `${avgScore}%` : 'N/A'}
          icon={<TrendingUp size={20} className="text-[#d4af37]" />}
        />
        <MetricCard
          title="Combined Assets (AUM)"
          value={`$${totalAum}B`}
          icon={<Database size={20} className="text-[#d4af37]" />}
        />
        <div className="bg-[#1c2541] border border-slate-700/60 rounded-lg p-5 flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Risk Profile Distribution
          </span>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
              <span className="text-xs font-bold text-slate-200">{distribution.green}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
              <span className="text-xs font-bold text-slate-200">{distribution.yellow}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
              <span className="text-xs font-bold text-slate-200">{distribution.red}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Guidelines Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 size={18} className="text-[#d4af37]" />
              Know Your Book™ Index Benchmarking
            </CardTitle>
            <CardDescription>Comparison of recent advisor assessment indices (overall Know Your Book™ Index percentage).</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center">
            {isMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c2541', borderColor: '#334155', borderRadius: '6px' }}
                    labelStyle={{ color: '#d4af37', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value) => [`${value}%`, 'Index Score']}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-sm">
                {isMounted ? 'No advisor assessment index data to display' : 'Loading analytics...'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Transition Framework Guidelines</CardTitle>
            <CardDescription>How scoring ranges translate to consulting deliverables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3.5 rounded bg-emerald-950/20 border border-emerald-500/20 flex gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-50 block mt-1.5 shrink-0"></span>
              <div>
                <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide">Ready / Low Risk (80 - 100)</h4>
                <p className="text-xs text-slate-300 mt-0.5">Advisor book is clean, agreements are signed, operations match. Proceed with standard transition timeline.</p>
              </div>
            </div>
            <div className="p-3.5 rounded bg-amber-950/20 border border-amber-500/20 flex gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-5 block mt-1.5 shrink-0"></span>
              <div>
                <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wide">Advisory / Moderate Risk (60 - 79)</h4>
                <p className="text-xs text-slate-300 mt-0.5">Identified record duplicates or documentation gaps. Requires 1-3 months of data cleanup and legal review.</p>
              </div>
            </div>
            <div className="p-3.5 rounded bg-rose-950/20 border border-rose-500/20 flex gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-5 block mt-1.5 shrink-0"></span>
              <div>
                <h4 className="font-bold text-rose-400 text-xs uppercase tracking-wide">Critical / High Risk (0 - 59)</h4>
                <p className="text-xs text-slate-300 mt-0.5">High documentation gaps, compliance concerns, or lack of staff capacity. Direct legal intervention required before moving.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advisors Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Advisor Portals</CardTitle>
              <CardDescription>Browse advisor profiles, view workspaces, and track active transitions.</CardDescription>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                  <Input
                    placeholder="Search advisor or firm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="sm:w-48 text-xs h-9"
                >
                  <option value="All">All Business Models</option>
                  <option value="RIA">RIA</option>
                  <option value="Broker Dealer">Broker Dealer</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Unknown">Unknown</option>
                </Select>
              </div>

              {/* Status and Tag Filters */}
              <div className="flex flex-wrap gap-2 pt-1">
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="bg-[#1c2541] border border-slate-700/60 text-slate-200 text-xs py-1 h-8 rounded px-2 focus:outline-none sm:w-44"
                >
                  <option value="All">All Stages</option>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="bg-[#1c2541] border border-slate-700/60 text-slate-200 text-xs py-1 h-8 rounded px-2 focus:outline-none sm:w-40"
                >
                  <option value="All">All Owners</option>
                  {owners.map(o => <option key={o} value={o}>{o}</option>)}
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-[#1c2541] border border-slate-700/60 text-slate-200 text-xs py-1 h-8 rounded px-2 focus:outline-none sm:w-36"
                >
                  <option value="All">All Priorities</option>
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="bg-[#1c2541] border border-slate-700/60 text-slate-200 text-xs py-1 h-8 rounded px-2 focus:outline-none sm:w-36"
                >
                  <option value="All">All Tags</option>
                  {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 overflow-x-auto">
          {filteredAdvisors.length > 0 ? (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400 font-medium">
                  <th className="px-6 py-3.5">Advisor / Firm</th>
                  <th className="px-6 py-3.5">Business Model</th>
                  <th className="px-6 py-3.5">Stage & Owner</th>
                  <th className="px-6 py-3.5">Priority & Tags</th>
                  <th className="px-6 py-3.5 text-right">AUM ($M)</th>
                  <th className="px-6 py-3.5 text-center">Latest Index</th>
                  <th className="px-6 py-3.5 text-right no-print">Workspace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredAdvisors.map((adv) => {
                  const latestScore = adv.latestAssessment?.overallReadinessScore ?? null;
                  const rating = latestScore !== null ? getScoreRating(latestScore) : null;
                  
                  return (
                    <tr key={adv.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{adv.name}</div>
                        <div className="text-xs text-slate-400">{adv.firmName}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{adv.businessModel}</td>
                      <td className="px-6 py-4">
                        {adv.latestAssessment ? (
                          <>
                            <Badge variant="neutral" className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 text-xs font-semibold">
                              {adv.status.stage}
                            </Badge>
                            <div className="text-[10px] text-slate-400 mt-1 font-medium">Owner: {adv.status.owner}</div>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">No Assessment</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {adv.latestAssessment ? (
                          <>
                            <Badge
                              variant={
                                adv.status.priority === 'Urgent' || adv.status.priority === 'High'
                                  ? 'critical'
                                  : 'neutral'
                              }
                            >
                              {adv.status.priority}
                            </Badge>
                            {adv.status.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 max-w-[160px]">
                                {adv.status.tags.map((tag, idx) => (
                                  <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded font-semibold">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 italic">No tags</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-300">
                        {adv.totalAum ? `$${adv.totalAum}M` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {latestScore !== null && rating ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-sm font-bold ${rating.textClass}`}>
                              {latestScore}%
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                              {rating.rating}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-xs">Unassessed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right no-print">
                        <div className="flex justify-end gap-2">
                          <Link href={`/advisors/${adv.id}`}>
                            <Button variant="secondary" size="sm" className="flex items-center gap-1">
                              <Briefcase size={14} /> Open Workspace
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
              No advisors found matching the criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
