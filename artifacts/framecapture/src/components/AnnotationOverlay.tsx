import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import {
  MousePointer2,
  Pencil,
  Highlighter,
  MoveUpRight,
  Square,
  Sun,
  Undo2,
  Trash2,
  Pause,
  Play,
} from 'lucide-react';
import './AnnotationOverlay.css';

export type AnnotationTool = 'cursor' | 'pen' | 'highlighter' | 'arrow' | 'rectangle' | 'spotlight';
export type AnnotationAction =
  | { type: 'tool'; tool: AnnotationTool }
  | { type: 'color'; color: string }
  | { type: 'undo' }
  | { type: 'clear' };

type RecordingCommand = 'pause' | 'resume' | 'stop';
type RecordingStatus = {
  state: 'idle' | 'recording' | 'paused' | 'stopping';
  elapsedSeconds: number;
};

type AnnotationOverlayBridge = {
  post: (action: AnnotationAction) => void;
  onAction: (callback: (action: AnnotationAction) => void) => () => void;
  requestRecordingState: () => void;
  sendRecordingControl: (command: RecordingCommand) => void;
  onRecordingState: (callback: (status: RecordingStatus) => void) => () => void;
};

declare global {
  interface Window {
    annotationOverlay?: AnnotationOverlayBridge;
  }
}

type Point = { x: number; y: number };
type Mark =
  | { kind: 'pen' | 'highlighter'; points: Point[]; color: string }
  | { kind: 'arrow' | 'rectangle'; from: Point; to: Point; color: string };

const COLORS = [
  { value: '#f2415a', label: 'Red' },
  { value: '#ffc928', label: 'Yellow' },
  { value: '#31b9ed', label: 'Blue' },
  { value: '#45d697', label: 'Green' },
  { value: '#f7f7f5', label: 'White' },
];

const TOOL_BUTTONS: { tool: AnnotationTool; label: string; Icon: typeof MousePointer2 }[] = [
  { tool: 'cursor', label: 'Cursor tool', Icon: MousePointer2 },
  { tool: 'pen', label: 'Pen tool', Icon: Pencil },
  { tool: 'highlighter', label: 'Marker / highlighter tool', Icon: Highlighter },
  { tool: 'arrow', label: 'Arrow tool', Icon: MoveUpRight },
  { tool: 'rectangle', label: 'Rectangle tool', Icon: Square },
  { tool: 'spotlight', label: 'Spotlight tool', Icon: Sun },
];

function formatRecordingTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function postAnnotationAction(action: AnnotationAction) {
  try {
    if (typeof window !== 'undefined') window.annotationOverlay?.post(action);
  } catch {
    // The toolbar remains usable in browser preview even without the Electron bridge.
  }
}

export function AnnotationToolbar() {
  const [tool, setTool] = useState<AnnotationTool>('cursor');
  const [color, setColor] = useState(COLORS[0].value);
  const [recording, setRecording] = useState<RecordingStatus>({
    state: 'idle',
    elapsedSeconds: 0,
  });

  useEffect(() => {
    const overlay = window.annotationOverlay;
    if (!overlay) return;
    const unsubscribe = overlay.onRecordingState(setRecording);
    overlay.requestRecordingState();
    return unsubscribe;
  }, []);

  const chooseTool = (next: AnnotationTool) => {
    setTool(next);
    postAnnotationAction({ type: 'tool', tool: next });
  };
  const chooseColor = (next: string) => {
    setColor(next);
    postAnnotationAction({ type: 'color', color: next });
  };
  const sendCommand = (action: AnnotationAction) => postAnnotationAction(action);
  const sendRecordingControl = (command: RecordingCommand) => {
    try {
      window.annotationOverlay?.sendRecordingControl(command);
    } catch {
      // Recording controls are only available in the Windows desktop overlay.
    }
  };

  return (
    <div className="annotation-toolbar" role="toolbar" aria-label="Screen annotation tools">
      <div className="annotation-tool-group" role="group" aria-label="Drawing tools">
        {TOOL_BUTTONS.map(({ tool: item, label, Icon }) => (
          <button
            key={item}
            type="button"
            className={`annotation-tool-button${tool === item ? ' is-selected' : ''}`}
            aria-label={label}
            aria-pressed={tool === item}
            title={label}
            onClick={() => chooseTool(item)}
          >
            <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        ))}
      </div>

      <span className="annotation-toolbar-divider" aria-hidden="true" />

      <div className="annotation-color-group" role="group" aria-label="Annotation color">
        {COLORS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`annotation-color-button${color === value ? ' is-selected' : ''}`}
            style={{ '--swatch-color': value } as CSSProperties}
            aria-label={`${label} annotation color`}
            aria-pressed={color === value}
            title={`${label} color`}
            onClick={() => chooseColor(value)}
          />
        ))}
      </div>

      <span className="annotation-toolbar-divider" aria-hidden="true" />

      <div className="annotation-command-group" role="group" aria-label="Annotation commands">
        <button
          type="button"
          className="annotation-tool-button"
          aria-label="Undo last annotation"
          title="Undo"
          onClick={() => sendCommand({ type: 'undo' })}
        >
          <Undo2 aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="annotation-tool-button"
          aria-label="Clear all annotations"
          title="Clear"
          onClick={() => sendCommand({ type: 'clear' })}
        >
          <Trash2 aria-hidden="true" size={17} strokeWidth={1.8} />
        </button>
      </div>

      <span className="annotation-toolbar-divider" aria-hidden="true" />

      <div className="annotation-record-status" role="status" aria-live="polite">
        <span
          className={`annotation-record-dot${recording.state === 'recording' ? ' is-recording' : recording.state === 'paused' ? ' is-paused' : ''}`}
          aria-hidden="true"
        />
        <span className="annotation-record-label">
          {recording.state === 'recording'
            ? 'REC'
            : recording.state === 'paused'
              ? 'PAUSED'
              : recording.state === 'stopping'
                ? 'SAVING'
                : 'READY'}
        </span>
        <time className="annotation-record-time">
          {formatRecordingTime(recording.elapsedSeconds)}
        </time>
      </div>

      {(recording.state === 'recording' || recording.state === 'paused') && (
        <div className="annotation-record-controls" role="group" aria-label="Recording controls">
          {recording.state === 'recording' ? (
            <button
              type="button"
              className="annotation-record-button"
              aria-label="Pause recording"
              title="Pause recording"
              onClick={() => sendRecordingControl('pause')}
            >
              <Pause aria-hidden="true" size={17} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              className="annotation-record-button"
              aria-label="Resume recording"
              title="Resume recording"
              onClick={() => sendRecordingControl('resume')}
            >
              <Play aria-hidden="true" size={17} fill="currentColor" />
            </button>
          )}
          <button
            type="button"
            className="annotation-record-button is-stop"
            aria-label="Stop recording"
            title="Stop recording"
            onClick={() => sendRecordingControl('stop')}
          >
            <Square aria-hidden="true" size={15} fill="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
}

function drawArrow(context: CanvasRenderingContext2D, from: Point, to: Point) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headLength = 14;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
  context.stroke();
}

