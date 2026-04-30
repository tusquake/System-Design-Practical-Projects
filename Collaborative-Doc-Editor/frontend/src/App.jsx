import React, { useState } from 'react';
import CollabEditor from './components/CollabEditor';
import './App.css';

function App() {
  const [docId, setDocId] = useState('demo-doc');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <h1>SyncSpace</h1>
        </div>
        <div className="doc-selector">
          <label>Document ID:</label>
          <input 
            type="text" 
            value={docId} 
            onChange={(e) => setDocId(e.target.value)}
            placeholder="Enter doc ID to join"
          />
        </div>
      </header>
      
      <main className="app-main">
        <CollabEditor key={docId} docId={docId} />
      </main>
    </div>
  );
}

export default App;
