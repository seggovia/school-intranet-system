export const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'matematica': { bg: '#3B82F6', border: '#2563EB', text: '#ffffff' },
  'lenguaje': { bg: '#10B981', border: '#059669', text: '#ffffff' },
  'historia': { bg: '#F59E0B', border: '#D97706', text: '#ffffff' },
  'ciencias naturales': { bg: '#8B5CF6', border: '#7C3AED', text: '#ffffff' },
  'fisica': { bg: '#06B6D4', border: '#0891B2', text: '#ffffff' },
  'quimica': { bg: '#EC4899', border: '#DB2777', text: '#ffffff' },
  'ingles': { bg: '#EF4444', border: '#DC2626', text: '#ffffff' },
  'educacion fisica': { bg: '#14B8A6', border: '#0D9488', text: '#ffffff' },
  'artes': { bg: '#F97316', border: '#EA580C', text: '#ffffff' },
  'musica': { bg: '#A855F7', border: '#9333EA', text: '#ffffff' },
  'default': { bg: '#6B7280', border: '#4B5563', text: '#ffffff' },
};

export function getSubjectColor(subjectName: string) {
  const key = subjectName.toLowerCase().trim();
  for (const [name, color] of Object.entries(SUBJECT_COLORS)) {
    if (key.includes(name)) return color;
  }
  return SUBJECT_COLORS['default'];
}

export function getSubjectStatus(startTime: string, endTime: string): 'active' | 'upcoming' | 'finished' | 'future' {
  const now = new Date();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const start = new Date(); start.setHours(startH, startM, 0);
  const end = new Date(); end.setHours(endH, endM, 0);
  const diffStart = (start.getTime() - now.getTime()) / 60000;
  if (now >= start && now <= end) return 'active';
  if (diffStart > 0 && diffStart <= 15) return 'upcoming';
  if (now > end) return 'finished';
  return 'future';
}
