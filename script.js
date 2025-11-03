// Coordenadas reais dos blocos da FAG
const blocos = {
  Bloco1: [-53.508413, -24.946182],
  Bloco2: [-53.508768, -24.945238],
  Bloco3: [-53.508913, -24.944353],
  Engenharias: [-53.509126, -24.943776],
  E: [-53.509126, -24.943776], // alias do Bloco E
  Bloco4: [-53.508016, -24.945691]
};

// Descriptions para melhor UX
const blocosDesc = {
  Bloco1: '',
  Bloco2: '',
  Bloco3: '',
  Engenharias: 'Engenharias',
  E: 'Engenharias',
  Bloco4: ''
};

// Variáveis globais
let map;
let userMarker;
let destinationMarker;
let isNavigating = false;
let watchId = null;

// Lê destino da URL
const params = new URLSearchParams(window.location.search);
const destinoParam = params.get('destino') || '';
// chave usada para buscar coord/descrição
const destinoKey = destinoParam === 'E' ? 'E' : destinoParam;
// nome exibido na UI
const displayName = destinoKey === 'E' ? 'Bloco E' : destinoKey;
const destinoCoords = blocos[destinoKey];

// Atualiza nome do destino na UI
if (destinoKey && document.getElementById('destination-name')) {
  document.getElementById('destination-name').textContent = displayName;
  if (document.getElementById('next-turn')) {
    document.getElementById('next-turn').textContent = blocosDesc[destinoKey] || '';
  }
}

// Inicializa mapa
map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.stadiamaps.com/styles/osm_bright.json',
  center: destinoCoords || [-53.508413, -24.946182],
  zoom: 17
});

// Adiciona marcador do destino
map.on('load', () => {
  if (destinoCoords) {
    destinationMarker = new maplibregl.Marker({ 
      color: '#FF3B30',
      scale: 1.2
    })
      .setLngLat(destinoCoords)
      .setPopup(new maplibregl.Popup().setText(displayName))
      .addTo(map);
  }
  
  // Adiciona controles de navegação
  map.addControl(new maplibregl.NavigationControl(), 'top-right');
});

// Função para pegar localização do usuário e calcular rota
async function getRoute() {
  if (!destinoCoords) {
    alert("Destino inválido!");
    return;
  }

  if (isNavigating) {
    // Para navegação
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    isNavigating = false;
    document.getElementById('start-btn').innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <span>Iniciar Navegação</span>
    `;
    document.getElementById('next-turn').textContent = blocosDesc[destinoNome] || '';
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const start = [pos.coords.longitude, pos.coords.latitude];
    const end = destinoCoords;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.join(',')};${end.join(',')}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      const route = data.routes[0];

      // Atualiza UI
      const distanceKm = (route.distance / 1000).toFixed(2);
      const durationMin = Math.round(route.duration / 60);
      
      document.getElementById('distance').textContent = distanceKm + ' km';
      document.getElementById('info-distance').textContent = distanceKm + ' km';
      document.getElementById('info-duration').textContent = durationMin + ' min';
      
      // Adiciona rota ao mapa
      if (map.getSource('route')) {
        map.getSource('route').setData({
          'type': 'Feature',
          'geometry': route.geometry
        });
      } else {
        map.addSource('route', {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'geometry': route.geometry
          }
        });

        map.addLayer({
          'id': 'route',
          'type': 'line',
          'source': 'route',
          'paint': {
            'line-color': '#0066CC',
            'line-width': 6
          }
        });
      }

      // Cria marcador do usuário
      if (!userMarker) {
        userMarker = new maplibregl.Marker({ 
          color: '#34C759',
          scale: 0.9
        }).setLngLat(start).addTo(map);
      } else {
        userMarker.setLngLat(start);
      }

      // Ajusta mapa para mostrar ambos pontos
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(start);
      bounds.extend(end);
      map.fitBounds(bounds, { padding: 100 });

      // Ativa navegação
      isNavigating = true;
      document.getElementById('start-btn').innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        <span>Parar Navegação</span>
      `;
      
      document.getElementById('next-turn').textContent = 'Siga a rota indicada';

      // Atualiza posição do usuário em tempo real
      watchId = navigator.geolocation.watchPosition((pos) => {
        const newPos = [pos.coords.longitude, pos.coords.latitude];
        userMarker.setLngLat(newPos);
        
        // Opcional: recalcula rota durante navegação
        // map.setCenter(newPos);
      }, (err) => {
        console.error('Erro ao atualizar localização:', err);
      }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });

    } catch (error) {
      console.error('Erro ao calcular rota:', error);
      alert("Erro ao calcular a rota. Tente novamente.");
    }
  }, (err) => {
    console.error('Erro ao obter localização:', err);
    alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
  }, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });
}

// Event listener do botão
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', getRoute);
  }
});