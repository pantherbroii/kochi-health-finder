import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import data from "./data.json";
import "./index.css";

import { db, auth, provider } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

function LocationPicker({ pickingLocation, setSelectedLocation }) {
  useMapEvents({
    click(e) {
      if (pickingLocation) {
        setSelectedLocation({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      }
    },
  });

  return null;
}

function MoveMapToLocation({ selectedLocation }) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) {
      map.setView([selectedLocation.lat, selectedLocation.lng], 16);
    }
  }, [selectedLocation, map]);

  return null;
}

function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [area, setArea] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [firebasePlaces, setFirebasePlaces] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [user, setUser] = useState(null);

  const [newPlace, setNewPlace] = useState({
    name: "",
    category: "Hospital",
    area: "",
    address: "",
    phone: "",
    workingTime: "",
    details: "",
    openNow: true,
  });

  const localPlaces = data.filter(
    (localItem) =>
      !firebasePlaces.some((fbItem) => fbItem.originalLocalId === localItem.id)
  );

  const allPlaces = [...localPlaces, ...firebasePlaces];

  useEffect(() => {
    fetchFirebasePlaces();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const fetchFirebasePlaces = async () => {
    const querySnapshot = await getDocs(collection(db, "places"));
    const places = querySnapshot.docs.map((docItem) => ({
      id: docItem.id,
      firebaseId: docItem.id,
      ...docItem.data(),
    }));
    setFirebasePlaces(places);
  };

  const loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Firebase Login Error:", error);
    alert(error.code + " - " + error.message);
  }
};

  const logout = async () => {
    await signOut(auth);
  };

  const filteredData = allPlaces.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All Categories" || item.category === category;

    const matchesArea = area === "All" || item.area === area;

    return matchesSearch && matchesCategory && matchesArea;
  });

  const categories = [
    "All Categories",
    ...new Set(allPlaces.map((item) => item.category)),
  ];

  const areas = ["All", ...new Set(allPlaces.map((item) => item.area))];

  const toggleFavorite = (item) => {
    const exists = favorites.find((fav) => fav.id === item.id);

    if (exists) {
      setFavorites(favorites.filter((fav) => fav.id !== item.id));
    } else {
      setFavorites([...favorites, item]);
    }
  };

  const openDirections = (item) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`,
      "_blank"
    );
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setPickingLocation(false);
        alert("Current location selected successfully!");
      },
      () => {
        alert("Unable to get your location. Please allow location permission.");
      }
    );
  };

  const handleAddPlace = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please login with Google to add a place.");
      return;
    }

    if (
      !newPlace.name ||
      !newPlace.area ||
      !newPlace.address ||
      !selectedLocation
    ) {
      alert("Please fill name, area, address and select location");
      return;
    }

    await addDoc(collection(db, "places"), {
      ...newPlace,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      addedBy: user.email,
      addedByName: user.displayName,
      createdAt: new Date().toISOString(),
    });

    alert("Place added successfully!");

    setNewPlace({
      name: "",
      category: "Hospital",
      area: "",
      address: "",
      phone: "",
      workingTime: "",
      details: "",
      openNow: true,
    });

    setSelectedLocation(null);
    setPickingLocation(false);
    setShowForm(false);
    fetchFirebasePlaces();
  };

  const startEdit = (item) => {
    if (!user) {
      alert("Please login with Google to edit hospital details.");
      return;
    }

    setEditingPlace({
      ...item,
      workingTime: item.workingTime || "",
      details: item.details || "",
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please login with Google to save edits.");
      return;
    }

    if (!editingPlace.name || !editingPlace.area || !editingPlace.address) {
      alert("Please fill name, area and address");
      return;
    }

    const updatedData = {
      name: editingPlace.name,
      category: editingPlace.category,
      area: editingPlace.area,
      address: editingPlace.address,
      phone: editingPlace.phone || "",
      workingTime: editingPlace.workingTime || "",
      details: editingPlace.details || "",
      openNow: editingPlace.openNow,
      lat: editingPlace.lat,
      lng: editingPlace.lng,
      editedBy: user.email,
      editedByName: user.displayName,
      updatedAt: new Date().toISOString(),
    };

    if (editingPlace.firebaseId) {
      await updateDoc(doc(db, "places", editingPlace.firebaseId), updatedData);
    } else {
      await addDoc(collection(db, "places"), {
        ...updatedData,
        originalLocalId: editingPlace.id,
      });
    }

    alert("Details updated successfully!");
    setEditingPlace(null);
    fetchFirebasePlaces();
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="header">
          <div className="header-left">
            <img
              src="/health-logo.png"
              alt="Kochi Health Finder"
              className="header-logo"
            />
            <h2>Kochi Health Finder</h2>
          </div>

          <div className="header-actions">
            {user ? (
              <div className="user-section">
                <img
                  src={user.photoURL}
                  alt="User"
                  className="user-avatar"
                />
                <button className="logout-btn" onClick={logout}>
                  Logout
                </button>
              </div>
            ) : (
              <button className="login-btn" onClick={loginWithGoogle}>
                Google Login
              </button>
            )}

            <button
              className="emergency-btn"
              onClick={() => setShowEmergency(!showEmergency)}
            >
              🚑 Emergency
            </button>
          </div>
        </div>

        {showEmergency && (
          <div className="emergency-box">
            <h3>Emergency Contacts</h3>
            <p>
              🚑 Ambulance: <a href="tel:108">108</a>
            </p>
            <p>
              🏥 Patient Transport: <a href="tel:102">102</a>
            </p>
            <p>
              🆘 National Emergency: <a href="tel:112">112</a>
            </p>
          </div>
        )}

        {user && (
          <div className="logged-in-box">
            Signed in as <strong>{user.displayName}</strong>
          </div>
        )}

        <input
          type="text"
          placeholder="Search facilities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-box"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="filter-box"
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="filter-box"
        >
          {areas.map((ar) => (
            <option key={ar}>{ar}</option>
          ))}
        </select>

        <div className="result-count">
          Showing {filteredData.length} result
          {filteredData.length !== 1 ? "s" : ""}
        </div>

        <button
          className="add-toggle-btn"
          onClick={() => {
            if (!user) {
              alert("Please login with Google to add a place.");
              return;
            }
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Close Form" : "+ Add Missing Place"}
        </button>

        {showForm && (
          <form className="add-form" onSubmit={handleAddPlace}>
            <input
              type="text"
              placeholder="Place name"
              value={newPlace.name}
              onChange={(e) =>
                setNewPlace({ ...newPlace, name: e.target.value })
              }
            />

            <select
              value={newPlace.category}
              onChange={(e) =>
                setNewPlace({ ...newPlace, category: e.target.value })
              }
            >
              <option>Hospital</option>
              <option>Clinic</option>
              <option>Dental Clinic</option>
              <option>Skin Clinic</option>
              <option>Eye Hospital</option>
              <option>Pharmacy</option>
              <option>Lab</option>
              <option>Ambulance</option>
            </select>

            <input
              type="text"
              placeholder="Area"
              value={newPlace.area}
              onChange={(e) =>
                setNewPlace({ ...newPlace, area: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Address"
              value={newPlace.address}
              onChange={(e) =>
                setNewPlace({ ...newPlace, address: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Phone number"
              value={newPlace.phone}
              onChange={(e) =>
                setNewPlace({ ...newPlace, phone: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Working time"
              value={newPlace.workingTime}
              onChange={(e) =>
                setNewPlace({ ...newPlace, workingTime: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Other details"
              value={newPlace.details}
              onChange={(e) =>
                setNewPlace({ ...newPlace, details: e.target.value })
              }
            />

            <button
              type="button"
              className="pick-location-btn"
              onClick={() => setPickingLocation(true)}
            >
              📍 Pick Location on Map
            </button>

            <button
              type="button"
              className="current-location-btn"
              onClick={useCurrentLocation}
            >
              📌 Use My Current Location
            </button>

            {pickingLocation && (
              <p className="pick-help">Now click the exact place on the map.</p>
            )}

            {selectedLocation && (
              <p className="location-selected">
                ✅ Location selected successfully
              </p>
            )}

            <button type="submit" className="submit-btn">
              Save Place Online
            </button>
          </form>
        )}

        <div className="list">
          {filteredData.map((item) => (
            <div className="card" key={item.id}>
              <div className="card-title-row">
                <h3>{item.name}</h3>
                <button
                  type="button"
                  className="edit-icon-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startEdit(item);
                  }}
                >
                  ✏️
                </button>
              </div>

              <p>📍 {item.area}</p>
              <p>🏥 {item.category}</p>
              <p>📞 {item.phone || "N/A"}</p>
              <p>🕒 {item.workingTime || "Working time not added"}</p>
              <p>ℹ️ {item.details || "No extra details added"}</p>
              <p>{item.openNow ? "✅ Open Now" : "🔴 Closed"}</p>

              <button
                className="direction-btn"
                onClick={() => openDirections(item)}
              >
                Get Directions
              </button>

              <button
                className="favorite-btn"
                onClick={() => toggleFavorite(item)}
              >
                {favorites.find((fav) => fav.id === item.id)
                  ? "★ Saved"
                  : "☆ Save Favorite"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="map-section">
        <MapContainer
          center={[10.0159, 76.3419]}
          zoom={12}
          style={{ height: "100vh", width: "100%" }}
        >
          <LocationPicker
            pickingLocation={pickingLocation}
            setSelectedLocation={setSelectedLocation}
          />

          <MoveMapToLocation selectedLocation={selectedLocation} />

          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredData.map((item) => (
            <Marker key={item.id} position={[item.lat, item.lng]}>
              <Popup>
                <h3>{item.name}</h3>
                <p>{item.address}</p>
                <p>🏥 {item.category}</p>
                <p>📞 {item.phone || "N/A"}</p>
                <p>🕒 {item.workingTime || "Working time not added"}</p>
                <p>ℹ️ {item.details || "No extra details added"}</p>

                <button
                  className="direction-btn"
                  onClick={() => openDirections(item)}
                >
                  Get Directions
                </button>
              </Popup>
            </Marker>
          ))}

          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
              <Popup>
                <b>Selected location</b>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {editingPlace && (
        <div className="edit-overlay">
          <form className="edit-box" onSubmit={saveEdit}>
            <h2>Edit Hospital Details</h2>

            <input
              type="text"
              value={editingPlace.name}
              onChange={(e) =>
                setEditingPlace({ ...editingPlace, name: e.target.value })
              }
              placeholder="Place name"
            />

            <select
              value={editingPlace.category}
              onChange={(e) =>
                setEditingPlace({ ...editingPlace, category: e.target.value })
              }
            >
              <option>Hospital</option>
              <option>Clinic</option>
              <option>Dental Clinic</option>
              <option>Skin Clinic</option>
              <option>Eye Hospital</option>
              <option>Pharmacy</option>
              <option>Lab</option>
              <option>Ambulance</option>
            </select>

            <input
              type="text"
              value={editingPlace.area}
              onChange={(e) =>
                setEditingPlace({ ...editingPlace, area: e.target.value })
              }
              placeholder="Area"
            />

            <input
              type="text"
              value={editingPlace.address}
              onChange={(e) =>
                setEditingPlace({ ...editingPlace, address: e.target.value })
              }
              placeholder="Address"
            />

            <input
              type="text"
              value={editingPlace.phone || ""}
              onChange={(e) =>
                setEditingPlace({ ...editingPlace, phone: e.target.value })
              }
              placeholder="Phone number"
            />

            <input
              type="text"
              value={editingPlace.workingTime || ""}
              onChange={(e) =>
                setEditingPlace({
                  ...editingPlace,
                  workingTime: e.target.value,
                })
              }
              placeholder="Working time"
            />

            <textarea
              value={editingPlace.details || ""}
              onChange={(e) =>
                setEditingPlace({ ...editingPlace, details: e.target.value })
              }
              placeholder="Other details"
            />

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={editingPlace.openNow}
                onChange={(e) =>
                  setEditingPlace({
                    ...editingPlace,
                    openNow: e.target.checked,
                  })
                }
              />
              Open Now
            </label>

            <button type="submit" className="submit-btn">
              Save Changes
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={() => setEditingPlace(null)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;