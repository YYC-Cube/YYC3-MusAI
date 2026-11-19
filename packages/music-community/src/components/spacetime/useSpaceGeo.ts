// 社区面板逻辑层 · 时空墙定位与附近消息
import { useState, useCallback } from 'react';
import { apiFetch } from '@yyc3/music-utils';
import type { STMessage } from './shared';

export function useSpaceGeo() {
  // Location state
  const [attachLocation, setAttachLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSupported] = useState(() => 'geolocation' in navigator);
  const [nearbyMessages, setNearbyMessages] = useState<STMessage[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const requestLocation = useCallback(async () => {
    if (!geoSupported) return;
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false })
      );
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}` };
      setUserLocation(loc);
      setAttachLocation(true);
    } catch (err) {
      console.error('Geolocation error:', err);
      setAttachLocation(false);
    }
    finally { setGeoLoading(false); }
  }, [geoSupported]);

  const fetchNearby = useCallback(async () => {
    if (!userLocation) {
      // Try to get location first
      if (!geoSupported) return;
      setGeoLoading(true);
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false })
        );
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}` };
        setUserLocation(loc);
        setNearbyLoading(true);
        const data = await apiFetch<{ messages: STMessage[] }>(`/spacetime/messages/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=50`);
        if (data?.messages) setNearbyMessages(data.messages);
      } catch { /* ignore */ }
      finally { setGeoLoading(false); setNearbyLoading(false); }
      return;
    }
    setNearbyLoading(true);
    try {
      const data = await apiFetch<{ messages: STMessage[] }>(`/spacetime/messages/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=50`);
      if (data?.messages) setNearbyMessages(data.messages);
    } catch (err) { console.error('Nearby fetch error:', err); }
    finally { setNearbyLoading(false); }
  }, [userLocation, geoSupported]);

  return {
    attachLocation, setAttachLocation,
    userLocation, setUserLocation,
    geoLoading, geoSupported,
    nearbyMessages, setNearbyMessages,
    nearbyLoading,
    requestLocation, fetchNearby,
  };
}
