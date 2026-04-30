import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToUint8Array(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export default function useCollabSync(docId) {
  const [ydoc, setYdoc] = useState(null);
  const [connected, setConnected] = useState(false);
  const stompClientRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);

  useEffect(() => {
    // 1. Create a new Yjs Document
    const doc = new Y.Doc();
    setYdoc(doc);

    // Create a random sender ID to identify our own messages
    const senderId = Math.random().toString(36).substring(7);

    // 2. Fetch initial document state from REST API
    fetch(`http://localhost:8080/api/documents/${docId}`)
      .then((res) => res.json())
      .then((updates) => {
        // Apply all historical updates to construct the document
        updates.forEach((updateBase64) => {
          const update = base64ToUint8Array(updateBase64);
          Y.applyUpdate(doc, update);
        });
      })
      .catch((err) => console.error("Failed to fetch initial state", err));

    // 3. Connect to WebSocket (STOMP)
    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-collab'),
      debug: (str) => {
        // console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = () => {
      setConnected(true);
      
      // Subscribe to the document topic
      stompClient.subscribe(`/topic/document/${docId}`, (message) => {
        const data = JSON.parse(message.body);
        
        // Ignore our own updates
        if (data.senderId === senderId) return;

        // Apply remote update
        const remoteUpdate = base64ToUint8Array(data.update);
        isRemoteUpdateRef.current = true;
        Y.applyUpdate(doc, remoteUpdate);
        isRemoteUpdateRef.current = false;
      });
    };

    stompClient.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    stompClient.activate();
    stompClientRef.current = stompClient;

    // 4. Listen to local changes and broadcast them
    doc.on('update', (update, origin) => {
      // If the update came from a remote source, don't broadcast it back
      if (isRemoteUpdateRef.current) return;

      if (stompClient.connected) {
        const updateBase64 = uint8ArrayToBase64(update);
        stompClient.publish({
          destination: `/app/edit/${docId}`,
          body: JSON.stringify({
            docId,
            update: updateBase64,
            senderId
          })
        });
      }
    });

    return () => {
      if (stompClient.connected) {
        stompClient.deactivate();
      }
      doc.destroy();
    };
  }, [docId]);

  return { ydoc, connected };
}
