import React from 'react';

const GazetteAdminLazy = React.lazy(() => import('./GazetteAdmin').then(m => ({ default: m.GazetteAdmin })));

export const GazetteAdminLoader: React.FC = () => (
  <React.Suspense fallback={<div className="text-slate-400 text-xs">Loading admin...</div>}>
    <GazetteAdminLazy />
  </React.Suspense>
);
