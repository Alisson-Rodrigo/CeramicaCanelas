'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Image from 'next/image';
import {
  AudioLines, Bot, Check, ChevronDown, CircleAlert, FileAudio, ImagePlus,
  Maximize2, Mic, Paperclip, Plus, Send, ShieldAlert, Sparkles,
  Square, Trash2, UserRound, Volume2, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import styles from './assistant.module.css';

type Message = { role: 'user' | 'assistant'; content: string; at: number; mediaCount?: number };
type ChatReply = { answer: string; topics: string[] };
type Attachment = { id: string; file: File; previewUrl: string; duration?: number };
type RecorderSession = { stream: MediaStream; context: AudioContext; source: MediaStreamAudioSourceNode; processor: ScriptProcessorNode; silent: GainNode; chunks: Float32Array[] };
type PrivacyPrompt = 'text' | 'media' | null;
type PendingMedia = { kind: 'files'; files: File[] } | { kind: 'record' } | null;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

const suggestions = [
  { icon: Sparkles, label: 'Contabilidade', prompt: 'Explique de forma simples a diferença entre custo fixo, custo variável e despesa na indústria cerâmica.' },
  { icon: ShieldAlert, label: 'Área fiscal', prompt: 'Quais dados devo reunir para pedir ao contador uma revisão segura do enquadramento fiscal da empresa?' },
  { icon: UserRound, label: 'RH e sindicatos', prompt: 'Quais informações preciso levantar para consultar corretamente a convenção coletiva aplicável à empresa?' },
  { icon: AudioLines, label: 'Cerâmica vermelha', prompt: 'Quais etapas do processo de fabricação de tijolos cerâmicos devo observar para identificar problemas na secagem?' },
];

function timeLabel(at: number) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(at));
}

function getWavDuration(buffer: ArrayBuffer): number | null {
  if (buffer.byteLength < 44) return null;
  const view = new DataView(buffer);
  const readTag = (offset: number) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  if (readTag(0) !== 'RIFF' || readTag(8) !== 'WAVE') return null;
  let offset = 12; let byteRate = 0; let dataLength = 0; let format = 0; let bits = 0;
  while (offset + 8 <= buffer.byteLength) {
    const tag = readTag(offset); const length = view.getUint32(offset + 4, true); const body = offset + 8;
    if (length > buffer.byteLength - body) return null;
    if (tag === 'fmt ' && length >= 16) { format = view.getUint16(body, true); byteRate = view.getUint32(body + 8, true); bits = view.getUint16(body + 14, true); }
    if (tag === 'data') dataLength = length;
    offset = body + length + (length % 2);
  }
  if (format !== 1 || bits !== 16 || !byteRate || !dataLength) return null;
  return dataLength / byteRate;
}

function encodeWav(chunks: Float32Array[], sampleRate: number) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const source = new Float32Array(length); let cursor = 0;
  chunks.forEach(chunk => { source.set(chunk, cursor); cursor += chunk.length; });
  const targetRate = 16000;
  const outLength = Math.floor(source.length * targetRate / sampleRate);
  const bytes = new ArrayBuffer(44 + outLength * 2); const view = new DataView(bytes);
  const tag = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  tag(0, 'RIFF'); view.setUint32(4, 36 + outLength * 2, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); tag(36, 'data'); view.setUint32(40, outLength * 2, true);
  for (let index = 0; index < outLength; index++) {
    const position = index * sampleRate / targetRate; const left = Math.floor(position); const right = Math.min(left + 1, source.length - 1); const mix = position - left;
    const sample = Math.max(-1, Math.min(1, source[left] * (1 - mix) + source[right] * mix));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new File([bytes], 'gravacao.wav', { type: 'audio/wav' });
}

function buildContext(messages: Message[], content: string): Message[] {
  const next = [...messages, { role: 'user' as const, content, at: Date.now() }];
  const context = next.slice(-9);
  if (context[0]?.role === 'assistant') context.shift();
  return context;
}

