import snmp from "net-snmp";

export interface OnuData {
  mac: string;
  rxPower: string;
  status: string;
  distance: string;
  port: string;
}

export async function fetchLiveOnus(ip: string, port: number, community: string, brand: string): Promise<OnuData[]> {
  return new Promise((resolve) => {
    // ECOM and BDCOM share similar OIDs
    const isEpon = brand.toLowerCase().includes("epon");
    
    // Create SNMP session
    const session = snmp.createSession(ip, community, {
      port: port,
      version: snmp.Version2c,
      retries: 1,
      timeout: 2000,
    });

    const onus: OnuData[] = [];
    
    // For now, we will do a basic SNMP test to see if it responds.
    // Full OID walking for MAC addresses requires specific OID trees:
    // e.g. BDCOM MAC: 1.3.6.1.4.1.3320.101.10.1.1.3
    // Since doing a full walk without exact OIDs might freeze the event loop or fail,
    // we'll implement the session and try to get the sysName as a ping test first.
    
    session.get(["1.3.6.1.2.1.1.5.0"], (error, varbinds) => {
      if (error) {
        console.warn(`SNMP Error for ${ip}:${port} - ${error.message}`);
        session.close();
        // Return empty so fallback to DB can happen
        resolve([]);
      } else {
        // We reached the OLT via SNMP!
        // In a full production implementation, we would now use session.walk() or session.subtree()
        // on the specific MAC address and RxPower OIDs for this brand.
        // For now, we return empty list to let the API use the fallback, but knowing it's online.
        
        session.close();
        resolve([]);
      }
    });
  });
}
