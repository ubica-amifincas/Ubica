import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface DrawControlProps {
  onCreated?: (e: { type: string; coordinates: { lat: number; lng: number }[] }) => void;
  isEnabled?: boolean;
}

export const DrawControl = ({ onCreated, isEnabled = false }: DrawControlProps) => {
  const map = useMap();
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const activePolylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  // Limpia visualmente los puntos
  const clearMarkers = () => {
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];
  };

  // Clean up any existing drawings when drawing is toggled off
  useEffect(() => {
    if (!isEnabled) {
      setPoints([]);
      if (activePolylineRef.current) {
        map.removeLayer(activePolylineRef.current);
        activePolylineRef.current = null;
      }
      clearMarkers();
      map.getContainer().style.cursor = '';
    } else {
      map.getContainer().style.cursor = 'crosshair';
      clearMarkers();
    }
  }, [isEnabled, map]);

  // Handle click to add points
  useEffect(() => {
    if (!isEnabled) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      // Prevent clicking on existing markers from interfering
      L.DomEvent.stopPropagation(e as any);

      setPoints(prev => {
        const newPoints = [...prev, e.latlng];

        // Render a connecting line while drawing
        if (!activePolylineRef.current) {
          activePolylineRef.current = L.polyline(newPoints, {
            color: '#10b981',
            weight: 3,
            dashArray: '5, 10'
          }).addTo(map);
        } else {
          activePolylineRef.current.setLatLngs(newPoints);
        }

        // Draw a visual marker for this point
        const marker = L.circleMarker(e.latlng, {
          color: '#059669', // Emerald 600
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 2,
          radius: 6,
          interactive: false // So it doesn't block map clicks
        }).addTo(map);
        markersRef.current.push(marker);

        return newPoints;
      });
    };

    map.on('click', handleClick);

    // Also close the polygon on right-click context menu
    const handleContext = (e: L.LeafletMouseEvent) => {
      if (points.length >= 3) {
        finalizeDrawing(points);
      }
    };
    map.on('contextmenu', handleContext);

    return () => {
      map.off('click', handleClick);
      map.off('contextmenu', handleContext);
    };
  }, [isEnabled, map, points]);

  // Close polygon automatically if user clicks near the first point
  useEffect(() => {
    if (!isEnabled || points.length < 3) return;

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];

    // Calculate pixel distance to check if clicked the start node
    const firstPointPixel = map.latLngToLayerPoint(firstPoint);
    const lastPointPixel = map.latLngToLayerPoint(lastPoint);

    // Auto close within 25px radius
    if (firstPointPixel.distanceTo(lastPointPixel) < 25) {
      // Pop the last duplicate point
      const finalPoints = points.slice(0, -1);

      const lastMarker = markersRef.current.pop();
      if (lastMarker) map.removeLayer(lastMarker);

      finalizeDrawing(finalPoints);
    }
  }, [points, isEnabled, map]);


  const finalizeDrawing = (finalPoints: L.LatLng[]) => {
    if (activePolylineRef.current) {
      map.removeLayer(activePolylineRef.current);
      activePolylineRef.current = null;
    }

    clearMarkers();
    setPoints([]);

    // Fire event upwards. The actual polygon is drawn by React outside of this.
    if (onCreated) {
      const coordinates = finalPoints.map(p => ({ lat: p.lat, lng: p.lng }));
      onCreated({ type: 'polygon', coordinates });
    }

    // Auto-disable cursor crosshair
    map.getContainer().style.cursor = '';
  };

  // Cleanup completely on unmount
  useEffect(() => {
    return () => {
      if (activePolylineRef.current) map.removeLayer(activePolylineRef.current);
      clearMarkers();
      map.getContainer().style.cursor = '';
    };
  }, [map]);

  return null;
};
