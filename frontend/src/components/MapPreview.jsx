/*
 * @Author: liandongjie
 * @Date: 2026-05-03 12:11:21
 * @LastEditors: liandongjie
 * @LastEditTime: 2026-05-03 12:11:35
 * @Description: 
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapPreview({ geojson }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerRef = useRef(null);

    useEffect(() => {
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current, {
                center: [34.05, 113.05],
                zoom: 10,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(mapInstanceRef.current);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;

        if (!map || !geojson) {
            return;
        }

        if (layerRef.current) {
            map.removeLayer(layerRef.current);
        }

        layerRef.current = L.geoJSON(geojson, {
            style: {
                color: '#f97316',
                weight: 3,
                fillColor: '#fb923c',
                fillOpacity: 0.25,
            },
        }).addTo(map);

        const bounds = layerRef.current.getBounds();

        if (bounds.isValid()) {
            map.fitBounds(bounds, {
                padding: [30, 30],
            });
        }
    }, [geojson]);

    return <div className="map-container" ref={mapRef}></div>;
}

export default MapPreview;