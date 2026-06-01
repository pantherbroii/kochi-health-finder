import fs from 'fs';

try {
  const data = JSON.parse(fs.readFileSync('./raw.json', 'utf8'));
  const cleanData = data.elements.filter(item => item.tags && item.tags.name).map((item, index) => {
    return {
      id: index + 1,
      name: item.tags.name,
      category: item.tags.amenity === "hospital" ? "Hospital" : 
                item.tags.amenity === "pharmacy" ? "Pharmacy" : 
                item.tags.amenity === "dentist" ? "Dental Clinic" : "Clinic",
      area: item.tags["addr:suburb"] || item.tags["addr:city"] || "Kochi",
      address: item.tags["addr:full"] || "Address not listed",
      phone: item.tags["phone"] || "N/A",
      isOpen247: item.tags.opening_hours === "24/7" || item.tags.amenity === "hospital",
      lat: item.lat || item.center?.lat || 10.0159,
      lng: item.lon || item.center?.lng || 76.3419
    };
  });
  fs.writeFileSync('./src/data.json', JSON.stringify(cleanData, null, 2));
  console.log(`✅ Success! Processed ${cleanData.length} facilities.`);
} catch (err) { console.error("❌ Error:", err.message); }