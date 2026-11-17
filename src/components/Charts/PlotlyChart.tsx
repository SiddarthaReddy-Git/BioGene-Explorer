import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

interface PlotlyClickPoint {
  pointIndex?: number;
  x?: unknown;
  y?: unknown;
  customdata?: unknown;
  text?: string;
}

interface PlotlyChartProps {
  data: Record<string, unknown>[];
  layout?: Record<string, unknown>;
  height?: number;
  onPointClick?: (point: PlotlyClickPoint) => void;
  className?: string;
}

export function PlotlyChart({
  data,
  layout = {},
  height = 320,
  onPointClick,
  className = '',
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clickHandlerRef = useRef(onPointClick);
  clickHandlerRef.current = onPointClick;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mergedLayout: Record<string, unknown> = {
      autosize: true,
      height,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(255, 255, 255, 0.36)',
      font: {
        family: '"DM Sans", system-ui, sans-serif',
        color: '#1e293b',
        size: 12,
      },
      margin: { t: 28, r: 18, b: 46, l: 52 },
      xaxis: {
        gridcolor: 'rgba(15, 23, 42, 0.08)',
        zerolinecolor: 'rgba(15, 23, 42, 0.14)',
        tickfont: { family: '"JetBrains Mono", monospace', size: 11, color: '#475569' },
      },
      yaxis: {
        gridcolor: 'rgba(15, 23, 42, 0.08)',
        zerolinecolor: 'rgba(15, 23, 42, 0.14)',
        tickfont: { family: '"JetBrains Mono", monospace', size: 11, color: '#475569' },
      },
      hoverlabel: {
        bgcolor: 'rgba(255, 255, 255, 0.96)',
        bordercolor: '#6d5dfb',
        font: { family: '"DM Sans", sans-serif', size: 12, color: '#0f172a' },
      },
      ...layout,
    };

    const config: Record<string, unknown> = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    };

    let active = true;
    Plotly.newPlot(el, data, mergedLayout, config).then((plotEl) => {
      if (!active) return;
      plotEl.on('plotly_click', (evt: unknown) => {
        const typed = evt as { points?: PlotlyClickPoint[] };
        if (typed?.points && typed.points.length > 0 && clickHandlerRef.current) {
          clickHandlerRef.current(typed.points[0]);
        }
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        try {
          Plotly.Plots.resize(containerRef.current);
        } catch {
          // ignore unmounted resize
        }
      }
    });
    resizeObserver.observe(el);

    return () => {
      active = false;
      resizeObserver.disconnect();
      if (el) {
        Plotly.purge(el);
      }
    };
  }, [data, layout, height]);

  return <div ref={containerRef} className={`w-full overflow-hidden ${className}`} />;
}
