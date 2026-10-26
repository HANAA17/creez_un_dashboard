import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { currencySymbol, type Cents } from '../domain';
import { useTheme } from './theme';

/** Police des libellés SVG : celle du système (sans cela, le navigateur retombe sur une police à empattements). */
const FONT = Platform.select({ web: 'system-ui, -apple-system, sans-serif', default: undefined });

/** « 1 250 DH » -> « 1,3 k DH » : libellés d'axe courts. */
export function compactAmount(cents: Cents): string {
  const e = Math.abs(cents) / 100;
  const sign = cents < 0 ? '−' : '';
  const unit = currencySymbol();
  if (e < 1000) return `${sign}${Math.round(e)} ${unit}`;
  return `${sign}${(e / 1000).toFixed(1).replace('.', ',').replace(',0', '')} k${unit === '€' ? '€' : ` ${unit}`}`;
}

/** Plafond d'axe « rond » (1, 2, 5, 10 × puissance de 10), en centimes. */
export function niceMax(cents: Cents): Cents {
  const e = Math.max(cents, 100) / 100;
  const pow = Math.pow(10, Math.floor(Math.log10(e)));
  const n = e / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return Math.round(step * pow * 100);
}

/** Barre dont seul le sommet est arrondi (rayon 4) : la base reste collée à la ligne de zéro. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function useWidth(): [number, (e: { nativeEvent: { layout: { width: number } } }) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

export interface DonutSegment { id: string | null; color: string; value: number }

/** Anneau fin : part de chaque catégorie, avec un espace de 2 px entre les segments. */
export function DonutChart({ segments, size = 176, thickness = 20, selected, onSelect, children }: {
  segments: DonutSegment[]; size?: number; thickness?: number; /** undefined = aucune sélection ; null = le groupe « Autres ». */ selected?: string | null | undefined;
  onSelect?: (id: string | null) => void; children?: React.ReactNode;
}) {
  const t = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const GAP = segments.length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.track} strokeWidth={thickness} fill="none" />
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {total > 0 && segments.map((seg) => {
            const len = Math.max(0, (seg.value / total) * C - GAP);
            const el = (
              <Circle key={String(seg.id)} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color}
                strokeWidth={selected === seg.id ? thickness + 6 : thickness}
                strokeOpacity={selected === undefined || selected === seg.id ? 1 : 0.35}
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}
                onPress={() => onSelect?.(seg.id)} />
            );
            offset += (seg.value / total) * C;
            return el;
          })}
        </G>
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center', width: size - thickness * 2 - 16 }}>
        {children}
      </View>
    </View>
  );
}

export interface ColumnDatum { label: string; a: Cents; b: Cents }

