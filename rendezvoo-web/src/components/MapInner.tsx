'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';

export type Pin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind?: 'home' | 'place' | 'chosen';
  number?: number;     // shows a number inside the pin (search results)
  selected?: boolean;
  color?: string;
};

const COLORS = { home: '#5D6D7E', place: '#E2603B', chosen: '#3BA776' };

function pinIcon(p: Pin) {
  const color = p.color ?? COLORS[p.kind ?? 'place'];
  const size = p.selected || p.kind === 'chosen' ? 34 : 26;
  const inner = p.number != null ? p.number : p.kind === 'home' ? '⌂' : p.kind === 'chosen' ? '★' : '';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;
      color:#fff;font:700 ${size > 30 ? 14 : 12}px system-ui">${inner}</div>`,
  });
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Zoom/pan so every pin is visible whenever the set of pins changes. */
function FitToPins({ pins, focus }: { pins: Pin[]; focus?: string | null }) {
  const map = useMap();
  const signature = pins.map((p) => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
  useEffect(() => {
    if (!pins.length) return;
    if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 14);
    else map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  useEffect(() => {
    const p = pins.find((x) => x.id === focus);
    if (p) map.panTo([p.lat, p.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  return null;
}

// Leaflet + OpenStreetMap tiles: free, no API key. Loaded only in the browser (see HomesMap.tsx).
export default function MapInner({ pins, onPick, onPinClick, focus, height = 320 }: {
  pins: Pin[];
  onPick?: (lat: number, lng: number) => void;
  onPinClick?: (id: string) => void;
  focus?: string | null;
  height?: number;
}) {
  return (
    <MapContainer center={[39.5, -98.35]} zoom={3} scrollWheelZoom={false} style={{ height, width: '100%', borderRadius: 16 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPins pins={pins} focus={focus} />
      {onPick && <ClickToPick onPick={onPick} />}
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p)}
          zIndexOffset={p.selected || p.kind === 'chosen' ? 1000 : p.kind === 'home' ? -100 : 0}
          eventHandlers={onPinClick ? { click: () => onPinClick(p.id) } : undefined}
        >
          <Tooltip direction="top" offset={[0, -14]} permanent={p.kind === 'home' || p.kind === 'chosen' || p.selected}>
            {p.label}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
