import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Check } from 'lucide-react';
import { Meeting, MeetingSlot, Lead } from '../types';
import { api } from '../services/api';

interface MeetingsViewProps {
  leads: Lead[];
  onRefreshLeads: () => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({ leads, onRefreshLeads }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [slots, setSlots] = useState<MeetingSlot[]>([]);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState<number>(leads[0]?.id || 1);
  const [meetingType, setMeetingType] = useState('product_demo');
  const [selectedSlotIso, setSelectedSlotIso] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('Video call (link not generated)');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const loadData = async () => {
    try {
      const [mList, sList] = await Promise.all([
        api.getMeetings(),
        api.getMeetingSlots(4),
      ]);
      setMeetings(mList);
      setSlots(sList);
      if (sList.length > 0) setSelectedSlotIso(sList[0].iso);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !selectedSlotIso) return;
    setIsBooking(true);
    try {
      const targetLead = leads.find((l) => l.id === selectedLeadId);
      const title = meetingType === 'showroom_visit'
        ? `Showroom visit: ${targetLead?.name || 'Prospect'}`
        : `Product demo / sample review call: ${targetLead?.name || 'Prospect'}`;

      await api.scheduleMeeting({
        lead_id: selectedLeadId,
        title,
        meeting_type: meetingType,
        scheduled_time: selectedSlotIso,
        duration_minutes: meetingType === 'showroom_visit' ? 60 : 30,
        location_or_link: meetingLocation,
        notes: meetingNotes,
      });

      setIsBookModalOpen(false);
      await loadData();
      onRefreshLeads();
    } catch (err) {
      console.error(err);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Meetings &amp; Appointments</h2>
          <p>Product demo / sample review calls and showroom visits. Slots follow showroom hours; meetings are stored in this app only.</p>
          <span className="badge badge-amber" style={{ marginTop: '6px', display: 'inline-block' }}>
            Google Calendar — Demo mode — simulated (no invite or video link is created)
          </span>
        </div>

        <button onClick={() => setIsBookModalOpen(true)} className="btn btn-primary btn-sm">
          <Plus size={14} />
          <span>Book Meeting</span>
        </button>
      </div>

      {/* Main Grid: Left Scheduled Meetings, Right Available Slots */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Scheduled Appointments */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
            Scheduled Appointments ({meetings.length})
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Meeting</th>
                <th>Time</th>
                <th>Location / Link</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {meetings.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted-foreground)' }}>
                    No appointments scheduled yet.
                  </td>
                </tr>
              ) : (
                meetings.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{m.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{m.meeting_type}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--foreground)' }}>
                        {new Date(m.scheduled_time).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        {new Date(m.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.duration_minutes}m)
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                        {m.location_or_link}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-blue">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Available Calendar Slots */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
              Available Calendar Slots
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
              Working hours (10:00 AM - 6:00 PM IST)
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '380px', overflowY: 'auto' }}>
            {slots.map((s, idx) => (
              <div
                key={idx}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)' }}>
                    {s.display}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {s.recommended_for}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedSlotIso(s.iso);
                    setIsBookModalOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '24px', fontSize: '12px' }}
                >
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Book Meeting Modal */}
      {isBookModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--foreground)', marginBottom: '16px' }}>Book Appointment</h3>
            <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Prospect *
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(Number(e.target.value))}
                  className="form-select"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.budget} - {l.location})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Type
                  </label>
                  <select
                    value={meetingType}
                    onChange={(e) => {
                      setMeetingType(e.target.value);
                      setMeetingLocation(e.target.value === 'showroom_visit' ? 'Celestial Wear Studio, Indiranagar, Bengaluru' : 'Video call (link not generated)');
                    }}
                    className="form-select"
                  >
                    <option value="product_demo">Product demo / sample review call</option>
                    <option value="showroom_visit">Showroom visit</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                    Slot
                  </label>
                  <select
                    value={selectedSlotIso}
                    onChange={(e) => setSelectedSlotIso(e.target.value)}
                    className="form-select"
                  >
                    {slots.map((s, idx) => (
                      <option key={idx} value={s.iso}>
                        {s.display}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Location / Meeting Link
                </label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking}
                  className="btn btn-primary btn-sm"
                >
                  {isBooking ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
