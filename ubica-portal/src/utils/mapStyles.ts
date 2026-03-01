// Estilos personalizados para Google Maps - Resaltar región de Murcia
export const murciaMapStyles = [
  {
    "featureType": "all",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e8e8e8"
      },
      {
        "saturation": -80
      },
      {
        "lightness": 60
      }
    ]
  },
  {
    "featureType": "all",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "simplified"
      },
      {
        "color": "#999999"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "visibility": "on"
      },
      {
        "color": "#4285f4"
      },
      {
        "weight": 2
      }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      },
      {
        "saturation": -70
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      },
      {
        "saturation": -80
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5f3e5"
      },
      {
        "saturation": -50
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      },
      {
        "saturation": -100
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f8f8f8"
      },
      {
        "saturation": -80
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c9e2f7"
      },
      {
        "saturation": -20
      }
    ]
  }
];

// Estilos para tema oscuro
export const murciaMapStylesDark = [
  {
    "featureType": "all",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2d3142"
      }
    ]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9ca5b3"
      }
    ]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  },
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "visibility": "on"
      },
      {
        "color": "#4285f4"
      },
      {
        "weight": 2
      }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#263248"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#263248"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#1f2937"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#38414e"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4c5866"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0e4b99"
      }
    ]
  }
];

// Configuración del mapa para la región de Murcia
export const murciaMapConfig = {
  center: {
    lat: 37.9922,  // Murcia capital
    lng: -1.1307
  },
  zoom: 9,
  maxZoom: 16,
  minZoom: 8,
  restriction: {
    latLngBounds: {
      north: 38.7,
      south: 37.1,
      east: -0.6,
      west: -2.3
    },
    strictBounds: false
  }
};

// Coordenadas del polígono de la región de Murcia
export const murciaRegionBounds = [
  { lat: 38.7346, lng: -1.8720 },  // Noroeste
  { lat: 38.7346, lng: -0.6157 },  // Noreste
  { lat: 37.1029, lng: -0.6157 },  // Sureste
  { lat: 37.1029, lng: -2.3465 },  // Suroeste
  { lat: 38.7346, lng: -1.8720 }   // Cierre del polígono
];

// Principales ciudades de Murcia con coordenadas
export const murciaCities = [
  { name: "Murcia", lat: 37.9922, lng: -1.1307 },
  { name: "Cartagena", lat: 37.6063, lng: -0.9868 },
  { name: "Lorca", lat: 37.6742, lng: -1.7018 },
  { name: "Molina de Segura", lat: 38.0508, lng: -1.2138 },
  { name: "Alcantarilla", lat: 37.9692, lng: -1.2143 },
  { name: "Águilas", lat: 37.4090, lng: -1.5833 },
  { name: "San Pedro del Pinatar", lat: 37.8366, lng: -0.7897 },
  { name: "Torre Pacheco", lat: 37.7444, lng: -0.9529 },
  { name: "Totana", lat: 37.7692, lng: -1.5018 },
  { name: "Mazarrón", lat: 37.5986, lng: -1.3144 }
];

// Configuración de marcadores personalizados
export const customMarkerConfig = {
  villa: {
    fillColor: '#ff6b6b',
    strokeColor: '#c92a2a',
    scale: 8,
    fillOpacity: 0.8
  },
  apartment: {
    fillColor: '#4dabf7',
    strokeColor: '#1864ab',
    scale: 6,
    fillOpacity: 0.8
  },
  house: {
    fillColor: '#51cf66',
    strokeColor: '#2b8a3e',
    scale: 7,
    fillOpacity: 0.8
  },
  penthouse: {
    fillColor: '#ffd43b',
    strokeColor: '#fab005',
    scale: 8,
    fillOpacity: 0.8
  },
  studio: {
    fillColor: '#da77f2',
    strokeColor: '#9c36b5',
    scale: 5,
    fillOpacity: 0.8
  },
  default: {
    fillColor: '#495057',
    strokeColor: '#212529',
    scale: 6,
    fillOpacity: 0.8
  }
};
