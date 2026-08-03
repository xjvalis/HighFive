import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { getCategoryStyle } from "@/lib/categories";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useContext } from "react";
import { LanguageContext } from "@/lib/language";

// Fix default marker icons for leaflet with vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createCategoryIcon(category) {
  const cat = getCategoryStyle(category);
  return L.divIcon({
    className: "",
    html: `<div style="
      background: white;
      border: 2px solid #7c3aed;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">
      <span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${cat.emoji}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function EventMap({ events, userLocation, radius }) {
  const { lang } = useContext(LanguageContext);
  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [50.0755, 14.4378]; // Prague fallback

  const eventsWithCoords = events.filter(e => e.latitude && e.longitude);

  return (
    <div className="relative isolate w-full h-[500px] rounded-2xl overflow-hidden border border-border shadow-sm">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={center} />

        {/* Radius circle */}
        {userLocation && radius && (
          <Circle
            center={center}
            radius={radius * 1000}
            pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.05, weight: 2 }}
          />
        )}

        {/* Event markers */}
        {eventsWithCoords.map(event => {
          const participantCount = event.participants?.length || 0;
          const isFull = event.max_capacity && participantCount >= event.max_capacity;
          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={createCategoryIcon(event.category)}
            >
              <Popup minWidth={230} maxWidth={270}>
                <div style={{ fontFamily: "'Inter', sans-serif", padding: "4px 2px 2px" }}>
                  {event.image_url && (
                    <div style={{ margin: "0 -2px 8px", borderRadius: "8px", overflow: "hidden", height: 80 }}>
                      <img src={event.image_url} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 6, lineHeight: 1.3, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {event.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                    {event.location && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
                        📍 {event.location}
                      </span>
                    )}
                    {event.date && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
                        🕐 {format(new Date(event.date), "d. M. · HH:mm")}
                      </span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
                      👥 {participantCount}{event.max_capacity ? `/${event.max_capacity}` : ""}
                      {isFull && <span style={{ color: "#9ca3af", marginLeft: 2 }}>{lang === 'cs' ? '(Plné)' : '(Full)'}</span>}
                    </span>
                  </div>
                  <Link
                    to={`/event/${event.id}`}
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      background: "#7c3aed",
                      color: "white",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {lang === 'cs' ? 'Zobrazit detaily →' : 'View details →'}
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}