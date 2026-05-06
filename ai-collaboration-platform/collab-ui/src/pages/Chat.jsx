import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Search, MessageSquare } from 'lucide-react';
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import './Chat.css';

const API_GATEWAY = 'http://localhost:8080';

function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  
  const stompClient = useRef(null);
  const scrollRef = useRef(null);
  const conversationId = "general-room"; // Fixed for demo

  useEffect(() => {
    const socket = new SockJS(`${API_GATEWAY}/ws-chat`);
    stompClient.current = Stomp.over(socket);
    stompClient.current.debug = null; // Disable debug logs

    stompClient.current.connect({}, () => {
      stompClient.current.subscribe(`/topic/${conversationId}`, (msg) => {
        const newMessage = JSON.parse(msg.body);
        setMessages(prev => [...prev, newMessage]);
      });
    });

    return () => {
      if (stompClient.current) stompClient.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !stompClient.current) return;

    const message = {
      conversationId: conversationId,
      senderId: user.email,
      content: input,
    };

    stompClient.current.send("/app/chat.send", {}, JSON.stringify(message));
    setInput('');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await axios.post(`${API_GATEWAY}/api/v1/ai/search`, {
        query: searchQuery,
        conversation_id: conversationId
      });
      setSearchResults(res.data);
      setIsCopilotOpen(true);
    } catch (err) {
      console.error("Search failed", err);
    }
  };

  return (
    <div className="chat-layout">
      <div className="chat-list">
        <div className="p-4 border-b border-border">
          <h3>Chats</h3>
        </div>
        <div className="p-4 flex items-center gap-3 bg-card m-2 rounded cursor-pointer border border-primary">
          <MessageSquare size={20} className="text-primary" />
          <div>
            <div className="font-semibold">General Room</div>
            <div className="text-xs text-secondary">Active now</div>
          </div>
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header">
          <div className="flex items-center gap-3">
            <h3 className="font-bold">General Room</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-card rounded-md border border-border px-2">
              <Search size={16} className="text-secondary" />
              <input 
                type="text" 
                placeholder="Search history..." 
                className="bg-transparent border-none py-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button 
              className={`sidebar-icon ${isCopilotOpen ? 'active' : ''}`}
              onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            >
              <Sparkles size={20} />
            </button>
          </div>
        </div>

        <div className="messages-container" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`message-bubble ${msg.senderId === user.email ? 'mine' : ''}`}>
              <div className="message-sender">{msg.senderId}</div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
        </div>

        <div className="chat-input-area">
          <form className="chat-input-container" onSubmit={sendMessage}>
            <input 
              type="text" 
              placeholder="Type a message..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="text-primary p-1">
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      {isCopilotOpen && (
        <div className="copilot-sidebar">
          <div className="copilot-header">
            <Sparkles size={20} />
            <span>AI Copilot</span>
          </div>
          <div className="copilot-content">
            {searchResults.length > 0 ? (
              <div>
                <h4 className="mb-4">Semantic Results</h4>
                {searchResults.map((res, i) => (
                  <div key={i} className="ai-result-card">
                    <div className="text-sm">{res.content}</div>
                    <div className="text-xs text-secondary mt-2">Relevance: {(res.score * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-secondary mt-10">
                Search above to find patterns and decisions in your history.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
