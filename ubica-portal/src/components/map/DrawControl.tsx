import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export interface DrawControlHandle {
  /** Cierra la zona con los puntos marcados (hacen falta al menos 3). */
  finish: () => void;
  /** Quita el último punto. */
  undo: () => void;
  /** Borra los puntos marcados y empieza de nuevo. */
  reset: () => void;
}

interface DrawControlProps {
  onCreated?: (e: { type: string; coordinates: { lat: number; lng: number }[] }) => void;
  /** Avisa de cuántos puntos lleva la zona, para activar "Cerrar zona" y "Deshacer". */
  onPointsChange?: (count: number) => void;
  isEnabled?: boolean;
}

// Tocar a menos de esta distancia del primer punto cierra la zona (holgado para dedos)
const CLOSE_RADIUS_PX = 32;

/**
 * Dibujo de una zona a mano alzada por puntos: cada clic (o toque) añade un vértice.
 * Se cierra pulsando cerca del primer punto, con clic derecho o con finish() desde la barra.
 */
export const DrawControl = forwardRef<DrawControlHandle, DrawControlProps>(({ onCreated, onPointsChange, isEnabled = false }, ref) => {
  const map = useMap();
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const lineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  // Dibuja la línea discontinua y un punto por vértice a partir del estado
  useEffect(() => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = points.map((p, i) => L.circleMarker(p, {
      color: '#357186',
      fillColor: i === 0 && points.length >= 3 ? '#357186' : '#ffffff',
      fillOpacity: 1,
      weight: 2,
      radius: i === 0 ? 8 : 6,
      interactive: false,
    }).addTo(map));

    if (points.length > 1) {
      if (!lineRef.current) {
        lineRef.current = L.polyline(points, { color: '#357186', weight: 3, dashArray: '6, 8', interactive: false }).addTo(map);
      } else {
        lineRef.current.setLatLngs(points);
      }
    } else if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }
    onPointsChange?.(points.length);
  }, [points, map, onPointsChange]);

  const finalize = useCallback((finalPoints: L.LatLng[]) => {
    if (finalPoints.length < 3) return;
    setPoints([]);
    onCreated?.({ type: 'polygon', coordinates: finalPoints.map(p => ({ lat: p.lat, lng: p.lng })) });
  }, [onCreated]);

  useImperativeHandle(ref, () => ({
    finish: () => finalize(points),
    undo: () => setPoints(prev => prev.slice(0, -1)),
    reset: () => setPoints([]),
  }), [finalize, points]);

  // Al salir del modo dibujo se descartan los puntos sin cerrar
  useEffect(() => {
    map.getContainer().style.cursor = isEnabled ? 'crosshair' : '';
    if (!isEnabled) setPoints([]);
  }, [isEnabled, map]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      setPoints(prev => {
        // Pulsar cerca del primer punto cierra la zona
        if (prev.length >= 3) {
          const first = map.latLngToContainerPoint(prev[0]);
          if (first.distanceTo(map.latLngToContainerPoint(e.latlng)) < CLOSE_RADIUS_PX) {
            setTimeout(() => finalize(prev), 0);
            return prev;
          }
        }
        return [...prev, e.latlng];
      });
    };
    const handleContextMenu = () => finalize(points);

    map.on('click', handleClick);
    map.on('contextmenu', handleContextMenu);
    return () => {
      map.off('click', handleClick);
      map.off('contextmenu', handleContextMenu);
    };
  }, [isEnabled, map, points, finalize]);

  useEffect(() => () => {
    markersRef.current.forEach(m => map.removeLayer(m));
    if (lineRef.current) map.removeLayer(lineRef.current);
    map.getContainer().style.cursor = '';
  }, [map]);

  return null;
});

DrawControl.displayName = 'DrawControl';
