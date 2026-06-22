const fs = require('fs');

async function fetchLocations() {
  try {
    const divRes = await fetch('https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/divisions/divisions.json');
    const divText = await divRes.text();
    const divisions = JSON.parse(divText)[2].data;

    const distRes = await fetch('https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/districts/districts.json');
    const distText = await distRes.text();
    const districts = JSON.parse(distText)[2].data;
    
    const upzRes = await fetch('https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/upazilas/upazilas.json');
    const upzText = await upzRes.text();
    const upazilas = JSON.parse(upzText)[2].data;
    
    // Structure: Division -> District -> Thana array
    const map = {};
    
    divisions.forEach(div => {
       map[div.name] = {};
       const dists = districts.filter(d => d.division_id === div.id);
       
       dists.forEach(d => {
           map[div.name][d.name] = [];
           const ups = upazilas.filter(u => u.district_id === d.id);
           ups.forEach(u => map[div.name][d.name].push(u.name));
       });
    });
    
    const content = 'export const BD_LOCATIONS: Record<string, Record<string, string[]>> = ' + JSON.stringify(map, null, 2) + ';';
    fs.writeFileSync('src/lib/bd-locations.ts', content);
    console.log('Successfully created src/lib/bd-locations.ts with 3 levels');
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

fetchLocations();
