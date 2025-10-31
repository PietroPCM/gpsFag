
const blocos = {
  bloco1: { lat: -24.9531, lng: -53.4567 },
  bloco2: { lat: -24.9535, lng: -53.4570 },
  bloco3: { lat: -24.9539, lng: -53.4573 },
  blocoE: { lat: -24.9543, lng: -53.4576 }
};

const params = new URLSearchParams(window.location.search);
const destino = params.get("destino");
const destinoCoords = blocos[destino];

if (!destinoCoords) {
  document.getElementById("status").textContent = "Destino inválido.";
} else {
  const map = L.map('map').setView([destinoCoords.lat, destinoCoords.lng], 18);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  const destinoMarker = L.marker([destinoCoords.lat, destinoCoords.lng]).addTo(map)
    .bindPopup(`Destino: ${destino}`).openPopup();

  let userMarker = null;
  let routeLine = null;

  const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImMwMzhiNzQxZGM3NjQzMjQ4ZDJjY2RhMzUzMWY5ZjRkIiwiaCI6Im11cm11cjY0In0=";

  function atualizarRota(lat, lng) {
    document.getElementById("loader").style.display = "block";
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${lng},${lat}&end=${destinoCoords.lng},${destinoCoords.lat}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
        if (routeLine) map.removeLayer(routeLine);
        routeLine = L.polyline(coords, { color: 'blue' }).addTo(map);
        map.fitBounds(routeLine.getBounds());

        const distancia = (data.features[0].properties.summary.distance / 1000).toFixed(2);
        const tempo = Math.round(data.features[0].properties.summary.duration / 60);
        document.getElementById("status").textContent = `Distância: ${distancia} km | Tempo: ${tempo} min`;

        const steps = data.features[0].properties.segments[0].steps;
        document.getElementById("instrucoes").innerHTML = steps.map(s => `→ ${s.instruction}`).join('<br>');

        document.getElementById("loader").style.display = "none";
      });
  }

  navigator.geolocation.watchPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    if (!userMarker) {
      userMarker = L.marker([lat, lng], { icon: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        iconSize: [30, 30]
      }) }).addTo(map);
    } else {
      userMarker.setLatLng([lat, lng]);
    }

    atualizarRota(lat, lng);
  }, () => {
    document.getElementById("status").textContent = "Erro ao obter localização.";
  });
}
