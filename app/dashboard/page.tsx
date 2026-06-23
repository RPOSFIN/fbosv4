export { default } from "../page";

// Existing imports ke saath ye add karo
import { Eye, Upload } from 'lucide-react';
import Link from 'next/link';

// Existing hub items array mein ye 2 add karo
const hubItems = [
  // ... existing items
  
  // NEW: Observation
  {
    title: 'Observation',
    description: 'Track and manage observations',
    icon: Eye,
    href: '/observation',
    color: 'from-blue-500 to-cyan-500',
  },
  
  // NEW: Error Checklist Upload
  {
    title: 'Error Checklist',
    description: 'Upload error checklists (PDF, CSV, Excel, TXT)',
    icon: Upload,
    href: '/error-checklist',
    color: 'from-red-500 to-orange-500',
  },
];