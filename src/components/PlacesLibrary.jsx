/**
 * PlacesLibrary - Component for viewing and managing all places in the database
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usePlaces, PLACE_TYPES } from '../data/usePlaces';
import { useDatabase } from '../data/DatabaseContext';
import './PlacesLibrary.css';

// Fix for default marker icon in Leaflet with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to update map center when coordinates change
function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export function PlacesLibrary({ onClose, onPlacesChanged }) {
  const { isOpen } = useDatabase();
  const { getAllPlaces, createPlace, updatePlace, deletePlace, places: allPlacesForParent } = usePlaces();

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingPlace, setEditingPlace] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingMapPlace, setViewingMapPlace] = useState(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    parent_id: '',
    mapped_to_id: '',
    is_historical: false,
    latitude: '',
    longitude: '',
    notes: '',
  });

  // Geocoding search state
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoResults, setGeoResults] = useState([]);
  const [showGeoResults, setShowGeoResults] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapKey, setMapKey] = useState(0); // Force map remount when needed
  const [searchSource, setSearchSource] = useState('osm'); // 'osm' or 'wikipedia'

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Search for place using OpenStreetMap Nominatim
  const searchGeocode = async () => {
    if (!formData.name.trim()) return;

    setGeoSearching(true);
    setShowGeoResults(true);
    try {
      const query = encodeURIComponent(formData.name.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=8`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Heritage Genealogy App',
          },
        }
      );
      const data = await response.json();
      setGeoResults(data || []);
      setSearchSource('osm');
    } catch (err) {
      console.error('Geocoding error:', err);
      setGeoResults([]);
    } finally {
      setGeoSearching(false);
    }
  };

  // Search Wikipedia for historical places
  const searchWikipedia = async () => {
    if (!formData.name.trim()) return;

    setGeoSearching(true);
    setShowGeoResults(true);
    try {
      const query = encodeURIComponent(formData.name.trim());
      // Search Wikipedia
      const searchResponse = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&origin=*&srlimit=8`
      );
      const searchData = await searchResponse.json();
      const searchResults = searchData.query?.search || [];

      // For each result, try to get coordinates and extract
      const resultsWithCoords = await Promise.all(
        searchResults.map(async (result) => {
          try {
            // Get page info with coordinates
            const pageResponse = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=coordinates|extracts&exintro=1&explaintext=1&exsentences=2&format=json&origin=*`
            );
            const pageData = await pageResponse.json();
            const pages = pageData.query?.pages || {};
            const page = Object.values(pages)[0];

            return {
              ...result,
              coordinates: page?.coordinates?.[0] || null,
              extract: page?.extract || '',
              pageId: page?.pageid,
            };
          } catch {
            return { ...result, coordinates: null, extract: '' };
          }
        })
      );

      setGeoResults(resultsWithCoords);
      setSearchSource('wikipedia');
    } catch (err) {
      console.error('Wikipedia search error:', err);
      setGeoResults([]);
    } finally {
      setGeoSearching(false);
    }
  };

  // Select a geocoding result (OSM)
  const selectGeoResult = (result) => {
    // Get the place name and type from the result
    const placeName = result.name || result.display_name.split(',')[0];
    const fullAddress = formatGeoResult(result);
    const placeType = getTypeFromOsm(result);

    setFormData(prev => ({
      ...prev,
      name: `${placeName}, ${fullAddress}`,
      type: placeType || prev.type,
      latitude: result.lat,
      longitude: result.lon,
    }));
    setShowGeoResults(false);
    setGeoResults([]);
    setShowMap(true);
    setMapKey(prev => prev + 1); // Force map to remount with new center
  };

  // Select a Wikipedia result
  const selectWikipediaResult = (result) => {
    const updates = {
      name: result.title,
      notes: result.extract || '',
    };

    if (result.coordinates) {
      updates.latitude = result.coordinates.lat.toString();
      updates.longitude = result.coordinates.lon.toString();
    }

    setFormData(prev => ({
      ...prev,
      ...updates,
    }));
    setShowGeoResults(false);
    setGeoResults([]);

    if (result.coordinates) {
      setShowMap(true);
      setMapKey(prev => prev + 1);
    }
  };

  // Format geocoding result for display
  const formatGeoResult = (result) => {
    const parts = [];
    if (result.address) {
      const addr = result.address;
      if (addr.city || addr.town || addr.village || addr.municipality) {
        parts.push(addr.city || addr.town || addr.village || addr.municipality);
      }
      if (addr.county) parts.push(addr.county);
      if (addr.state || addr.province) parts.push(addr.state || addr.province);
      if (addr.country) parts.push(addr.country);
    }
    return parts.length > 0 ? parts.join(', ') : result.display_name;
  };

  // Get place type from OSM type
  const getTypeFromOsm = (result) => {
    const type = result.type || result.class;
    if (type === 'country') return 'country';
    if (type === 'state' || type === 'province') return 'province';
    if (type === 'county') return 'county';
    if (type === 'city') return 'city';
    if (type === 'town') return 'town';
    if (type === 'village') return 'village';
    if (type === 'neighbourhood' || type === 'suburb') return 'neighborhood';
    if (type === 'cemetery') return 'cemetery';
    if (type === 'place_of_worship' || type === 'church') return 'church';
    if (type === 'hospital') return 'hospital';
    return '';
  };

  // Load all places
  useEffect(() => {
    if (!isOpen) {
      setPlaces([]);
      setLoading(false);
      return;
    }

    loadPlaces();
  }, [isOpen]);

  const loadPlaces = async () => {
    setLoading(true);
    try {
      const items = await getAllPlaces();
      setPlaces(items || []);
    } catch (err) {
      console.error('Error loading places:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search places
  const filteredPlaces = places.filter(item => {
    // Type filter
    if (filter !== 'all' && item.type !== filter) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        item.name,
        item.parent_name,
        item.notes,
        PLACE_TYPES[item.type],
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(query);
    }
    return true;
  });

  // Get unique types for filter dropdown
  const placeTypes = [...new Set(places.map(p => p.type))].filter(Boolean);

  // Handle create
  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    try {
      await createPlace({
        name: formData.name.trim(),
        type: formData.type || null,
        parent_id: formData.parent_id || null,
        mapped_to_id: formData.is_historical ? (formData.mapped_to_id || null) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        notes: formData.notes || null,
      });
      setIsCreating(false);
      resetForm();
      await loadPlaces();
      onPlacesChanged?.();
    } catch (err) {
      console.error('Error creating place:', err);
    }
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingPlace || !formData.name.trim()) return;

    try {
      await updatePlace(editingPlace.id, {
        name: formData.name.trim(),
        type: formData.type || null,
        parent_id: formData.parent_id || null,
        mapped_to_id: formData.is_historical ? (formData.mapped_to_id || null) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        notes: formData.notes || null,
      });
      setEditingPlace(null);
      resetForm();
      await loadPlaces();
      onPlacesChanged?.();
    } catch (err) {
      console.error('Error updating place:', err);
    }
  };

  // Handle delete
  const handleDelete = async (place) => {
    try {
      await deletePlace(place.id);
      setDeleteConfirm(null);
      await loadPlaces();
      onPlacesChanged?.();
    } catch (err) {
      console.error('Error deleting place:', err);
    }
  };

  // Start editing a place
  const startEdit = (place) => {
    setEditingPlace(place);
    setIsCreating(false);
    setFormData({
      name: place.name || '',
      type: place.type || '',
      parent_id: place.parent_id || '',
      mapped_to_id: place.mapped_to_id || '',
      is_historical: !!place.mapped_to_id, // If it maps to another place, it's historical
      latitude: place.latitude?.toString() || '',
      longitude: place.longitude?.toString() || '',
      notes: place.notes || '',
    });
    // Show map if coordinates exist
    if (place.latitude && place.longitude) {
      setShowMap(true);
      setMapKey(prev => prev + 1);
    }
  };

  // Start creating a new place
  const startCreate = () => {
    setIsCreating(true);
    setEditingPlace(null);
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      parent_id: '',
      mapped_to_id: '',
      is_historical: false,
      latitude: '',
      longitude: '',
      notes: '',
    });
    setShowMap(false);
  };

  // Cancel edit/create
  const cancelEdit = () => {
    setEditingPlace(null);
    setIsCreating(false);
    resetForm();
  };

  // Get icon for place type
  const getPlaceIcon = (type) => {
    switch (type) {
      case 'country': return '🌍';
      case 'province': return '🏛️';
      case 'county': return '🗺️';
      case 'city': return '🏙️';
      case 'town': return '🏘️';
      case 'parish': return '⛪';
      case 'township': return '🏡';
      case 'village': return '🏠';
      case 'neighborhood': return '📍';
      case 'address': return '🏢';
      case 'cemetery': return '🪦';
      case 'church': return '⛪';
      case 'hospital': return '🏥';
      default: return '📍';
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="places-library-overlay" onWheel={e => e.stopPropagation()} onClick={onClose}>
      <div className="places-library" onClick={e => e.stopPropagation()}>
        <div className="places-library-header">
          <h2>Places</h2>
          <button className="places-library-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="places-library-toolbar">
          <div className="places-library-search">
            <input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                &times;
              </button>
            )}
          </div>

          <div className="places-library-filters">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {placeTypes.map(type => (
                <option key={type} value={type}>
                  {PLACE_TYPES[type] || type}
                </option>
              ))}
            </select>
          </div>

          <div className="places-library-actions">
            <button
              className="btn-primary"
              onClick={startCreate}
            >
              + Add Place
            </button>
          </div>
        </div>

        <div className="places-library-stats">
          {loading ? (
            'Loading...'
          ) : (
            `${filteredPlaces.length} of ${places.length} places`
          )}
        </div>

        <div className="places-library-content">
          {/* Create/Edit Form */}
          {(isCreating || editingPlace) && (
            <div className="place-form">
              <h3>{isCreating ? 'Add New Place' : 'Edit Place'}</h3>
              <div className="place-form-grid">
                <div className="form-group form-group-full">
                  <label>Name *</label>
                  <div className="name-search-row">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        setShowGeoResults(false);
                      }}
                      placeholder="Place name"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-secondary btn-find-map"
                      onClick={searchGeocode}
                      disabled={!formData.name.trim() || geoSearching}
                      title="Find on OpenStreetMap"
                    >
                      {geoSearching && searchSource === 'osm' ? '...' : '🗺️ Map'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-find-map"
                      onClick={searchWikipedia}
                      disabled={!formData.name.trim() || geoSearching}
                      title="Search Wikipedia (for historical places)"
                    >
                      {geoSearching && searchSource === 'wikipedia' ? '...' : '📚 Wiki'}
                    </button>
                  </div>
                  {showGeoResults && (
                    <div className="geo-results">
                      {geoSearching ? (
                        <div className="geo-result-loading">
                          Searching {searchSource === 'wikipedia' ? 'Wikipedia' : 'OpenStreetMap'}...
                        </div>
                      ) : geoResults.length === 0 ? (
                        <div className="geo-result-empty">No results found</div>
                      ) : searchSource === 'wikipedia' ? (
                        // Wikipedia results
                        geoResults.map((result, index) => (
                          <button
                            key={result.pageid || index}
                            className="geo-result-item"
                            onClick={() => selectWikipediaResult(result)}
                            type="button"
                          >
                            <span className="geo-result-name">
                              {result.title}
                            </span>
                            <span className="geo-result-address">
                              {result.extract?.substring(0, 100)}...
                            </span>
                            {result.coordinates ? (
                              <span className="geo-result-type geo-result-has-coords">
                                📍 Has coordinates
                              </span>
                            ) : (
                              <span className="geo-result-type geo-result-no-coords">
                                No coordinates
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        // OSM results
                        geoResults.map((result, index) => (
                          <button
                            key={result.place_id || index}
                            className="geo-result-item"
                            onClick={() => selectGeoResult(result)}
                            type="button"
                          >
                            <span className="geo-result-name">
                              {result.name || result.display_name.split(',')[0]}
                            </span>
                            <span className="geo-result-address">
                              {formatGeoResult(result)}
                            </span>
                            {getTypeFromOsm(result) && (
                              <span className="geo-result-type">
                                {PLACE_TYPES[getTypeFromOsm(result)] || result.type}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                      <button
                        className="geo-results-close"
                        onClick={() => setShowGeoResults(false)}
                        type="button"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="">Select type...</option>
                    {Object.entries(PLACE_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Parent Place</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {allPlacesForParent
                      .filter(p => p.id !== editingPlace?.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>
                <div className="form-group form-group-full">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_historical}
                      onChange={(e) => setFormData({ ...formData, is_historical: e.target.checked, mapped_to_id: e.target.checked ? formData.mapped_to_id : '' })}
                    />
                    This place no longer exists (historical)
                  </label>
                </div>
                {formData.is_historical && (
                  <div className="form-group form-group-full">
                    <label>Maps to (current equivalent)</label>
                    <select
                      value={formData.mapped_to_id}
                      onChange={(e) => setFormData({ ...formData, mapped_to_id: e.target.value })}
                    >
                      <option value="">Select current place...</option>
                      {allPlacesForParent
                        .filter(p => p.id !== editingPlace?.id && !p.mapped_to_id)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <span className="form-hint">Link this historical place to its modern equivalent</span>
                  </div>
                )}
                <div className="form-group form-group-row">
                  <div>
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g., 45.5017"
                    />
                  </div>
                  <div>
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g., -73.5673"
                    />
                  </div>
                </div>
                {/* Map display */}
                {showMap && formData.latitude && formData.longitude && (
                  <div className="form-group form-group-full">
                    <div className="place-map-container">
                      <MapContainer
                        key={mapKey}
                        center={[parseFloat(formData.latitude), parseFloat(formData.longitude)]}
                        zoom={12}
                        style={{ height: '200px', width: '100%', borderRadius: '6px' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[parseFloat(formData.latitude), parseFloat(formData.longitude)]} />
                        <MapUpdater
                          center={[parseFloat(formData.latitude), parseFloat(formData.longitude)]}
                          zoom={12}
                        />
                      </MapContainer>
                      <button
                        type="button"
                        className="btn-secondary btn-hide-map"
                        onClick={() => setShowMap(false)}
                      >
                        Hide Map
                      </button>
                    </div>
                  </div>
                )}
                {!showMap && formData.latitude && formData.longitude && (
                  <div className="form-group form-group-full">
                    <button
                      type="button"
                      className="btn-secondary btn-show-map"
                      onClick={() => {
                        setShowMap(true);
                        setMapKey(prev => prev + 1);
                      }}
                    >
                      🗺️ Show Map
                    </button>
                  </div>
                )}
                <div className="form-group form-group-full">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this place..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="place-form-actions">
                <button className="btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={isCreating ? handleCreate : handleUpdate}
                  disabled={!formData.name.trim()}
                >
                  {isCreating ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="places-library-loading">Loading places...</div>
          ) : filteredPlaces.length === 0 ? (
            <div className="places-library-empty">
              {places.length === 0 ? (
                <>
                  <p>No places in library</p>
                  <p className="empty-hint">Add places to organize your family locations</p>
                </>
              ) : (
                <p>No places match your search</p>
              )}
            </div>
          ) : (
            <div className="places-library-list">
              {filteredPlaces.map(place => (
                <React.Fragment key={place.id}>
                <div className="places-library-item">
                  <div className="place-icon">
                    {getPlaceIcon(place.type)}
                  </div>
                  <div className="place-info">
                    <div className="place-name">
                      {place.name}
                      {place.mapped_to_id && (
                        <span className="place-historical-badge" title="Historical place">historical</span>
                      )}
                    </div>
                    <div className="place-meta">
                      {place.type && (
                        <span className="place-type">{PLACE_TYPES[place.type] || place.type}</span>
                      )}
                      {place.parent_name && (
                        <span className="place-parent">in {place.parent_name}</span>
                      )}
                      {place.mapped_to_id && place.mapped_to_name && (
                        <span className="place-maps-to">now: {place.mapped_to_name}</span>
                      )}
                    </div>
                    {place.notes && (
                      <div className="place-notes">{place.notes}</div>
                    )}
                  </div>
                  <div className="place-stats">
                    {place.event_count > 0 && (
                      <span className="place-usage" title={`Used in: ${place.event_types}`}>
                        {place.event_count} event{place.event_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {place.latitude && place.longitude && (
                      <button
                        className="place-coords-btn"
                        onClick={() => setViewingMapPlace(viewingMapPlace?.id === place.id ? null : place)}
                        title={`View map (${place.latitude}, ${place.longitude})`}
                      >
                        🌐
                      </button>
                    )}
                  </div>
                  <div className="place-actions">
                    <button
                      className="btn-icon"
                      onClick={() => startEdit(place)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => setDeleteConfirm(place)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {/* Map viewer for this place */}
                {viewingMapPlace?.id === place.id && (
                  <div className="place-map-viewer">
                    <div className="place-map-viewer-header">
                      <span>{place.name}</span>
                      <button
                        className="btn-icon"
                        onClick={() => setViewingMapPlace(null)}
                        title="Close map"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="place-map-container">
                      <MapContainer
                        key={`view-${place.id}`}
                        center={[parseFloat(place.latitude), parseFloat(place.longitude)]}
                        zoom={12}
                        style={{ height: '250px', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[parseFloat(place.latitude), parseFloat(place.longitude)]} />
                      </MapContainer>
                    </div>
                    <div className="place-map-viewer-footer">
                      <span className="place-map-coords">
                        {parseFloat(place.latitude).toFixed(6)}, {parseFloat(place.longitude).toFixed(6)}
                      </span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=15/${place.latitude}/${place.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="place-map-link"
                      >
                        Open in OpenStreetMap ↗
                      </a>
                    </div>
                  </div>
                )}
              </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Delete confirmation dialog */}
        {deleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-dialog">
              <h3>Delete Place?</h3>
              <p>Are you sure you want to delete "{deleteConfirm.name}"?</p>
              {deleteConfirm.event_count > 0 && (
                <div className="delete-warning">
                  <p>This place is used in {deleteConfirm.event_count} event{deleteConfirm.event_count !== 1 ? 's' : ''}.</p>
                </div>
              )}
              <div className="delete-confirm-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlacesLibrary;

/**
 * PlacesPanelContent - Embedded panel version for LibraryPanel
 * Simplified list view with draggable items for drag-and-drop to PersonView
 */
export function PlacesPanelContent({ onOpenFullLibrary, places: propPlaces }) {
  const { isOpen } = useDatabase();

  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Use passed places prop (from App.jsx usePlaces hook)
  const places = propPlaces || [];

  // Handle drag start
  const handleDragStart = (e, place) => {
    e.dataTransfer.setData('application/heritage-place', JSON.stringify({
      type: 'place',
      id: place.id,
      name: place.name,
      placeType: place.type,
    }));
    e.dataTransfer.effectAllowed = 'copy';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  // Filter and search places
  const filteredPlaces = places.filter(item => {
    if (filter !== 'all' && item.type !== filter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        item.name,
        item.parent_name,
        item.notes,
        PLACE_TYPES[item.type],
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(query);
    }
    return true;
  });

  const placeTypes = [...new Set(places.map(p => p.type))].filter(Boolean);

  // Get place icon
  const getPlaceIcon = (type) => {
    switch (type) {
      case 'country': return '🌍';
      case 'province': return '🏛️';
      case 'county': return '🗺️';
      case 'city': return '🏙️';
      case 'town': return '🏘️';
      case 'parish': return '⛪';
      case 'township': return '🏡';
      case 'village': return '🏠';
      case 'neighborhood': return '📍';
      case 'address': return '🏢';
      case 'cemetery': return '🪦';
      case 'church': return '⛪';
      case 'hospital': return '🏥';
      default: return '📍';
    }
  };

  if (!isOpen) {
    return (
      <div className="places-panel-content">
        <div className="panel-empty">Open a bundle to view places</div>
      </div>
    );
  }

  return (
    <div className="places-panel-content">
      <div className="panel-search">
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="panel-toolbar">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {placeTypes.map(type => (
            <option key={type} value={type}>
              {PLACE_TYPES[type] || type}
            </option>
          ))}
        </select>
        {onOpenFullLibrary && (
          <button
            className="btn-secondary btn-small"
            onClick={onOpenFullLibrary}
            title="Open full library to add/edit places"
          >
            Manage
          </button>
        )}
      </div>

      <div className="panel-stats">
        {`${filteredPlaces.length} places`}
      </div>

      <div className="panel-list">
        {filteredPlaces.length === 0 ? (
          <div className="panel-empty">
            {places.length === 0 ? (
              <>
                <p>No places</p>
                <p className="panel-empty-hint">Add places in full library view</p>
              </>
            ) : (
              <p>No matches</p>
            )}
          </div>
        ) : (
          filteredPlaces.map(place => (
            <div
              key={place.id}
              className="place-item"
              draggable="true"
              onDragStart={(e) => handleDragStart(e, place)}
              onDragEnd={handleDragEnd}
              title={`Drag to set place: ${place.name}`}
            >
              <span className="place-icon">{getPlaceIcon(place.type)}</span>
              <div className="place-info">
                <span className="place-name">{place.name}</span>
                {place.type && (
                  <span className="place-type">{PLACE_TYPES[place.type] || place.type}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
