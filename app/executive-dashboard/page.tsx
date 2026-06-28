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

export default function ExecutiveDashboard(){
return(
<div className="p-8">

<h1 className="text-3xl font-bold mb-6">
Executive Dashboard
</h1>

<div className="grid grid-cols-4 gap-4">

<div className="border rounded-xl p-4">
Revenue Intelligence
</div>

<div className="border rounded-xl p-4">
Sales Intelligence
</div>

<div className="border rounded-xl p-4">
Operations Intelligence
</div>

<div className="border rounded-xl p-4">
Finance Intelligence
</div>

</div>

</div>
);
}
