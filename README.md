# sato

**[https://v0-sato.vercel.app/](https://v0-sato.vercel.app/)**

Platform to test functionality that will eventually go into an LLM-powered smart home speaker

Tech for EQ (this is what the speaker will use to dynamically modify the EQ based on the audio waveform input):
1. Web Audio API - Browser's native audio processing engine (will be swapped to something more robust)
2. AudioContext - Main audio processing context
3. AudioBuffer - In-memory audio data representation
4. AudioBufferSourceNode - Audio playback source
5. BiquadFilterNode - Digital audio filters for EQ bands
6. GainNode - Volume/gain control

<img width="2095" height="1162" alt="sato_eq" src="https://github.com/user-attachments/assets/63d25b64-1aed-4e50-b5a0-6cd0d316c5cf" />

Tech for chatbot (the speaker will run this in the background):
1. Web Browser's Speech-To-Text (STT) transcription (will be swapped to something more robust)
2. ChatGPT 4o for response generation
3. ElevenLabs for Text-To-Speech (TTS) responses (will take ChatGPT responses and apply TTS)

<img width="773" height="520" alt="sato_chat" src="https://github.com/user-attachments/assets/f1795cdf-00db-4496-bd9d-56f2eb65a5c2" />

Other tech:
1. Supabase for user authentication and database
