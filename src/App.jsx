// App.jsx
import { useState } from 'react';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { MdContentCopy, MdCheck } from 'react-icons/md';
import './index.css';

// Spinner Component
const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v8H4z"
    ></path>
  </svg>
);

// Utility function to format messages
const formatMessage = (content) => {
  return content;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [model, setModel] = useState('chatgpt-4o-latest');
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Function to retrieve API key based on model
  const getApiKey = (model) => {
    if (model.includes('claude')) {
      return import.meta.env.VITE_ANTHROPIC_API_KEY;
    } else {
      return import.meta.env.VITE_OPENAI_API_KEY;
    }
  };

  // Available models
  const models = [
    { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o (Latest)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini (Latest)' },
    { id: 'o1-preview', name: 'o1-preview (Latest)' },
    { id: 'o1-mini', name: 'o1-mini (Latest)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ];

  // Function to get maximum tokens based on model
  const getMaxTokens = (model) => {
    switch (model) {
      case 'chatgpt-4o-latest':
        return 16384;
      case 'gpt-4o-mini':
        return 16384;
      case 'o1-preview':
        return 32768;
      case 'o1-mini':
        return 65536;
      case 'claude-3-5-sonnet-20241022':
      case 'claude-3-5-haiku-20241022':
        return 8192;
      case 'gpt-4-turbo':
      case 'gpt-3.5-turbo':
        return 4096;
      default:
        return 4096;
    }
  };

  // Function to get context window based on model
  const getContextWindow = (model) => {
    switch (model) {
      case 'chatgpt-4o-latest':
      case 'gpt-4o-mini':
      case 'o1-preview':
      case 'o1-mini':
        return 128000;
      case 'claude-3-5-sonnet-20241022':
      case 'claude-3-5-haiku-20241022':
        return 200000;
      case 'gpt-4-turbo':
        return 128000;
      case 'gpt-3.5-turbo':
        return 16385;
      default:
        return 4096;
    }
  };

  // Function to estimate token count
  const estimateTokenCount = (text) => {
    return Math.ceil(text.length / 4);
  };

  // Function to trim message history based on context window
  const trimMessagesHistory = (messages, model) => {
    const contextWindow = getContextWindow(model);
    let totalTokens = 0;
    return messages
      .slice()
      .reverse()
      .filter((msg) => {
        totalTokens += estimateTokenCount(msg.content);
        return totalTokens <= contextWindow;
      })
      .reverse();
  };

  // Function to format messages for the selected model
  const formatMessagesForModel = (messages, model) => {
    if (model.includes('claude')) {
      return messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));
    } else {
      return messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    }
  };

  // Function to get temperature based on model
  const getTemperature = (model) => {
    const modelsWithFixedTemperature = ['o1-preview', 'o1-mini'];
    if (modelsWithFixedTemperature.includes(model)) {
      return 1;
    }
    return 0.7;
  };

  // Function to get model name from model id
  const getModelName = (modelId) => {
    const modelObj = models.find((m) => m.id === modelId);
    return modelObj ? modelObj.name : modelId;
  };

  // Function to send a message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isGeneratingAnswer) return;
    const apiKey = getApiKey(model);
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'API key not found. Please check your .env file.',
          model: 'Unknown',
        },
      ]);
      return;
    }
    try {
      setIsGeneratingAnswer(true);
      setStatusMessage('Waiting for API response...');
      const newMessage = { role: 'user', content: inputMessage };
      setMessages((prev) => [...prev, newMessage]);
      setInputMessage('');
      const formattedMessages = formatMessagesForModel(
        trimMessagesHistory([...messages, newMessage], model),
        model
      );
      let response;
      const isAnthropicModel = model.includes('claude');
      if (isAnthropicModel) {
        response = await fetch('/api/anthropic/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': apiKey,
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: getMaxTokens(model),
            messages: formattedMessages,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            `API Error! Status: ${response.status}${
              errorData ? `, Message: ${JSON.stringify(errorData)}` : ''
            }`
          );
        }
        const data = await response.json();
        setStatusMessage('Rendering response...');
        const assistantMessage = {
          role: 'assistant',
          content: data.content[0].text,
          model: getModelName(model),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStatusMessage('');
      } else {
        const temperature = getTemperature(model);
        response = await fetch('/api/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: formattedMessages,
            ...(temperature !== undefined && { temperature }),
            max_completion_tokens: getMaxTokens(model),
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            `API Error! Status: ${response.status}${
              errorData ? `, Message: ${JSON.stringify(errorData)}` : ''
            }`
          );
        }
        const data = await response.json();
        setStatusMessage('Rendering response...');
        const assistantMessage = {
          role: 'assistant',
          content: data.choices[0].message.content,
          model: getModelName(model),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStatusMessage('');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `An error occurred: ${error.message}\nPlease check your API key and token limits.`,
          model: 'Error',
        },
      ]);
      setStatusMessage('');
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  // Function to clear the conversation
  const clearMessages = () => {
    setMessages([]);
  };

  // Function to handle copying a message
  const handleCopy = (index) => {
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Function to handle copying a code block
  const handleCodeCopy = (index) => {
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Function to render message content
  const renderMessageContent = (message, index) => {
    if (typeof message.content === 'string') {
      return (
        <div className="relative">
          {message.role === 'assistant' && message.model && (
            <div className="model-label">{message.model}</div>
          )}
          <ReactMarkdown
            children={formatMessage(message.content)}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <div className="relative">
                    <SyntaxHighlighter
                      style={darcula}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                    <CopyToClipboard
                      text={String(children).replace(/\n$/, '')}
                      onCopy={() => handleCodeCopy(index)}
                    >
                      <button
                        className={`copy-button ${
                          copiedCodeIndex === index ? 'copied' : ''
                        }`}
                      >
                        {copiedCodeIndex === index ? <MdCheck /> : <MdContentCopy />}
                      </button>
                    </CopyToClipboard>
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          />
          <CopyToClipboard
            text={message.content}
            onCopy={() => handleCopy(index)}
          >
            <button
              className={`copy-button ${
                copiedIndex === index ? 'copied' : ''
              }`}
            >
              {copiedIndex === index ? <MdCheck /> : <MdContentCopy />}
            </button>
          </CopyToClipboard>
        </div>
      );
    }
    if (Array.isArray(message.content)) {
      return (
        <div className="relative">
          {message.role === 'assistant' && message.model && (
            <div className="model-label">{message.model}</div>
          )}
          {message.content.map((item, i) => (
            <span key={i}>{item.text || JSON.stringify(item)}</span>
          ))}
          <CopyToClipboard
            text={message.content.map((item) => item.text).join('\n')}
            onCopy={() => handleCopy(index)}
          >
            <button
              className={`copy-button ${
                copiedIndex === index ? 'copied' : ''
              }`}
            >
              {copiedIndex === index ? <MdCheck /> : <MdContentCopy />}
            </button>
          </CopyToClipboard>
        </div>
      );
    }
    return JSON.stringify(message.content);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Main Chat Area */}
      <div className="flex-1 overflow-auto container mx-auto p-4 space-y-4 pb-32 w-full max-w-none">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message-container ${
              message.role === 'user' ? 'user' : 'assistant'
            }`}
          >
            {renderMessageContent(message, index)}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-800 fixed bottom-0 w-full">
        <div className="container mx-auto p-4">
          <div className="flex flex-row gap-4 items-start w-full">
            {/* Model Selection */}
            <div className="flex flex-col">
              <label className="mb-2 text-sm">Model:</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="model-select"
              >
                {models.map((modelOption) => (
                  <option key={modelOption.id} value={modelOption.id}>
                    {modelOption.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Input and Buttons */}
            <div className="flex flex-1 flex-row gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message... (Shift + Enter for new line)"
                onKeyPress={(e) =>
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !isGeneratingAnswer &&
                  sendMessage()
                }
                disabled={isGeneratingAnswer}
                className="flex-1 bg-gray-800 text-white border-gray-700 h-24 resize-none p-2 rounded-md"
                as="textarea"
              />
              {/* Buttons Container */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={sendMessage}
                  disabled={isGeneratingAnswer}
                  className="send-button"
                >
                  {isGeneratingAnswer ? <Spinner /> : 'Send'}
                </Button>
                <Button
                  onClick={clearMessages}
                  disabled={isGeneratingAnswer || messages.length === 0}
                  className="clear-button"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          {statusMessage && (
            <div className="flex items-center mt-2">
              <Spinner />
              <span className="ml-2">{statusMessage}</span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        pre {
          background: #2d2d2d;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
        code {
          font-family: 'Fira Code', monospace;
          color: #fff;
        }
        button.copy-button {
          background: rgba(0, 0, 0, 0.5);
          border: none;
          cursor: pointer;
          padding: 6px;
          position: absolute;
          top: 8px;
          right: 8px;
          color: #fff;
          border-radius: 4px;
          transition: background 0.3s;
        }
        button.copy-button:hover {
          background: rgba(0, 0, 0, 0.7);
        }
        button.copy-button:focus {
          outline: none;
        }
        button.copy-button.copied {
          color: #4caf50;
        }
        .message-container.user,
        .message-container.assistant {
          text-align: left;
          font-size: 16px;
          max-width: 90%;
          margin: 0 auto;
          word-break: break-word;
          position: relative;
        }
        .message-container.user {
          background-color: #1f2937;
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .message-container.assistant {
          background-color: #374151;
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .message-container {
          margin-bottom: auto;
        }
        .bg-gray-900 {
          background-color: #1f2937 !important;
        }
        .bg-gray-800 {
          background-color: #1f2937 !important;
        }
        .model-select {
          background-color: #1f2937;
          color: #fff;
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid #4b5563;
          cursor: pointer;
          width: 200px;
          appearance: none;
        }
        .model-select:focus {
          outline: none;
          border-color: #2563eb;
        }
        .model-select option {
          background-color: #1f2937;
          color: #fff;
        }
        .send-button,
        .clear-button {
          background-color: #2563eb;
          color: #fff;
          padding: 12px 16px;
          border-radius: 4px;
          cursor: pointer;
          border: none;
          width: 100%;
        }
        .send-button:hover,
        .clear-button:hover {
          background-color: #1d4ed8;
        }
        .send-button:disabled,
        .clear-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        .container {
          max-width: 100%;
        }
        .model-label {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}

export default App;