/** Colonnes groupées (deux séries) par mois ; toucher une colonne la sélectionne. */
export function ColumnsChart({ data, colorA, colorB, selected, onSelect, height = 190 }: {
  data: ColumnDatum[]; colorA: string; colorB: string; selected: number; onSelect: (i: number) => void; height?: number;
}) {
  const t = useTheme();
  const [width, onLayout] = useWidth();
  const top = 12, bottom = 24, left = 44, right = 4;
  const plotW = Math.max(0, width - left - right);
  const plotH = height - top - bottom;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => [d.a, d.b])));
  const y = (v: Cents) => top + plotH - (v / max) * plotH;
  const groupW = data.length > 0 ? plotW / data.length : 0;
  const barW = Math.max(6, Math.min(20, groupW * 0.3));
  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {[0, 0.5, 1].map((f) => (
            <G key={f}>
              <Line x1={left} x2={width - right} y1={y(max * f)} y2={y(max * f)} stroke={t.grid} strokeWidth={1} />
              <SvgText fontFamily={FONT} x={left - 6} y={y(max * f) + 4} fontSize={11} fill={t.sub} textAnchor="end">{compactAmount(max * f)}</SvgText>
            </G>
          ))}
          {data.map((d, i) => {
            const cx = left + groupW * (i + 0.5);
            const ha = (d.a / max) * plotH;
            const hb = (d.b / max) * plotH;
            return (
              <G key={d.label + i}>
                {i === selected && <Rect x={cx - groupW / 2 + 2} y={top} width={groupW - 4} height={plotH} rx={8} fill={t.track} opacity={0.6} />}
                {ha > 0 && <Path d={barPath(cx - barW - 1, y(d.a), barW, ha)} fill={colorA} />}
                {hb > 0 && <Path d={barPath(cx + 1, y(d.b), barW, hb)} fill={colorB} />}
                <SvgText fontFamily={FONT} x={cx} y={height - 6} fontSize={11} fill={i === selected ? t.text : t.sub} fontWeight={i === selected ? '600' : '400'} textAnchor="middle">{d.label}</SvgText>
                <Rect x={cx - groupW / 2} y={0} width={groupW} height={height} fill="transparent" onPress={() => onSelect(i)} />
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

export interface LineDatum { label: string; value: Cents }

/** Courbe d'une série (le solde) : ligne de 2 px, zone légère, repère final cerclé. */
export function LineChart({ data, color, selected, onSelect, height = 170 }: {
  data: LineDatum[]; color: string; selected: number; onSelect: (i: number) => void; height?: number;
}) {
  const t = useTheme();
  const [width, onLayout] = useWidth();
  const top = 14, bottom = 24, left = 44, right = 14;
  const plotW = Math.max(0, width - left - right);
  const plotH = height - top - bottom;
  const values = data.map((d) => d.value);
  const rawMax = Math.max(0, ...values);
  const rawMin = Math.min(0, ...values);
  const max = rawMax === 0 && rawMin === 0 ? 100 : niceMax(rawMax) * (rawMax > 0 ? 1 : 0);
  const min = rawMin < 0 ? -niceMax(-rawMin) : 0;
  const span = max - min || 1;
  const y = (v: Cents) => top + plotH - ((v - min) / span) * plotH;
  const x = (i: number) => left + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2);
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ');
  const area = data.length > 1 ? `${line} L${x(data.length - 1)},${y(Math.max(0, min))} L${x(0)},${y(Math.max(0, min))} Z` : '';
  const ticks = min < 0 ? (max > 0 ? [min, 0, max] : [min, 0]) : [0, max / 2, max];
  const sel = Math.min(selected, data.length - 1);
  const cell = data.length > 1 ? plotW / (data.length - 1) : plotW;
  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && data.length > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((v, k) => (
            <G key={k}>
              <Line x1={left} x2={width - right} y1={y(v)} y2={y(v)} stroke={t.grid} strokeWidth={1} />
              <SvgText fontFamily={FONT} x={left - 6} y={y(v) + 4} fontSize={11} fill={t.sub} textAnchor="end">{compactAmount(v)}</SvgText>
            </G>
          ))}
          {area !== '' && <Path d={area} fill={color} opacity={0.12} />}
          <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {sel >= 0 && <Line x1={x(sel)} x2={x(sel)} y1={top} y2={top + plotH} stroke={t.sub} strokeWidth={1} opacity={0.5} />}
          {data.map((d, i) => (
            <G key={d.label + i}>
              {(i === sel || i === data.length - 1) && (
                <>
                  <Circle cx={x(i)} cy={y(d.value)} r={7} fill={t.card} />
                  <Circle cx={x(i)} cy={y(d.value)} r={5} fill={color} />
                </>
              )}
              <SvgText fontFamily={FONT} x={x(i)} y={height - 6} fontSize={11} fill={i === sel ? t.text : t.sub} fontWeight={i === sel ? '600' : '400'} textAnchor="middle">{d.label}</SvgText>
              <Rect x={x(i) - cell / 2} y={0} width={Math.max(cell, 24)} height={height} fill="transparent" onPress={() => onSelect(i)} />
            </G>
          ))}
        </Svg>
      )}
    </View>
  );
}