export function AssistantWorkspace() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [textConsent, setTextConsent] = useState(false);
  const [mediaConsent, setMediaConsent] = useState(false);
  const [privacyPrompt, setPrivacyPrompt] = useState<PrivacyPrompt>(null);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [pendingMedia, setPendingMedia] = useState<PendingMedia>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const privacyConfirmRef = useRef<HTMLButtonElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<Attachment[]>([]);
  const recorderRef = useRef<RecorderSession | null>(null);
  const sendingRef = useRef(false);
  const recordingStartedAt = useRef(0);
  const recordingInterval = useRef<number | null>(null);
  const stopRecordingRef = useRef<(keep: boolean) => void>(() => {});

  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);
  useEffect(() => () => {
    attachmentsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl));
    if (recordingInterval.current) window.clearInterval(recordingInterval.current);
    const recorder = recorderRef.current;
    if (recorder) { recorder.stream.getTracks().forEach(track => track.stop()); void recorder.context.close(); }
  }, []);
  useEffect(() => { if (open && !minimized) bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy, open, minimized]);
  useEffect(() => { if (recordingSeconds >= 90) stopRecordingRef.current(true); }, [recordingSeconds]);
  useEffect(() => {
    if (!privacyPrompt) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    privacyConfirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); setPrivacyPrompt(null); setPendingMedia(null); setPendingPrompt('');
      } else if (event.key === 'Tab' && event.shiftKey && document.activeElement === privacyConfirmRef.current) {
        event.preventDefault(); document.getElementById('assistant-privacy-cancel')?.focus();
      } else if (event.key === 'Tab' && !event.shiftKey && document.activeElement?.id === 'assistant-privacy-cancel') {
        event.preventDefault(); privacyConfirmRef.current?.focus();
      } else if (event.key === 'Tab' && !event.shiftKey && document.activeElement === privacyConfirmRef.current) {
        event.preventDefault(); document.getElementById('assistant-privacy-cancel')?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [privacyPrompt]);
  useEffect(() => {
    if (!open || privacyPrompt) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setMinimized(false); launcherRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, privacyPrompt]);

  function removeAttachment(id: string) {
    setAttachments(current => {
      const removed = current.find(item => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter(item => item.id !== id);
    });
  }

  function clearAttachments() {
    attachmentsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl));
    attachmentsRef.current = [];
    setAttachments([]);
  }

  async function addFiles(files: File[]) {
    if (files.length + attachments.length > MAX_FILES) { setError('O limite é de 4 arquivos por pergunta.'); return; }
    const imageCount = attachments.filter(item => item.file.type.startsWith('image/')).length + files.filter(file => imageTypes.has(file.type)).length;
    const audioCount = attachments.filter(item => item.file.type === 'audio/wav').length + files.filter(file => file.type === 'audio/wav').length;
    if (imageCount > 3) { setError('Envie no máximo 3 imagens por pergunta.'); return; }
    if (audioCount > 1) { setError('Envie apenas um áudio por pergunta.'); return; }
    const total = files.reduce((sum, file) => sum + file.size, attachments.reduce((sum, item) => sum + item.file.size, 0));
    if (total > 10 * 1024 * 1024) { setError('Os anexos juntos devem ter até 10 MB.'); return; }
    setError('');
    const next: Attachment[] = [];
    for (const file of files) {
      if (imageTypes.has(file.type)) {
        if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) { setError('Cada imagem deve ter até 5 MB.'); continue; }
        next.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
      } else if (file.type === 'audio/wav') {
        if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) { setError('O áudio WAV deve ter até 3 MB.'); continue; }
        const duration = getWavDuration(await file.arrayBuffer());
        if (duration === null) { setError('O áudio precisa ser um arquivo WAV PCM válido.'); continue; }
        if (duration > 90) { setError('O áudio pode ter no máximo 90 segundos.'); continue; }
        next.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), duration });
      } else setError('Formato não aceito. Use PNG, JPEG, WebP ou áudio WAV.');
    }
    setAttachments(current => [...current, ...next]);
  }

  function onImagesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files ?? [])]; event.currentTarget.value = '';
    if (!files.length) return;
    if (!mediaConsent) { setPendingMedia({ kind: 'files', files }); setPrivacyPrompt('media'); return; }
    void addFiles(files);
  }

  function onAudioSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files ?? [])]; event.currentTarget.value = '';
    if (!files.length) return;
    if (!mediaConsent) { setPendingMedia({ kind: 'files', files }); setPrivacyPrompt('media'); return; }
    void addFiles(files);
  }

  async function beginRecording() {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextType = window.AudioContext;
      if (!AudioContextType) { stream.getTracks().forEach(track => track.stop()); setError('Este navegador não oferece gravação de áudio.'); return; }
      const context = new AudioContextType({ sampleRate: 16000 });
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silent = context.createGain(); silent.gain.value = 0;
      const session: RecorderSession = { stream, context, source, processor, silent, chunks: [] };
      processor.onaudioprocess = event => session.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(processor); processor.connect(silent); silent.connect(context.destination);
      recorderRef.current = session;
      recordingStartedAt.current = Date.now(); setRecordingSeconds(0); setRecording(true); setError('');
      recordingInterval.current = window.setInterval(() => setRecordingSeconds(Math.floor((Date.now() - recordingStartedAt.current) / 1000)), 300);
    } catch {
      stream?.getTracks().forEach(track => track.stop());
      setError('Não foi possível acessar o microfone. Verifique a permissão do navegador e tente novamente.');
    }
  }

  function stopRecording(keep: boolean) {
    const session = recorderRef.current;
    if (!session) return;
    const duration = (Date.now() - recordingStartedAt.current) / 1000;
    session.processor.onaudioprocess = null;
    session.source.disconnect(); session.processor.disconnect(); session.silent.disconnect();
    session.stream.getTracks().forEach(track => track.stop());
    const wav = encodeWav(session.chunks, session.context.sampleRate);
    recorderRef.current = null;
    void session.context.close();
    if (recordingInterval.current) window.clearInterval(recordingInterval.current);
    recordingInterval.current = null; setRecording(false); setRecordingSeconds(0);
    if (keep && duration > 0.3) void addFiles([wav]);
  }
  stopRecordingRef.current = stopRecording;

  function requestRecording() {
    if (attachments.some(item => item.file.type.startsWith('audio/'))) { setError('Remova o áudio atual antes de gravar outro.'); return; }
    if (!mediaConsent) { setPendingMedia({ kind: 'record' }); setPrivacyPrompt('media'); return; }
    void beginRecording();
  }

  async function sendMessage(value: string, acceptedConsent = false) {
    const content = value.trim() || (attachments.length ? 'Analise os arquivos anexados e explique o que é possível observar.' : '');
    if (!content || busy || sendingRef.current) return;
    if (!textConsent && !acceptedConsent) { setPendingPrompt(value); setPrivacyPrompt('text'); return; }

    const files = attachments.map(item => item.file);
    const next = [...messages, { role: 'user' as const, content, at: Date.now(), mediaCount: files.length }];
    const context = buildContext(messages, content);
    sendingRef.current = true;
    setMessages(next); setDraft(''); setError(''); setBusy(true); setHasNew(false);
    const form = new FormData();
    form.append('messages', JSON.stringify(context.map(({ role, content: text }) => ({ role, content: text }))));
    files.filter(file => file.type.startsWith('image/')).forEach(file => form.append('images', file, file.name));
    const audio = files.find(file => file.type === 'audio/wav');
    if (audio) form.append('audio', audio, 'audio.wav');
    try {
      const response = await api.post<ChatReply>('/api/assistant/chat', form);
      setMessages(current => [...current, { role: 'assistant', content: response.data.answer, at: Date.now() }]);
      clearAttachments();
      setHasNew(true);
    } catch (requestError) {
      setMessages(current => current.filter((_, index) => index !== current.length - 1));
      setDraft(value);
      setError(getApiErrorMessage(requestError, 'Não foi possível obter uma resposta agora.'));
    } finally {
      sendingRef.current = false;
      setBusy(false);
      window.setTimeout(() => textarea.current?.focus(), 0);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void sendMessage(draft); }
  function keyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(draft); }
  }

  function confirmPrivacy() {
    if (privacyPrompt === 'text') {
      setTextConsent(true); setPrivacyPrompt(null);
      const pending = pendingPrompt; setPendingPrompt('');
      void sendMessage(pending, true);
      return;
    }
    setMediaConsent(true); setPrivacyPrompt(null);
    const media = pendingMedia; setPendingMedia(null);
    if (media?.kind === 'files') void addFiles(media.files);
    else if (media?.kind === 'record') void beginRecording();
  }

  const hasAudio = attachments.some(item => item.file.type.startsWith('audio/'));

  return <div className={styles.widget}>
    {open && !minimized && <section className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <header className={styles.header}>
        <span className={styles.avatar}><Bot size={21} aria-hidden="true" /></span>
        <div className={styles.headerText}><h2 id="assistant-title">Assistente Ceramista</h2><p><span className={styles.onlineDot} />Orientação geral · Não consulta dados do sistema</p></div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.headerButton} onClick={() => { setMessages([]); setError(''); clearAttachments(); }} disabled={!messages.length && !attachments.length || busy} aria-label="Iniciar nova conversa" title="Nova conversa"><Plus size={17} /></button>
          <button type="button" className={styles.headerButton} onClick={() => { setMinimized(true); window.setTimeout(() => launcherRef.current?.focus(), 0); }} aria-label="Minimizar conversa" title="Minimizar"><ChevronDown size={18} /></button>
          <button type="button" className={styles.headerButton} onClick={() => { setOpen(false); setMinimized(false); window.setTimeout(() => launcherRef.current?.focus(), 0); }} aria-label="Fechar assistente" title="Fechar"><X size={17} /></button>
        </div>
      </header>

      <div className={styles.privacyNotice}><ShieldAlert size={16} aria-hidden="true" /><p>Na faixa gratuita, o conteúdo pode ser usado para melhorar produtos e passar por análise humana. Não envie CPF, dados bancários, folha nominal, documentos pessoais, dados de clientes ou informações fiscais confidenciais.</p></div>

      <div className={styles.conversation} aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && <div className={styles.welcome}>
          <span className={styles.welcomeIcon}><Sparkles size={23} aria-hidden="true" /></span><h3>Como posso ajudar?</h3><p>Converse sobre cerâmica vermelha, RH, contabilidade e área fiscal. Não envie dados sigilosos.</p>
          <div className={styles.suggestions}>{suggestions.map(({ icon: Icon, label, prompt }) => <button type="button" key={label} disabled={busy} onClick={() => void sendMessage(prompt)}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>)}</div>
        </div>}
        {messages.map((message, index) => <article key={`${message.at}-${index}`} className={`${styles.message} ${message.role === 'user' ? styles.userMessage : ''}`}>
          <span className={styles.messageAvatar}>{message.role === 'assistant' ? <Bot size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}</span>
          <div className={styles.messageBody}><div className={styles.bubble}><p>{message.content}</p>{message.mediaCount ? <small><Paperclip size={12} aria-hidden="true" />{message.mediaCount} anexo(s) enviado(s)</small> : null}</div><div className={styles.messageMeta}><time dateTime={new Date(message.at).toISOString()}>{timeLabel(message.at)}</time>{message.role === 'assistant' && typeof window !== 'undefined' && 'speechSynthesis' in window && <button type="button" onClick={() => { window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(message.content); speech.lang = 'pt-BR'; window.speechSynthesis.speak(speech); }} aria-label="Ler resposta em voz alta"><Volume2 size={13} aria-hidden="true" />Ouvir</button>}</div></div>
        </article>)}
        {busy && <div className={styles.typing} role="status" aria-label="O assistente está respondendo"><span className={styles.messageAvatar}><Bot size={16} aria-hidden="true" /></span><div className={styles.typingBubble}><span /><span /><span /></div><span className={styles.processing}>Analisando com segurança…</span></div>}
        <div ref={bottom} />
      </div>

      {attachments.length > 0 && <div className={styles.attachmentTray} aria-label="Anexos selecionados">{attachments.map(item => <div className={styles.attachment} key={item.id}>
        {item.file.type.startsWith('image/') ? <Image src={item.previewUrl} alt={`Prévia de ${item.file.name}`} width={58} height={50} unoptimized /> : <span className={styles.audioAttachment}><FileAudio size={18} /><span>{item.file.name}<small>{Math.ceil(item.duration ?? 0)}s · WAV</small></span><audio controls preload="metadata" src={item.previewUrl} aria-label="Reproduzir áudio anexado" /></span>}
        <button type="button" onClick={() => removeAttachment(item.id)} aria-label={`Remover ${item.file.name}`}><Trash2 size={14} /></button>
      </div>)}</div>}

      {error && <p role="alert" className={styles.error}><CircleAlert size={15} aria-hidden="true" />{error}</p>}
      {recording && <div className={styles.recordingBar} role="status"><span className={styles.recordingPulse} />Gravando · {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')} / 01:30<button type="button" onClick={() => stopRecordingRef.current(false)}>Cancelar</button><button type="button" onClick={() => stopRecordingRef.current(true)} aria-label="Parar e anexar gravação"><Square size={14} />Parar</button></div>}

      <form onSubmit={submit} className={styles.composer}>
        <label className="sr-only" htmlFor="assistant-message">Escreva sua pergunta</label>
        <textarea ref={textarea} id="assistant-message" value={draft} onChange={event => setDraft(event.target.value.slice(0, MAX_MESSAGE_LENGTH))} onKeyDown={keyDown} maxLength={MAX_MESSAGE_LENGTH} rows={2} placeholder="Escreva sua pergunta…" disabled={busy || recording} />
        <div className={styles.composerActions}>
          <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={onImagesSelected} aria-label="Selecionar imagens" />
          <input ref={audioInput} type="file" accept="audio/wav" hidden onChange={onAudioSelected} aria-label="Selecionar áudio WAV" />
          <button type="button" disabled={busy || recording || attachments.filter(item => item.file.type.startsWith('image/')).length >= 3} className={styles.toolButton} onClick={() => imageInput.current?.click()} aria-label="Anexar imagem" title="Anexar PNG, JPEG ou WebP"><ImagePlus size={17} /></button>
          <button type="button" disabled={busy || recording || hasAudio} className={styles.toolButton} onClick={() => audioInput.current?.click()} aria-label="Anexar áudio WAV" title="Anexar áudio WAV"><Paperclip size={16} /></button>
          <button type="button" disabled={busy || hasAudio} className={`${styles.toolButton} ${recording ? styles.recordingButton : ''}`} onClick={requestRecording} aria-label={recording ? 'Gravando áudio' : 'Gravar áudio'} title="Gravar áudio WAV"><Mic size={17} /></button>
          <span className={styles.characterCount}>{draft.length}/{MAX_MESSAGE_LENGTH}</span>
          <button type="submit" disabled={busy || recording || (!draft.trim() && attachments.length === 0)} className={styles.sendButton} aria-label="Enviar pergunta"><Send size={17} /></button>
        </div>
        <p className={styles.composerHint}>Enter envia · Shift + Enter quebra linha · até 4 anexos</p>
      </form>

      {privacyPrompt && <div className={styles.consentBackdrop} role="presentation"><section className={styles.consentDialog} role="dialog" aria-modal="true" aria-labelledby="assistant-privacy-title" aria-describedby="assistant-privacy-description">
        <span className={styles.consentIcon}><ShieldAlert size={22} aria-hidden="true" /></span><h3 id="assistant-privacy-title">Antes de continuar</h3>
        <p id="assistant-privacy-description">{privacyPrompt === 'text' ? 'Sua mensagem será enviada ao Gemini Developer API na faixa gratuita. O conteúdo pode ser usado para melhorar produtos, e revisores humanos podem ler e anotar entradas e respostas.' : 'Imagens e áudios serão enviados ao Gemini Developer API na faixa gratuita. O conteúdo pode ser usado para melhorar produtos, e revisores humanos podem ler e anotar entradas e respostas.'}</p>
        <p className={styles.privacyWarning}>Não envie CPF, dados bancários, folhas nominais, documentos de funcionários ou clientes, nem informações fiscais confidenciais.</p>
        <div className={styles.consentActions}><button type="button" id="assistant-privacy-cancel" onClick={() => { setPrivacyPrompt(null); setPendingMedia(null); setPendingPrompt(''); }} className={styles.cancelConsent}>Cancelar</button><button ref={privacyConfirmRef} type="button" onClick={confirmPrivacy} className={styles.acceptConsent}><Check size={16} aria-hidden="true" />Entendi e continuar</button></div>
      </section></div>}
    </section>}

    {open && minimized && <div className={styles.minimizedPill}><span><Bot size={16} />Assistente Ceramista</span><button type="button" onClick={() => setMinimized(false)} aria-label="Restaurar conversa"><Maximize2 size={16} /></button><button type="button" onClick={() => { setOpen(false); setMinimized(false); }} aria-label="Fechar assistente"><X size={16} /></button></div>}

    <button ref={launcherRef} type="button" onClick={() => { setOpen(value => !value); setMinimized(false); setHasNew(false); }} className={styles.launcher} aria-label={open ? 'Fechar Assistente Ceramista' : 'Abrir Assistente Ceramista'} aria-expanded={open} title="Assistente Ceramista">
      {open ? <X size={23} aria-hidden="true" /> : <Bot size={24} aria-hidden="true" />}{hasNew && !open && <span className={styles.newReply} aria-label="Nova resposta disponível" />}
    </button>
  </div>;
}
