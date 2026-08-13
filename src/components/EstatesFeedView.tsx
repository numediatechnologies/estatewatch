import React, { useEffect, useState, useMemo } from 'react';
import { DeceasedEstate, Province, EstateValueBand, AssetType, PipelineStage } from '../types';
import { 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  Calendar, 
  Grid, 
  List, 
  Map, 
  Download, 
  Briefcase, 
  Check, 
  Share2, 
  FileText,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown
} from 'lucide-react';
import { SouthAfricaMap } from './SouthAfricaMap';

interface EstatesFeedViewProps {
  estates: DeceasedEstate[];
  onSelectEstate: (estate: DeceasedEstate) => void;
  onAddToPipeline: (estate: DeceasedEstate, stage: PipelineStage, notes: string) => void;
  pipelineEstateIds: string[];
  isLoading?: boolean;
  isAdmin?: boolean;
}

export const EstatesFeedView: React.FC<EstatesFeedViewProps> = ({
  estates,
  onSelectEstate,
  onAddToPipeline,
  pipelineEstateIds,
  isLoading = false,
  isAdmin = false,
}) => {
  const PAGE_SIZE = 24;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>('all');
  const [selectedValueBand, setSelectedValueBand] = useState<EstateValueBand | 'all'>('all');
  const [hasPropertyOnly, setHasPropertyOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<'gazetteDate' | 'name' | 'province' | 'masterOffice' | 'estateNumber'>('gazetteDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered estates computation
  const filteredEstates = useMemo(() => {
    const filtered = estates.filter(e => {
      const matchesSearch = 
        e.deceasedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.estateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.executorName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProvince = selectedProvince === 'all' || e.province === selectedProvince;
      const matchesValue = selectedValueBand === 'all' || e.valueBand === selectedValueBand;
      const matchesProperty = !hasPropertyOnly || e.hasProperty;

      return matchesSearch && matchesProvince && matchesValue && matchesProperty;
    });
    return filtered.map((estate, index) => ({ estate, index })).sort((a, b) => {
      const left = a.estate;
      const right = b.estate;
      const leftValue = sortBy === 'gazetteDate' ? left.gazetteDate : sortBy === 'name' ? left.deceasedName : sortBy === 'province' ? left.province : sortBy === 'masterOffice' ? left.masterOffice : left.estateNumber;
      const rightValue = sortBy === 'gazetteDate' ? right.gazetteDate : sortBy === 'name' ? right.deceasedName : sortBy === 'province' ? right.province : sortBy === 'masterOffice' ? right.masterOffice : right.estateNumber;
      const leftMissing = !String(leftValue || '').trim();
      const rightMissing = !String(rightValue || '').trim();
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      const comparison = String(leftValue || '').localeCompare(String(rightValue || ''), undefined, { numeric: true, sensitivity: 'base' });
      return (sortDirection === 'asc' ? 1 : -1) * (comparison || String(left.id).localeCompare(String(right.id)) || a.index - b.index);
    }).map(({ estate }) => estate);
  }, [estates, searchTerm, selectedProvince, selectedValueBand, hasPropertyOnly, sortBy, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredEstates.length / PAGE_SIZE));
  const paginatedEstates = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEstates.slice(start, start + PAGE_SIZE);
  }, [filteredEstates, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProvince, selectedValueBand, hasPropertyOnly, sortBy, sortDirection]);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, pageCount));
  }, [pageCount]);

  // Province counts for map
  const provinceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    estates.forEach(e => {
      counts[e.province] = (counts[e.province] || 0) + 1;
    });
    return counts;
  }, [estates]);

  const handleExportCsv = () => {
    if (!isAdmin) return;
    const headers = ['Deceased Name', 'Master Ref', 'Province', 'District', 'Value Band', 'Executor', 'Contact', 'Gazette Date'];
    const rows = filteredEstates.map(e => [
      `"${e.deceasedName}"`,
      `"${e.estateNumber}"`,
      `"${e.province}"`,
      `"${e.district}"`,
      `"${e.valueBand}"`,
      `"${e.executorName}"`,
      `"${e.executorContact}"`,
      `"${e.gazetteDate}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `estatewatch_gazette_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-5 space-y-4">
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by surname (e.g. Van Der Merwe, Naidoo), Master ref, or executor..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* View Toggles & Export */}
          <div className="flex items-center gap-2">
            
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'map' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Interactive Map View"
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SA Map</span>
              </button>
            </div>

            {isAdmin && <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export CSV</span>
            </button>}

          </div>

        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Province:</span>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
            >
              <option value="all">All 9 Provinces</option>
              <option value="Gauteng">Gauteng</option>
              <option value="Western Cape">Western Cape</option>
              <option value="KwaZulu-Natal">KwaZulu-Natal</option>
              <option value="Eastern Cape">Eastern Cape</option>
              <option value="Free State">Free State</option>
              <option value="Mpumalanga">Mpumalanga</option>
              <option value="Limpopo">Limpopo</option>
              <option value="North West">North West</option>
              <option value="Northern Cape">Northern Cape</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Value Band:</span>
            <select
              value={selectedValueBand}
              onChange={(e) => setSelectedValueBand(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
            >
              <option value="all">All Values</option>
              <option value="< R250,000">&lt; R250,000</option>
              <option value="R250,000 - R1,000,000">R250k - R1M</option>
              <option value="R1,000,000 - R5,000,000">R1M - R5M</option>
              <option value="R5,000,000 - R20,000,000">R5M - R20M</option>
              <option value="R20,000,000+">R20M+</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-slate-300 font-medium cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={hasPropertyOnly}
              onChange={(e) => setHasPropertyOnly(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-500"
            />
            <span>Real Estate Property Flagged Only</span>
          </label>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium">Sort:</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200">
              <option value="gazetteDate">Gazette date</option>
              <option value="name">Deceased name</option>
              <option value="province">Province</option>
              <option value="masterOffice">Master’s Office</option>
              <option value="estateNumber">Estate number</option>
            </select>
            <button type="button" onClick={() => setSortDirection(current => current === 'asc' ? 'desc' : 'asc')} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300" aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}>
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>

        </div>

      </div>

      {/* Map View Integration */}
      {viewMode === 'map' && (
        <SouthAfricaMap
          selectedProvince={selectedProvince}
          onSelectProvince={setSelectedProvince}
          estateCounts={provinceCounts}
        />
      )}

      {/* Results Counter & Info */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div>
          {isLoading ? 'Loading gazetted deceased estate notices…' : filteredEstates.length === 0 ? 'No gazetted deceased estate notices found' : <>Showing <strong className="text-white">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredEstates.length)}–{Math.min(currentPage * PAGE_SIZE, filteredEstates.length)}</strong> of <strong className="text-white">{filteredEstates.length}</strong> gazetted deceased estate notices</>}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>All ID numbers masked under POPIA Section 18</span>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-live="polite">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />)}
        </div>
      )}

      {!isLoading && filteredEstates.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-white">No notices match those filters</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">Try clearing your search or choosing a different province, value band, or property filter.</p>
          <button type="button" onClick={() => { setSearchTerm(''); setSelectedProvince('all'); setSelectedValueBand('all'); setHasPropertyOnly(false); }} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400">Clear filters</button>
        </div>
      )}

      {/* View Mode: Grid Cards */}
      {!isLoading && filteredEstates.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEstates.map((estate) => {
            const savedInPipeline = pipelineEstateIds.includes(estate.id);
            return (
              <div
                key={estate.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-amber-500/5 group"
              >
                <div className="space-y-3">
                  
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 block w-fit mb-1">
                        {estate.province} • {estate.district}
                      </span>
                      <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                        {estate.deceasedName}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 shrink-0">
                      {estate.valueBand}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Master Ref:</span>
                      <strong className="text-slate-200 font-mono">{estate.estateNumber}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Date of Death:</span>
                      <span className="text-slate-300">{estate.dateOfDeath}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Masked ID:</span>
                      <span className="text-slate-400 font-mono">{estate.idNumberMasked}</span>
                    </div>
                  </div>

                  {estate.hasProperty && (
                    <div className="bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] line-clamp-2">
                        {estate.propertyDetails || 'Real Estate Asset Flagged'}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 italic line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    "{estate.rawNoticeSnippet}"
                  </p>

                  <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 space-y-0.5">
                    <div className="font-semibold text-slate-300 truncate">Executor: {estate.executorName}</div>
                    <div className="text-slate-500">{estate.executorContact}</div>
                  </div>

                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectEstate(estate)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>View Notice</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (!savedInPipeline) {
                        onAddToPipeline(estate, 'new', 'Saved from Gazette Feed');
                      }
                    }}
                    disabled={savedInPipeline}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                      savedInPipeline 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50 cursor-default'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                    title={savedInPipeline ? 'Saved in Pipeline' : 'Add to Pipeline CRM'}
                  >
                    {savedInPipeline ? <Check className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{savedInPipeline ? 'Saved' : '+ CRM'}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* View Mode: Table View */}
      {!isLoading && filteredEstates.length > 0 && viewMode === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Deceased Name</th>
                  <th className="p-3.5">Master Ref</th>
                  <th className="p-3.5">Province & District</th>
                  <th className="p-3.5">Value Band</th>
                  <th className="p-3.5">Assets</th>
                  <th className="p-3.5">Executor & Contact</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {paginatedEstates.map((estate) => {
                  const savedInPipeline = pipelineEstateIds.includes(estate.id);
                  return (
                    <tr key={estate.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        {estate.deceasedName}
                        <span className="block text-[10px] text-slate-500 font-mono">{estate.idNumberMasked}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">{estate.estateNumber}</td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-200">{estate.province}</span>
                        <span className="block text-[10px] text-slate-400">{estate.district}</span>
                      </td>
                      <td className="p-3.5 font-bold text-amber-400">{estate.valueBand}</td>
                      <td className="p-3.5">
                        {estate.hasProperty ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/50">
                            Property
                          </span>
                        ) : (
                          <span className="text-slate-500">Other</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-200">{estate.executorName}</div>
                        <div className="text-[10px] text-slate-400">{estate.executorContact}</div>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectEstate(estate)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => {
                              if (!savedInPipeline) {
                                onAddToPipeline(estate, 'new', 'Saved from Table');
                              }
                            }}
                            disabled={savedInPipeline}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              savedInPipeline ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            }`}
                            title={savedInPipeline ? 'Saved in Pipeline' : 'Add to Pipeline'}
                          >
                            {savedInPipeline ? <Check className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && filteredEstates.length > 0 && viewMode !== 'map' && pageCount > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400" aria-label="Estate results pagination">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-semibold text-slate-300 transition-colors hover:border-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Go to first page"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-semibold text-slate-300 transition-colors hover:border-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={pageCount}
              value={currentPage}
              onChange={(event) => {
                const nextPage = Number(event.target.value);
                if (Number.isFinite(nextPage)) setCurrentPage(Math.min(pageCount, Math.max(1, nextPage)));
              }}
              className="w-12 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-center font-bold text-white focus:border-amber-500 focus:outline-none"
              aria-label="Current page"
            />
            <span>of <strong className="text-white">{pageCount}</strong></span>
          </label>
          <button
            type="button"
            onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))}
            disabled={currentPage === pageCount}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-semibold text-slate-300 transition-colors hover:border-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(pageCount)}
            disabled={currentPage === pageCount}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-semibold text-slate-300 transition-colors hover:border-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Go to last page"
          >
            Last
          </button>
        </nav>
      )}

    </div>
  );
};
