import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import 'quill/dist/quill.snow.css';
import useCollabSync from '../hooks/useCollabSync';

export default function CollabEditor({ docId }) {
  const { ydoc, connected } = useCollabSync(docId);
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const bindingRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current || !ydoc) return;

    // Initialize Quill
    if (!quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'blockquote', 'code-block'],
            ['clean']
          ]
        },
        placeholder: 'Start typing collaboratively...'
      });
    }

    // Bind Quill to Yjs
    const ytext = ydoc.getText('quill');
    
    // Create binding if it doesn't exist
    if (!bindingRef.current) {
      bindingRef.current = new QuillBinding(ytext, quillRef.current);
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [ydoc]);

  return (
    <div className="collab-editor-container">
      <div className="editor-header">
        <div className="doc-title">Document: {docId}</div>
        <div className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
          <div className="pulse-dot"></div>
          {connected ? 'Live Syncing' : 'Reconnecting...'}
        </div>
      </div>
      <div className="editor-wrapper">
        <div ref={editorRef} className="quill-editor" />
      </div>
    </div>
  );
}
