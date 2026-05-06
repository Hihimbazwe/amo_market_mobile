import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const LocationMapWebView = ({ initialLocation, onLocationChange, mapRef }) => {
  const webViewRef = useRef(null);

  // Expose a flyTo method via the ref
  if (mapRef) {
    mapRef.current = {
      flyTo: (lat, lng) => {
        const js = `window.flyTo(${lat}, ${lng}); true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100%; }
        /* Layer toggles similar to web */
        .layer-toggles {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
          display: flex;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .layer-btn {
          border: none;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: bold;
          background: transparent;
          color: #666;
          cursor: pointer;
        }
        .layer-btn.active {
          background: #F97316; /* orange-500 */
          color: white;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="layer-toggles">
        <button id="btn-street" class="layer-btn active" onclick="switchLayer('street')">Street</button>
        <button id="btn-satellite" class="layer-btn" onclick="switchLayer('satellite')">Satellite</button>
      </div>

      <script>
        var map;
        var marker;
        var streetLayer;
        var satelliteLayer;
        
        function initMap() {
          var startLat = ${initialLocation?.lat || -1.9441};
          var startLng = ${initialLocation?.lng || 30.0619};

          map = L.map('map', { zoomControl: false }).setView([startLat, startLng], ${initialLocation?.lat ? 17 : 13});
          
          streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
          });
          
          satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19
          });

          streetLayer.addTo(map);

          marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);

          marker.on('dragend', function(e) {
            var pos = marker.getLatLng();
            sendLocation(pos.lat, pos.lng);
          });

          map.on('click', function(e) {
            marker.setLatLng([e.latlng.lat, e.latlng.lng]);
            sendLocation(e.latlng.lat, e.latlng.lng);
          });
        }

        function switchLayer(layer) {
          if (layer === 'satellite') {
            map.removeLayer(streetLayer);
            satelliteLayer.addTo(map);
            document.getElementById('btn-street').classList.remove('active');
            document.getElementById('btn-satellite').classList.add('active');
          } else {
            map.removeLayer(satelliteLayer);
            streetLayer.addTo(map);
            document.getElementById('btn-satellite').classList.remove('active');
            document.getElementById('btn-street').classList.add('active');
          }
        }

        function sendLocation(lat, lng) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOCATION_CHANGED', lat: lat, lng: lng }));
        }

        window.flyTo = function(lat, lng) {
          map.setView([lat, lng], 17);
          marker.setLatLng([lat, lng]);
        }

        initMap();
      </script>
    </body>
    </html>
  `;

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOCATION_CHANGED' && onLocationChange) {
        onLocationChange(data.lat, data.lng);
      }
    } catch (e) {
      console.error("Error parsing message from webview", e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  }
});

export default LocationMapWebView;
