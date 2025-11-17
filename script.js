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
const ORS_KEY_STORAGE = 'ors_api_key';
const DEFAULT_ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZmYWIwMzg3Y2FiMTQ4ODk5N2M5MTBlMmIyNDA0ZmU1IiwiaCI6Im11cm11cjY0In0='; // opcional: substitua pela sua chave fixa para testes
let orsApiKey = localStorage.getItem(ORS_KEY_STORAGE) || DEFAULT_ORS_KEY;
const STADIA_API_KEY = 'bfaf1fba-fd7c-4d0a-b891-347685c6a547'; // informe aqui sua chave do StadiaMaps para o mapa base

function ensureOrsKey() {
  if (!orsApiKey) {
    orsApiKey = prompt('Informe sua chave da OpenRouteService para rotas a pé:');
    if (orsApiKey) {
      localStorage.setItem(ORS_KEY_STORAGE, orsApiKey);
    } else {
      throw new Error('Chave da OpenRouteService é obrigatória para traçar rotas de pedestres.');
    }
  }
}

async function fetchPedestrianRoute(start, end) {
  ensureOrsKey();
  const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': orsApiKey
    },
    body: JSON.stringify({
      coordinates: [start, end],
      instructions: false
    })
  });

  if (!response.ok) {
    throw new Error('Falha na OpenRouteService: ' + response.statusText);
  }

  const data = await response.json();
  if (!data.features || data.features.length === 0) {
    throw new Error('Nenhuma rota retornada pela OpenRouteService.');
  }

  const feature = data.features[0];
  return {
    geometry: feature.geometry,
    distance: feature.properties.summary.distance,
    duration: feature.properties.summary.duration
  };
}

// Atualiza nome do destino na UI
if (destinoKey && document.getElementById('destination-name')) {
  document.getElementById('destination-name').textContent = displayName;
  if (document.getElementById('next-turn')) {
    document.getElementById('next-turn').textContent = blocosDesc[destinoKey] || '';
  }
}

// Inicializa mapa
const mapStyleUrl = STADIA_API_KEY
  ? `https://tiles.stadiamaps.com/styles/osm_bright.json?api_key=${STADIA_API_KEY}`
  : 'https://tiles.stadiamaps.com/styles/osm_bright.json';

map = new maplibregl.Map({
  container: 'map',
  style: mapStyleUrl,
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
    updateButtonState(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const start = [pos.coords.longitude, pos.coords.latitude];
    const end = destinoCoords;

    try {
      const route = await fetchPedestrianRoute(start, end);

      // Atualiza UI
      const distanceKm = (route.distance / 1000).toFixed(2);
      const durationMin = Math.round(route.duration / 60);
      
      const distanceEl = document.getElementById('distance');
      const navDurationEl = document.getElementById('nav-duration');
      const infoDistanceEl = document.getElementById('info-distance');
      const infoDurationEl = document.getElementById('info-duration');
      
      if (distanceEl) distanceEl.textContent = distanceKm + ' km';
      if (navDurationEl) navDurationEl.textContent = durationMin + ' min';
      if (infoDistanceEl) infoDistanceEl.textContent = distanceKm + ' km';
      if (infoDurationEl) infoDurationEl.textContent = durationMin + ' min';
      
      // Garante que o card de informações está visível
      const infoCard = document.getElementById('info-card');
      if (infoCard) {
        infoCard.style.display = 'block';
      }
      
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
            'line-width': 6,
            'line-opacity': 0.95
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
      updateButtonState(true);
      
      // Atualiza mensagem de navegação
      const nextTurnEl = document.getElementById('next-turn');
      if (nextTurnEl) {
        nextTurnEl.textContent = 'Siga a rota indicada';
      }

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
      alert("Erro ao calcular a rota. Verifique sua chave da OpenRouteService e tente novamente.");
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

// Função para atualizar o estado do botão
function updateButtonState(navigating) {
  const startBtn = document.getElementById('start-btn');
  if (!startBtn) return;
  
  isNavigating = navigating;
  
  if (isNavigating) {
    startBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
      <span>Parar Navegação</span>
    `;
    startBtn.classList.add('navigating');
  } else {
    startBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <span>Iniciar Navegação</span>
    `;
    startBtn.classList.remove('navigating');
  }
}

// Event listener do botão
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (isNavigating) {
        // Parar navegação
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
        updateButtonState(false);
        
        // Atualizar mensagem
        const nextTurnEl = document.getElementById('next-turn');
        if (nextTurnEl) {
          nextTurnEl.textContent = 'Navegação interrompida';
          // Restaurar mensagem após 3 segundos
          setTimeout(() => {
            if (!isNavigating && nextTurnEl) {
              nextTurnEl.textContent = blocosDesc[destinoKey] || '';
            }
          }, 3000);
        }
      } else {
        // Iniciar navegação
        getRoute();
      }
    });
    
    // Garante que o card de informações está visível
    const infoCard = document.getElementById('info-card');
    if (infoCard) {
      infoCard.style.display = 'block';
    }
  }
});