import { prisma } from './db';

const categoryMap: Record<string, string> = {
  email: 'Client Records',
  phone: 'Client Records',
  address: 'Client Records',
  dob: 'Client Records',
  ssn: 'Client Records',
  employment: 'Client Records',
  income: 'Client Records',
  netWorth: 'Client Records',
  experience: 'Client Records',
};

const labelMap: Record<string, string> = {
  email: 'Email Addresses',
  phone: 'Phone Numbers',
  address: 'Mailing Addresses',
  dob: 'Date of Birth',
  ssn: 'Social Security / Tax ID',
  employment: 'Employment Information',
  income: 'Annual Income',
  netWorth: 'Net Worth',
  experience: 'Investment Experience',
};

export async function autoCreateFindingsForAssessment(assessmentId: string, notesText: string | null) {
  if (!notesText || !notesText.includes('[Client Data Completeness Criteria]')) {
    return;
  }

  try {
    const lines = notesText.split('\n');
    let mode = 'none';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('[Client Data Completeness Criteria]')) {
        mode = 'criteria';
        continue;
      }
      if (line.includes('[General Notes]') || line.includes('[Assessment Evidence]') || line.includes('[Advisor Profile]') || line.includes('[Assessment Status]')) {
        mode = 'none';
        continue;
      }

      if (mode === 'criteria') {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const rest = parts.slice(1).join(':').trim();
          const tokens = rest.split('|');
          let status = 'Meets Expectations';
          let comments = '';
          let createFinding = false;
          let evidenceSummary = '';

          tokens.forEach(tok => {
            const trimmed = tok.trim();
            if (trimmed.startsWith('status=')) {
              status = trimmed.replace('status=', '').trim();
            } else if (trimmed.startsWith('comments=')) {
              comments = trimmed.replace('comments=', '').trim();
            } else if (trimmed.startsWith('createFinding=')) {
              createFinding = trimmed.replace('createFinding=', '').trim() === 'true';
            } else if (trimmed.startsWith('evidenceSummary=')) {
              evidenceSummary = trimmed.replace('evidenceSummary=', '').trim();
            }
          });

          if (createFinding) {
            const title = labelMap[key] || key;
            const category = categoryMap[key] || 'Client Records';

            // Check if finding already exists for this assessment
            const existingFinding = await prisma.finding.findFirst({
              where: { assessmentId, title, category }
            });

            if (!existingFinding) {
              // Determine severity based on status
              const severity = status === 'Deficiency Identified' ? 'Critical' : 'High';

              await prisma.finding.create({
                data: {
                  assessmentId,
                  category,
                  title,
                  description: comments || `Deficiency identified in ${title}.`,
                  severity,
                  impact: `Lack of complete information for ${title} may delay or complicate client repapering.`,
                  recommendation: `Reach out to client to gather missing details for ${title}.`,
                  owner: 'Advisor',
                  status: 'Open',
                  reviewerNotes: `Auto-generated from criteria status: ${status}`,
                  evidenceSummary: evidenceSummary || null,
                }
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error auto-creating findings:', e);
  }
}
