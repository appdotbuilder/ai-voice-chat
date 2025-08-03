
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, ChatSession, CreateChatMessageInput, AudioStatus } from '../../server/src/schema';

function App() {
  // Core state
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Connection setup state
  const [websocketUrl, setWebsocketUrl] = useState('wss://api.example.com/chat');
  const [apiToken, setApiToken] = useState('your-api-token-here');
  const [isConnected, setIsConnected] = useState(false);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    session_id: '',
    is_recording: false,
    is_playing: false,
    volume_level: 0,
    connection_status: 'disconnected'
  });

  // WebSocket and media refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  // Load messages for current session
  const loadMessages = useCallback(async () => {
    if (!currentSession) return;
    try {
      const result = await trpc.getChatMessages.query({ sessionId: currentSession.id });
      setMessages(result);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [currentSession]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!currentSession) return;

    try {
      setAudioStatus(prev => ({ ...prev, connection_status: 'connecting' }));
      
      // Note: This is a stub implementation for WebSocket connection
      // In a real implementation, you would connect to the actual WebSocket URL
      wsRef.current = new WebSocket(currentSession.websocket_url);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setAudioStatus(prev => ({ ...prev, connection_status: 'connected' }));
        
        // Send authentication
        wsRef.current?.send(JSON.stringify({
          type: 'auth',
          token: currentSession.api_token
        }));
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'audio_response') {
            // Handle AI audio response
            setIsPlaying(true);
            setAudioStatus(prev => ({ ...prev, is_playing: true }));
            
            // Create AI audio message
            const aiMessage: CreateChatMessageInput = {
              session_id: currentSession.id,
              message_type: 'ai_audio',
              content: data.audio_url || null,
              transcription: data.transcription || null,
              audio_duration: data.duration || null
            };
            
            const createdMessage = await trpc.createChatMessage.mutate(aiMessage);
            setMessages(prev => [...prev, createdMessage]);
            
            // Simulate audio playback (stub)
            setTimeout(() => {
              setIsPlaying(false);
              setAudioStatus(prev => ({ ...prev, is_playing: false }));
            }, (data.duration || 3) * 1000);
            
          } else if (data.type === 'text_response') {
            // Handle AI text response
            const aiMessage: CreateChatMessageInput = {
              session_id: currentSession.id,
              message_type: 'ai_text',
              content: data.text,
              transcription: null,
              audio_duration: null
            };
            
            const createdMessage = await trpc.createChatMessage.mutate(aiMessage);
            setMessages(prev => [...prev, createdMessage]);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setAudioStatus(prev => ({ ...prev, connection_status: 'disconnected' }));
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setAudioStatus(prev => ({ ...prev, connection_status: 'error' }));
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setAudioStatus(prev => ({ ...prev, connection_status: 'error' }));
    }
  }, [currentSession]);

  // Create new chat session
  const startNewSession = async () => {
    setIsLoading(true);
    try {
      const session = await trpc.createChatSession.mutate({
        websocket_url: websocketUrl,
        api_token: apiToken,
        connection_status: 'connecting'
      });
      
      setCurrentSession(session);
      setMessages([]);
      setAudioStatus(prev => ({ ...prev, session_id: session.id }));
      
      // Auto-connect WebSocket after creating session
      setTimeout(() => connectWebSocket(), 100);
      
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Audio recording setup
  const setupAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      // Setup audio context for volume monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Setup media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // Stub: In real implementation, you would upload the audio file
        // and get a file path to store in the database
        const generatedFilePath = `audio_${Date.now()}.wav`;
        
        // Send audio via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Convert blob to base64 for WebSocket transmission (stub)
          const reader = new FileReader();
          reader.onload = () => {
            wsRef.current?.send(JSON.stringify({
              type: 'audio_message',
              audio_data: reader.result,
              session_id: currentSession?.id
            }));
          };
          reader.readAsDataURL(audioBlob);
        }
        
        // Create user audio message record
        if (currentSession) {
          const userMessage: CreateChatMessageInput = {
            session_id: currentSession.id,
            message_type: 'user_audio',
            content: generatedFilePath,
            transcription: 'Audio message recorded', // Stub transcription
            audio_duration: 3 // Stub duration
          };
          
          const createdMessage = await trpc.createChatMessage.mutate(userMessage);
          setMessages(prev => [...prev, createdMessage]);
        }
        
        audioChunks.length = 0;
      };
      
    } catch (error) {
      console.error('Failed to setup audio recording:', error);
    }
  };

  // Start/stop recording
  const toggleRecording = async () => {
    if (!currentSession || !isConnected) return;
    
    if (!isRecording) {
      await setupAudioRecording();
      mediaRecorderRef.current?.start();
      setIsRecording(true);
      setAudioStatus(prev => ({ ...prev, is_recording: true }));
      
      // Start volume monitoring
      startVolumeMonitoring();
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setAudioStatus(prev => ({ ...prev, is_recording: false, volume_level: 0 }));
      setVolumeLevel(0);
      
      // Stop volume monitoring
      if (volumeIntervalRef.current !== null) {
        window.clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      
      // Stop audio stream
      audioStreamRef.current?.getTracks().forEach(track => track.stop());
    }
  };

  // Volume monitoring
  const startVolumeMonitoring = () => {
    if (!analyserRef.current) return;
    
    volumeIntervalRef.current = window.setInterval(() => {
      if (!analyserRef.current) return;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedVolume = Math.min(average / 128, 1); // Normalize to 0-1
      
      setVolumeLevel(normalizedVolume);
      setAudioStatus(prev => ({ ...prev, volume_level: normalizedVolume }));
    }, 100);
  };

  // Send text message
  const sendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !currentSession || !isConnected) return;
    
    setIsLoading(true);
    try {
      // Create user text message
      const userMessage: CreateChatMessageInput = {
        session_id: currentSession.id,
        message_type: 'user_text',
        content: textInput.trim(),
        transcription: null,
        audio_duration: null
      };
      
      const createdMessage = await trpc.createChatMessage.mutate(userMessage);
      setMessages(prev => [...prev, createdMessage]);
      
      // Send to WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'text_message',
          text: textInput.trim(),
          session_id: currentSession.id
        }));
      }
      
      setTextInput('');
    } catch (error) {
      console.error('Failed to send text message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connection status badge
  const getConnectionStatusBadge = () => {
    const status = audioStatus.connection_status;
    const variants: Record<typeof status, "default" | "secondary" | "destructive" | "outline"> = {
      connected: 'default',
      connecting: 'secondary',
      disconnected: 'outline',
      error: 'destructive'
    };
    
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  // Message rendering
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.message_type.startsWith('user_');
    const isAudio = message.message_type.includes('audio');
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">
              {isUser ? 'You' : 'AI Assistant'}
            </span>
            {isAudio && (
              <Badge variant="outline" className="text-xs">
                🎵 {message.audio_duration ? `${message.audio_duration}s` : 'Audio'}
              </Badge>
            )}
          </div>
          
          {message.content && !isAudio && (
            <p className="text-sm">{message.content}</p>
          )}
          
          {message.transcription && (
            <p className="text-sm italic opacity-80">
              {isAudio ? `"${message.transcription}"` : message.transcription}
            </p>
          )}
          
          {isAudio && message.content && (
            <div className="mt-2 text-xs opacity-60">
              Audio file: {message.content}
            </div>
          )}
          
          <div className="text-xs opacity-60 mt-1">
            {message.created_at.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      audioStreamRef.current?.getTracks().forEach(track => track.stop());
      if (volumeIntervalRef.current !== null) {
        window.clearInterval(volumeIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-indigo-900">
          🎙️ AI Voice Chat Assistant
        </h1>

        {!currentSession ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 Start New Chat Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">WebSocket URL</label>
                <Input
                  type="url"
                  value={websocketUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebsocketUrl(e.target.value)}
                  placeholder="wss://api.example.com/chat"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">API Token</label>
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiToken(e.target.value)}
                  placeholder="your-api-token-here"
                  required
                />
              </div>
              <Button onClick={startNewSession} disabled={isLoading} className="w-full">
                {isLoading ? 'Creating Session...' : 'Start Chat Session'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Status Panel */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Connection:</span>
                      {getConnectionStatusBadge()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Session:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {currentSession.id.slice(-8)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {isRecording && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-red-600">Recording</span>
                      </div>
                    )}
                    {isPlaying && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-600">AI Speaking</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Volume Level Indicator */}
                {isRecording && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Microphone Level:</span>
                      <span className="text-xs text-gray-600">{Math.round(volumeLevel * 100)}%</span>
                    </div>
                    <Progress value={volumeLevel * 100} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Messages */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💬 Chat Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <p className="text-lg">👋 Start the conversation!</p>
                      <p className="text-sm">Record a voice message or type to chat with the AI.</p>
                    </div>
                  ) : (
                    messages.map(renderMessage)
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Input Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Voice Recording */}
                  <div className="flex items-center justify-center">
                    <Button
                      onClick={toggleRecording}
                      disabled={!isConnected}
                      variant={isRecording ? "destructive" : "default"}
                      size="lg"
                      className="w-32 h-32 rounded-full text-2xl"
                    >
                      {isRecording ? '⏹️' : '🎤'}
                    </Button>
                  </div>
                  
                  <div className="text-center text-sm text-gray-600">
                    {!isConnected ? 'Connect to start recording' : 
                     isRecording ? 'Click to stop recording' : 
                     'Click to start voice recording'}
                  </div>

                  <Separator />

                  {/* Text Input */}
                  <form onSubmit={sendTextMessage} className="space-y-4">
                    <Textarea
                      value={textInput}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextInput(e.target.value)}
                      placeholder="Type your message here..."
                      disabled={!isConnected}
                      rows={3}
                    />
                    <Button
                      type="submit"
                      disabled={!isConnected || !textInput.trim() || isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Sending...' : '📤 Send Text Message'}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
