import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import './Calendar.css';

const API_GATEWAY = 'http://localhost:8080';

function Calendar({ user }) {
  const [meetings, setMeetings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    startTime: '2024-05-10T10:00',
    roomId: 'boardroom-1'
  });

  const fetchMeetings = async () => {
    try {
      const res = await axios.get(`${API_GATEWAY}/api/v1/scheduler/meetings`);
      setMeetings(res.data);
    } catch (err) {
      console.error("Fetch meetings failed", err);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_GATEWAY}/api/v1/scheduler/book`, {
        ...newMeeting,
        organizerId: user.email,
        startTime: newMeeting.startTime + ":00Z", // Simple UTC normalization
        endTime: newMeeting.startTime + ":00Z" // Same for demo
      });
      setIsModalOpen(false);
      fetchMeetings();
    } catch (err) {
      alert(err.response?.data || "Conflict detected! The room is already booked.");
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM

  return (
    <div className="calendar-layout">
      <div className="calendar-header">
        <div className="flex items-center gap-4">
          <h2>Calendar</h2>
          <div className="flex items-center gap-2 bg-card p-1 rounded">
            <button className="p-1"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold">May 04-08, 2026</span>
            <button className="p-1"><ChevronRight size={16} /></button>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2 px-4 py-2" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> New Meeting
        </button>
      </div>

      <div className="calendar-grid">
        <div className="calendar-header-cell">Time</div>
        {days.map(day => <div key={day} className="calendar-header-cell">{day}</div>)}

        {hours.map(hour => (
          <React.Fragment key={hour}>
            <div className="calendar-time-cell">{hour}:00</div>
            {days.map(day => (
              <div key={`${day}-${hour}`} className="calendar-slot">
                {/* Simplified meeting rendering */}
                {meetings.filter(m => m.startTime.includes(`T${hour < 10 ? '0'+hour : hour}:00`)).map((m, i) => (
                  <div key={i} className="meeting-block">
                    <div className="font-bold">{m.title}</div>
                    <div className="text-[10px]">{m.roomId}</div>
                  </div>
                ))}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Schedule Meeting</h3>
            <form onSubmit={handleBook} className="auth-form mt-4" style={{marginTop: '1rem'}}>
              <input 
                type="text" 
                placeholder="Meeting Title" 
                value={newMeeting.title}
                onChange={e => setNewMeeting({...newMeeting, title: e.target.value})}
                required 
              />
              <input 
                type="datetime-local" 
                value={newMeeting.startTime}
                onChange={e => setNewMeeting({...newMeeting, startTime: e.target.value})}
                required 
              />
              <select 
                className="bg-card border border-border text-white p-2 rounded"
                value={newMeeting.roomId}
                onChange={e => setNewMeeting({...newMeeting, roomId: e.target.value})}
              >
                <option value="boardroom-1">Boardroom 1</option>
                <option value="studio">Studio</option>
                <option value="conference-room">Conference Room</option>
              </select>
              <div className="flex gap-2 mt-4" style={{marginTop: '1rem'}}>
                <button type="button" className="flex-1 bg-border p-2" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="flex-1 btn-primary p-2">Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
