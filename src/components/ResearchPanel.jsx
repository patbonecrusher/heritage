import React, { useState, useRef, useEffect, useCallback } from 'react';

function ResearchPanel({ isOpen, onClose, person, onAgentMessage }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check for API key on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.hasApiKey().then(setHasApiKey);
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize with person context when person changes
  useEffect(() => {
    if (person && isOpen) {
      const personContext = formatPersonContext(person);
      if (messages.length === 0) {
        setMessages([{
          role: 'system',
          content: `Research context loaded for: ${person.firstName || ''} ${person.lastName || ''}`,
          context: personContext
        }]);
      }
    }
  }, [person, isOpen]);

  const formatPersonContext = (p) => {
    if (!p) return null;
    const parts = [];
    if (p.firstName || p.lastName) {
      parts.push(`Name: ${[p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}`);
    }
    if (p.nickname) parts.push(`Nickname: ${p.nickname}`);
    if (p.birthDate) parts.push(`Birth: ${p.birthDate}${p.birthPlace ? ` in ${p.birthPlace}` : ''}`);
    if (p.deathDate) parts.push(`Death: ${p.deathDate}${p.deathPlace ? ` in ${p.deathPlace}` : ''}`);
    if (p.events?.length) {
      p.events.forEach(e => {
        if (e.type && (e.date || e.place)) {
          parts.push(`${e.type}: ${e.date || ''}${e.place ? ` in ${e.place}` : ''}`);
        }
      });
    }
    return parts.join('\n');
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the agent via IPC
      if (window.electronAPI?.sendAgentMessage) {
        const response = await window.electronAPI.sendAgentMessage({
          messages: [...messages, userMessage],
          personContext: person ? formatPersonContext(person) : null
        });

        if (response.error) {
          setMessages(prev => [...prev, {
            role: 'error',
            content: response.error
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: response.content,
            toolCalls: response.toolCalls
          }]);
        }
      } else {
        // Fallback for development without Electron
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Agent not available. Please run in Electron with a configured API key.'
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, person, isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="research-panel">
      <div className="research-header">
        <h3>Research Assistant</h3>
        {person && (
          <span className="research-person">
            {person.firstName} {person.lastName}
          </span>
        )}
        <button className="research-close" onClick={onClose}>×</button>
      </div>

      {!hasApiKey ? (
        <div className="research-setup">
          <div className="research-setup-icon">🔑</div>
          <h4>API Key Required</h4>
          <p>
            To use the Research Assistant, you need to configure your Claude API key
            in Preferences.
          </p>
          <button
            className="btn-primary"
            onClick={() => {
              onClose();
              // Trigger preferences open - parent should handle this
              if (window.electronAPI) {
                window.dispatchEvent(new CustomEvent('open-preferences'));
              }
            }}
          >
            Open Preferences
          </button>
        </div>
      ) : (
        <>
          <div className="research-messages">
            {messages.length === 0 && (
              <div className="research-empty">
                <p>Ask me to help research this person. I can:</p>
                <ul>
                  <li>Search genealogiequebec.com for records</li>
                  <li>Look up historical place names</li>
                  <li>Find baptism, marriage, and burial records</li>
                  <li>Suggest research strategies</li>
                </ul>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`research-message ${msg.role}`}>
                {msg.role === 'system' && (
                  <div className="message-system">
                    <span className="message-icon">📋</span>
                    {msg.content}
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="message-user">
                    {msg.content}
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="message-assistant">
                    <div className="message-content">{msg.content}</div>
                    {msg.toolCalls?.map((tc, i) => (
                      <div key={i} className="tool-call">
                        <span className="tool-icon">🔧</span>
                        <span className="tool-name">{tc.name}</span>
                        {tc.result && <span className="tool-result">{tc.result}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {msg.role === 'error' && (
                  <div className="message-error">
                    <span className="message-icon">⚠️</span>
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="research-message assistant">
                <div className="message-assistant loading">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="research-input">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this person's records..."
              rows={2}
              disabled={isLoading}
            />
            <button
              className="btn-primary"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ResearchPanel;
