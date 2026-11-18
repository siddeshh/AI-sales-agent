import React, { useState } from 'react';
import { 
  Plus, Search, Filter, Upload, Eye, Trash2, 
  MessageSquare, PhoneCall, CheckSquare, Square 
} from 'lucide-react';
import { Lead } from '../types';
import { ScoreBadge, StageBadge, BANTBadge } from '../components/Badges';
import { api } from '../services/api';

interface LeadsViewProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onOpenChat: (lead: Lead) => void;
  onOpenVoice: (lead: Lead) => void;
  onRefreshLeads: () => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  onOpenLead,
  onOpenChat,
  onOpenVoice,
  onRefreshLeads,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedScoreCat, setSelectedScoreCat] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newBuyerType, setNewBuyerType] = useState('wholesale');
  const [newSource, setNewSource] = useState('Website Form');
  const [newTimeline, setNewTimeline] = useState('');

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.location && l.location.toLowerCase().includes(search.toLowerCase())) ||
      (l.requirements && l.requirements.toLowerCase().includes(search.toLowerCase()));

    const matchesStage = selectedStage === 'all' || l.stage.toLowerCase() === selectedStage.toLowerCase();
    const matchesScore = selectedScoreCat === 'all' || l.score_category.toLowerCase() === selectedScoreCat.toLowerCase();

    return matchesSearch && matchesStage && matchesScore;
  });

  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setIsSubmitting(true);
    try {
      await api.createLead({
        name: newName,
        email: newEmail,
        phone: newPhone,
        company: newCompany || undefined,
        budget: newBudget || undefined,
        location: newLocation || undefined,
        requirements: newRequirements || undefined,
        order_quantity: newQuantity ? Number(newQuantity) : undefined,
        buyer_type: newBuyerType,
        source: newSource,
        timeline: newTimeline || undefined,
        industry: 'retail',
      });
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      onRefreshLeads();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this lead?')) return;
    try {
      await api.deleteLead(id);
      onRefreshLeads();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Leads</h2>
          <p>Manage and prioritize your sales pipeline.</p>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary btn-sm">
          <Plus size={14} />
          <span>Add Lead</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={15} color="var(--muted-foreground)" />
          <input
            type="text"
            placeholder="Search leads by name, location, or requirements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ height: '32px', fontSize: '14px' }}
          />
        </div>

        {/* Stage Filter */}
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="form-select"
          style={{ width: 'auto', height: '32px', fontSize: '13px' }}
        >
          <option value="all">All Stages</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="engaged">Engaged</option>
          <option value="qualified">Qualified</option>
          <option value="meeting scheduled">Meeting Scheduled</option>
          <option value="won">Won</option>
        </select>

        {/* Score Filter */}
        <select
          value={selectedScoreCat}
          onChange={(e) => setSelectedScoreCat(e.target.value)}
          className="form-select"
          style={{ width: 'auto', height: '32px', fontSize: '13px' }}
        >
          <option value="all">All Scores</option>
          <option value="hot">Hot (81-100)</option>
          <option value="qualified">Qualified (61-80)</option>
          <option value="warm">Warm (31-60)</option>
          <option value="cold">Cold (0-30)</option>
        </select>
      </div>

      {/* Leads Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '36px' }}>
                <span onClick={handleSelectAll} style={{ cursor: 'pointer' }}>
                  {selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length ? (
                    <CheckSquare size={15} color="var(--brand)" />
                  ) : (
                    <Square size={15} color="var(--muted-foreground)" />
                  )}
                </span>
              </th>
              <th>Lead</th>
              <th>Location &amp; Requirements</th>
              <th>Budget</th>
              <th>Score</th>
              <th>BANT</th>
              <th>Stage</th>
              <th>Next Action</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted-foreground)' }}>
                  No leads matching criteria.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onOpenLead(lead)}
                    style={{ cursor: 'pointer', background: isSelected ? 'var(--muted)' : undefined }}
                  >
                    <td onClick={(e) => handleToggleSelect(lead.id, e)}>
                      {isSelected ? (
                        <CheckSquare size={15} color="var(--brand)" />
                      ) : (
                        <Square size={15} color="var(--border)" />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{lead.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        {lead.email || lead.phone || 'Inbound'}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--foreground)' }}>{lead.location || '—'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        {lead.requirements || ''}{lead.order_quantity ? ` · ${lead.order_quantity} pcs` : ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                        {lead.budget || '—'}
                      </span>
                    </td>
                    <td>
                      <ScoreBadge score={lead.lead_score} category={lead.score_category} />
                    </td>
                    <td>
                      <BANTBadge
                        budget={lead.budget_qualified}
                        authority={lead.authority_qualified}
                        need={lead.need_qualified}
                        timeline={lead.timeline_qualified}
                      />
                    </td>
                    <td>
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td style={{ maxWidth: '220px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--brand)', fontWeight: 500 }}>
                        {lead.next_best_action || 'Send outreach'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenChat(lead)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px' }}
                          title="Open Chat"
                        >
                          <MessageSquare size={14} color="var(--muted-foreground)" />
                        </button>
                        <button
                          onClick={() => onOpenVoice(lead)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px' }}
                          title="Voice Call"
                        >
                          <PhoneCall size={14} color="var(--muted-foreground)" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(lead.id, e)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px' }}
                          title="Delete"
                        >
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--foreground)', marginBottom: '16px' }}>Add Lead</h3>
            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Vikram Singhania"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="vikram@corp.com"
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98200 11223"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Budget
                  </label>
                  <input
                    type="text"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="e.g. ₹1,20,000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Kochi"
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Requirements
                </label>
                <input
                  type="text"
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  placeholder="e.g. Printed crew tees, mixed sizes"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Company
                  </label>
                  <input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Threadline Boutique" className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Order quantity (pieces)
                  </label>
                  <input type="number" min={1} value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)}
                    placeholder="e.g. 150" className="form-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Buyer type
                  </label>
                  <select value={newBuyerType} onChange={(e) => setNewBuyerType(e.target.value)} className="form-select">
                    <option value="wholesale">Wholesale (boutique / reseller)</option>
                    <option value="corporate">Corporate / institutional</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Source
                  </label>
                  <select value={newSource} onChange={(e) => setNewSource(e.target.value)} className="form-select">
                    <option>Website Form</option>
                    <option>Instagram</option>
                    <option>WhatsApp</option>
                    <option>Trade Fair</option>
                    <option>Referral</option>
                    <option>CSV Import</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Timeline
                </label>
                <input
                  type="text"
                  value={newTimeline}
                  onChange={(e) => setNewTimeline(e.target.value)}
                  placeholder="e.g. Within 3 weeks"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
