'use client';

import Map, { Marker, NavigationControl } from 'react-map-gl';

export default function RecommendationMap({
  markers,
  locale,
}: {
  markers: { id: string; lat: number; lng: number; title: string }[];
  locale: string;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Map unavailable. Set NEXT_PUBLIC_MAPBOX_TOKEN.
      </div>
    );
  }

  return (
    <Map
      reuseMaps
      mapboxAccessToken={token}
      initialViewState={{ latitude: markers[0]?.lat ?? 59.9139, longitude: markers[0]?.lng ?? 10.7522, zoom: 13 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      locale={locale}
    >
      <NavigationControl position="bottom-right" />
      {markers.map((marker) => (
        <Marker key={marker.id} latitude={marker.lat} longitude={marker.lng} anchor="bottom">
          <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground shadow">{marker.title}</span>
        </Marker>
      ))}
    </Map>
  );
}
