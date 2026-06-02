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
  updateProfile,
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

function FacilityCard({ item, favorites, startEdit, openDirections, toggleFavorite }) {
  return (
    <div className="facility-card">
      <div className="facility-top">
        <div className="facility-icon">🏥</div>
        <div className="facility-main">
          <h3>{item.name}</h3>
          <p className="facility-meta">
            📍 {item.area} · {item.category}
          </p>
          <p className="facility-phone">📞 {item.phone || "N/A"}</p>
        </div>

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

      <div className="facility-details">
        <span>{item.openNow ? "🟢 Open Now" : "🔴 Closed"}</span>
        <span>🕒 {item.workingTime || "Time not added"}</span>
      </div>

      {item.details && <p className="facility-extra">ℹ️ {item.details}</p>}

      <div className="facility-actions">
        <button className="direction-btn" onClick={() => openDirections(item)}>
          Directions
        </button>

        <button className="favorite-btn" onClick={() => toggleFavorite(item)}>
          {favorites.includes(item.id) ? "★ Saved" : "☆ Save"}
        </button>
      </div>
    </div>
  );
}

function AddPlaceForm({
  user,
  handleAddPlace,
  setPickingLocation,
  setMapExpanded,
  useCurrentLocation,
  pickingLocation,
  selectedLocation,
}) {
  return (
    <form className="add-form app-card" onSubmit={handleAddPlace} autoComplete="off">
      <h2>Add Healthcare Facility</h2>

      {!user && <p className="login-warning">Please login to add a place.</p>}

      <input
        name="name"
        type="text"
        placeholder="Place name"
        defaultValue=""
        autoComplete="off"
      />

      <select name="category" defaultValue="Hospital">
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
        name="area"
        type="text"
        placeholder="Area"
        defaultValue=""
        autoComplete="off"
      />

      <input
        name="address"
        type="text"
        placeholder="Address"
        defaultValue=""
        autoComplete="off"
      />

      <input
        name="phone"
        type="text"
        placeholder="Phone number"
        defaultValue=""
        autoComplete="off"
      />

      <input
        name="workingTime"
        type="text"
        placeholder="Working time"
        defaultValue=""
        autoComplete="off"
      />

      <input
        name="details"
        type="text"
        placeholder="Other details"
        defaultValue=""
        autoComplete="off"
      />

      <button
        type="button"
        className="pick-location-btn"
        onClick={() => {
          if (!user) {
            alert("Please login with Google to select a location.");
            return;
          }

          setPickingLocation(true);
          setMapExpanded(true);
        }}
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
        <p className="location-selected">✅ Location selected successfully</p>
      )}

      <button type="submit" className="submit-btn">
        Save Place Online
      </button>
    </form>
  );
}

function ProfileContent({
  user,
  profileName,
  setProfileName,
  saveProfileName,
  logout,
  loginWithGoogle,
}) {
  return (
    <div className="profile-page app-card">
      {user ? (
        <>
          <img src={user.photoURL} alt="User" className="profile-photo" />
          <h2>{user.displayName || "My Profile"}</h2>
          <p>{user.email}</p>

          <label className="profile-label">Change Name</label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="profile-input"
            placeholder="Enter your name"
          />

          <button className="profile-save-btn" onClick={saveProfileName}>
            Save Name
          </button>

          <button className="logout-wide-btn" onClick={logout}>
            🚪 Logout
          </button>
        </>
      ) : (
        <>
          <h2>Login Required</h2>
          <p>Login to save favorites and add or edit healthcare places.</p>

          <button className="login-wide-btn" onClick={loginWithGoogle}>
            👤 Login with Google
          </button>
        </>
      )}
    </div>
  );
}

