/**
 * Decoupled Storage Architecture for Guest and Case Files
 * 
 * Provides isolated registries and helpers for Guest-specific files and Case-specific files.
 * Storage locations and identifiers are fully decoupled from UI components, enabling
 * dynamic replacement, runtime uploads, or static asset redirection.
 */

export interface DecoupledFileRecord {
  id: string;
  name: string;
  category: 'guest' | 'case';
  subCategory?: string; // e.g. zone_id, guest_id, round
  fileType: 'pdf' | 'doc' | 'image' | 'video' | 'other';
  url: string;
  uploadedAt: string;
  sizeBytes?: number;
  metadata?: Record<string, any>;
}

// In-memory / localStorage storage references
const GUEST_FILES_STORAGE_KEY = 'arkk_guest_files_registry';
const CASE_FILES_STORAGE_KEY = 'arkk_case_files_registry';

/**
 * Default decoupled storage registry for guest files
 */
export const initialGuestFiles: DecoupledFileRecord[] = [
  {
    id: 'guest-general-brief',
    name: 'ARKK 2040 Guest Dossier',
    category: 'guest',
    fileType: 'pdf',
    url: '/assets/docs/guest_briefing.pdf',
    uploadedAt: new Date().toISOString(),
    metadata: { description: 'General guest guidelines and welcome dossier' }
  }
];

/**
 * Default decoupled storage registry for case files
 */
export const initialCaseFiles: DecoupledFileRecord[] = [
  {
    id: 'case-master-index',
    name: 'Zone Master Case Repository',
    category: 'case',
    fileType: 'pdf',
    url: '/assets/docs/zone_cases_master.pdf',
    uploadedAt: new Date().toISOString(),
    metadata: { description: 'Master case repository (placeholder for future zone-specific case studies)' }
  }
];

/**
 * Retrieve all registered Guest files
 */
export function getGuestFiles(): DecoupledFileRecord[] {
  if (typeof window === 'undefined') return initialGuestFiles;
  try {
    const data = localStorage.getItem(GUEST_FILES_STORAGE_KEY);
    return data ? JSON.parse(data) : initialGuestFiles;
  } catch {
    return initialGuestFiles;
  }
}

/**
 * Retrieve all registered Case files
 */
export function getCaseFiles(): DecoupledFileRecord[] {
  if (typeof window === 'undefined') return initialCaseFiles;
  try {
    const data = localStorage.getItem(CASE_FILES_STORAGE_KEY);
    return data ? JSON.parse(data) : initialCaseFiles;
  } catch {
    return initialCaseFiles;
  }
}

/**
 * Register or update a guest file
 */
export function registerGuestFile(file: DecoupledFileRecord): void {
  if (typeof window === 'undefined') return;
  const current = getGuestFiles();
  const existingIndex = current.findIndex(f => f.id === file.id);
  let updated: DecoupledFileRecord[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = file;
  } else {
    updated = [...current, file];
  }
  localStorage.setItem(GUEST_FILES_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Register or update a case file
 */
export function registerCaseFile(file: DecoupledFileRecord): void {
  if (typeof window === 'undefined') return;
  const current = getCaseFiles();
  const existingIndex = current.findIndex(f => f.id === file.id);
  let updated: DecoupledFileRecord[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = file;
  } else {
    updated = [...current, file];
  }
  localStorage.setItem(CASE_FILES_STORAGE_KEY, JSON.stringify(updated));
}