export function AnnotationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [activeMark, setActiveMark] = useState<Mark | null>(null);
  const [tool, setTool] = useState<AnnotationTool>('cursor');
  const [color, setColor] = useState(COLORS[0].value);
  const [spotlight, setSpotlight] = useState<Point | null>(null);
  const drawingPointer = useRef<number | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const paintMark = (mark: Mark) => {
      context.save();
      context.strokeStyle = mark.color;
      context.fillStyle = mark.color;
        context.globalAlpha = mark.kind === 'highlighter' ? 0.4 : 1;
        context.lineWidth = mark.kind === 'highlighter' ? 14 : 3;
      context.lineCap = 'round';
      context.lineJoin = 'round';
        if (mark.kind === 'pen' || mark.kind === 'highlighter') {
        if (mark.points.length === 1) {
          context.beginPath();
            context.arc(
              mark.points[0].x,
              mark.points[0].y,
              mark.kind === 'highlighter' ? 7 : 1.6,
              0,
              Math.PI * 2,
            );
          context.fill();
        } else {
          context.beginPath();
          context.moveTo(mark.points[0].x, mark.points[0].y);
          mark.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
          context.stroke();
        }
        } else if (mark.kind === 'rectangle') {
        context.strokeRect(mark.from.x, mark.from.y, mark.to.x - mark.from.x, mark.to.y - mark.from.y);
        } else if (mark.kind === 'arrow') {
        drawArrow(context, mark.from, mark.to);
      }
      context.restore();
    };
    marks.forEach(paintMark);
    if (activeMark) paintMark(activeMark);

    if (tool === 'spotlight' && spotlight) {
      context.save();
      context.fillStyle = 'rgba(12, 13, 17, 0.58)';
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'destination-out';
      context.beginPath();
      context.arc(spotlight.x, spotlight.y, 76, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = 'source-over';
      context.beginPath();
      context.arc(spotlight.x, spotlight.y, 76, 0, Math.PI * 2);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    }
  }, [activeMark, color, marks, spotlight, tool]);

  useEffect(() => {
    redraw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.annotationOverlay?.onAction) return;
    try {
      return window.annotationOverlay.onAction((action) => {
        if (action.type === 'tool') {
          setTool(action.tool);
          if (action.tool !== 'spotlight') setSpotlight(null);
        } else if (action.type === 'color') {
          setColor(action.color);
        } else if (action.type === 'undo') {
          setMarks((current) => current.slice(0, -1));
        } else if (action.type === 'clear') {
          setMarks([]);
          setActiveMark(null);
          setSpotlight(null);
        }
      });
    } catch {
      return undefined;
    }
  }, []);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'cursor') return;
    const point = pointFromEvent(event);
    if (tool === 'spotlight') {
      setSpotlight(point);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingPointer.current = event.pointerId;
    if (tool === 'pen' || tool === 'highlighter') {
      setActiveMark({ kind: tool, points: [point], color });
    }
    else setActiveMark({ kind: tool, from: point, to: point, color });
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event);
    if (tool === 'spotlight') {
      setSpotlight(point);
      return;
    }
    if (drawingPointer.current !== event.pointerId) return;
    setActiveMark((current) => {
      if (!current) return current;
      if (current.kind === 'pen' || current.kind === 'highlighter') {
        return { ...current, points: [...current.points, point] };
      }
      return { ...current, to: point };
    });
  };

  const finishDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drawingPointer.current !== event.pointerId) return;
    drawingPointer.current = null;
    if (activeMark) setMarks((existing) => [...existing, activeMark]);
    setActiveMark(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`annotation-canvas${tool === 'cursor' ? ' is-passive' : ''}${tool === 'spotlight' ? ' is-spotlight' : ''}`}
      aria-label="Annotation drawing surface"
      role="img"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrawing}
      onPointerCancel={finishDrawing}
      onPointerLeave={() => {
        if (tool === 'spotlight') setSpotlight(null);
      }}
    />
  );
}