function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [area, setArea] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [firebasePlaces, setFirebasePlaces] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [pickingLocation, setPickingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [profileName, setProfileName] = useState("");

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

      if (currentUser) {
        setProfileName(currentUser.displayName || "");

        const savedFavorites =
          JSON.parse(localStorage.getItem(`favorites_${currentUser.uid}`)) || [];

        setFavorites(savedFavorites);
      } else {
        setFavorites([]);
        setShowProfile(false);
      }
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
    setActiveTab("home");
  };

  const saveProfileName = async () => {
    if (!user) return;

    if (!profileName.trim()) {
      alert("Please enter a valid name");
      return;
    }

    await updateProfile(user, {
      displayName: profileName,
    });

    setUser({ ...auth.currentUser });
    alert("Profile name updated!");
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

  const favoritePlaces = allPlaces.filter((item) => favorites.includes(item.id));

  const categories = [
    "All Categories",
    ...new Set(allPlaces.map((item) => item.category)),
  ];

  const areas = ["All", ...new Set(allPlaces.map((item) => item.area))];

  const quickCategories = [
    { label: "Hospitals", value: "Hospital", icon: "🏥" },
    { label: "Clinics", value: "Clinic", icon: "🩺" },
    { label: "Labs", value: "Lab", icon: "🧪" },
    { label: "Pharmacy", value: "Pharmacy", icon: "💊" },
  ];

  const toggleFavorite = (item) => {
    if (!user) {
      alert("Please login to save favorite places.");
      return;
    }

    let updatedFavorites;

    if (favorites.includes(item.id)) {
      updatedFavorites = favorites.filter((favId) => favId !== item.id);
    } else {
      updatedFavorites = [...favorites, item.id];
    }

    setFavorites(updatedFavorites);
    localStorage.setItem(
      `favorites_${user.uid}`,
      JSON.stringify(updatedFavorites)
    );
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

    const formData = new FormData(e.currentTarget);

    const placeData = {
      name: String(formData.get("name") || "").trim(),
      category: String(formData.get("category") || "Hospital"),
      area: String(formData.get("area") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      workingTime: String(formData.get("workingTime") || "").trim(),
      details: String(formData.get("details") || "").trim(),
      openNow: true,
    };

    if (
      !placeData.name ||
      !placeData.area ||
      !placeData.address ||
      !selectedLocation
    ) {
      alert("Please fill name, area, address and select location");
      return;
    }

    await addDoc(collection(db, "places"), {
      ...placeData,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      addedBy: user.email,
      addedByName: user.displayName,
      createdAt: new Date().toISOString(),
    });

    alert("Place added successfully!");

    e.currentTarget.reset();

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
    setActiveTab("home");
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
    <div className="mobile-app">
      <header className="app-header">
        <div className="brand-row">
          <div className="brand-left">
            <img src="/health-logo.png" alt="Kochi Health Finder" />

            <div>
              <h1>Kochi Health Finder</h1>
              <p>Find care near you</p>
            </div>
          </div>

          {user ? (
            <button className="avatar-btn" onClick={() => setActiveTab("profile")}>
              <img src={user.photoURL} alt="User" />
            </button>
          ) : (
            <button className="small-login-btn" onClick={loginWithGoogle}>
              Login
            </button>
          )}
        </div>

        {activeTab === "home" && (
          <>
            <div className="search-wrapper">
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search hospitals, clinics, labs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-row">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>

              <select value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((ar) => (
                  <option key={ar}>{ar}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </header>

      <main className="app-content">
        {activeTab === "home" && (
          <>
            <section className="quick-actions">
              {quickCategories.map((cat) => (
                <button
                  key={cat.value}
                  className={
                    category === cat.value ? "quick-card active" : "quick-card"
                  }
                  onClick={() =>
                    setCategory(
                      category === cat.value ? "All Categories" : cat.value
                    )
                  }
                >
                  <span>{cat.icon}</span>
                  <p>{cat.label}</p>
                </button>
              ))}

              <button
                className="quick-card emergency-quick"
                onClick={() => setShowEmergency(!showEmergency)}
              >
                <span>🚑</span>
                <p>Emergency</p>
              </button>
            </section>

            {showEmergency && (
              <section className="emergency-box app-card">
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
              </section>
            )}

            {user && (
              <section className="logged-in-box">
                Signed in as <strong>{user.displayName}</strong>
              </section>
            )}

            <section className="section-title-row">
              <div>
                <h2>Nearby Healthcare</h2>
                <p>
                  Showing {filteredData.length} result
                  {filteredData.length !== 1 ? "s" : ""}
                </p>
              </div>

              <button onClick={() => setMapExpanded(true)}>🗺️ Map</button>
            </section>

            <section className="facility-list">
              {filteredData.map((item) => (
                <FacilityCard
                  key={item.id}
                  item={item}
                  favorites={favorites}
                  startEdit={startEdit}
                  openDirections={openDirections}
                  toggleFavorite={toggleFavorite}
                />
              ))}
            </section>
          </>
        )}

        {activeTab === "saved" && (
          <>
            <section className="section-title-row">
              <div>
                <h2>Saved Places</h2>
                <p>
                  {favoritePlaces.length} favorite place
                  {favoritePlaces.length !== 1 ? "s" : ""}
                </p>
              </div>
            </section>

            {!user ? (
              <div className="app-card empty-state">
                <h3>Login Required</h3>
                <p>Login to view and save favorite healthcare places.</p>

                <button className="login-wide-btn" onClick={loginWithGoogle}>
                  Login
                </button>
              </div>
            ) : favoritePlaces.length === 0 ? (
              <div className="app-card empty-state">
                <h3>No favorites yet</h3>
                <p>Tap Save on a hospital card to add it here.</p>
              </div>
            ) : (
              <section className="facility-list">
                {favoritePlaces.map((item) => (
                  <FacilityCard
                    key={item.id}
                    item={item}
                    favorites={favorites}
                    startEdit={startEdit}
                    openDirections={openDirections}
                    toggleFavorite={toggleFavorite}
                  />
                ))}
              </section>
            )}
          </>
        )}

        {activeTab === "add" && (
          <AddPlaceForm
            user={user}
            newPlace={newPlace}
            setNewPlace={setNewPlace}
            handleAddPlace={handleAddPlace}
            setPickingLocation={setPickingLocation}
            setMapExpanded={setMapExpanded}
            useCurrentLocation={useCurrentLocation}
            pickingLocation={pickingLocation}
            selectedLocation={selectedLocation}
          />
        )}

        {activeTab === "profile" && (
          <ProfileContent
            user={user}
            profileName={profileName}
            setProfileName={setProfileName}
            saveProfileName={saveProfileName}
            logout={logout}
            loginWithGoogle={loginWithGoogle}
          />
        )}
      </main>

      <button
        type="button"
        className="floating-map-btn"
        onClick={() => setMapExpanded(true)}
      >
        🗺️ Map
      </button>

      <nav className="bottom-nav">
        <button
          className={activeTab === "home" ? "active" : ""}
          onClick={() => setActiveTab("home")}
        >
          <span>🏠</span>
          Home
        </button>

        <button
          className={activeTab === "saved" ? "active" : ""}
          onClick={() => setActiveTab("saved")}
        >
          <span>⭐</span>
          Saved
        </button>

        <button
          className={activeTab === "add" ? "active" : ""}
          onClick={() => {
            if (!user) {
              alert("Please login with Google to add a place.");
              return;
            }

            setActiveTab("add");
          }}
        >
          <span>➕</span>
          Add
        </button>

        <button
          className={activeTab === "profile" ? "active" : ""}
          onClick={() => setActiveTab("profile")}
        >
          <span>👤</span>
          Profile
        </button>
      </nav>

      {mapExpanded && (
        <div className="map-modal">
          <button
            type="button"
            className="close-map-btn"
            onClick={() => setMapExpanded(false)}
          >
            ✕ Close
          </button>

          <MapContainer
            center={[10.0159, 76.3419]}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
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
      )}

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

      {showProfile && user && (
        <div className="profile-overlay">
          <div className="profile-box">
            <button
              className="profile-close-btn"
              onClick={() => setShowProfile(false)}
            >
              ×
            </button>

            <ProfileContent
              user={user}
              profileName={profileName}
              setProfileName={setProfileName}
              saveProfileName={saveProfileName}
              logout={logout}
              loginWithGoogle={loginWithGoogle}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
