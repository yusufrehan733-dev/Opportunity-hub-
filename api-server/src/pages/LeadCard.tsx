import React from 'react';

type Lead = {
  title: string;
  description: string;
  link: string;
  tags?: string;
  isLocked?: boolean;
};

const LeadCard: React.FC<{ lead: Lead }> = ({ lead }) => {
  return (
    <div className={`border p-4 rounded shadow mb-4 ${lead.isLocked ? 'opacity-50' : ''}`}>
      <h2 className="font-bold text-lg">{lead.title}</h2>
      <p className="text-sm my-2">{lead.description}</p>
      {lead.tags && <p className="text-xs text-gray-500">Tags: {lead.tags}</p>}
      <a
        href={lead.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2 inline-block text-blue-600 hover:underline ${lead.isLocked ? 'pointer-events-none' : ''}`}
      >
        {lead.isLocked ? 'Locked' : 'View Lead'}
      </a>
    </div>
  );
};

export default LeadCard;
