const fs = require('fs');

async function fetchLocations() {
  try {
    const distRes = await fetch('https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/districts/districts.json');
    const distText = await distRes.text();
    const districts = JSON.parse(distText)[2].data;
    
    const upzRes = await fetch('https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/upazilas/upazilas.json');
    const upzText = await upzRes.text();
    const upazilas = JSON.parse(upzText)[2].data;
    
    const map = {};
    districts.forEach(d => {
       map[d.name] = [];
       const ups = upazilas.filter(u => u.district_id === d.id);
       ups.forEach(u => map[d.name].push(u.name));
    });
    
    const content = 'export const DISTRICT_THANAS: Record<string, string[]> = ' + JSON.stringify(map, null, 2) + ';';
    fs.writeFileSync('src/lib/bd-locations.ts', content);
    console.log('Successfully created src/lib/bd-locations.ts');
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

fetchLocations();
