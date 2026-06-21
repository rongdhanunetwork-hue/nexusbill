import { syncMikrotikSecrets } from './src/lib/sync';
import { POST as rechargePost } from './src/app/api/admin/customers/recharge-advance/route';
import { GET as expireGet } from './src/app/api/cron/expire-customers/route';

console.log("All modified files compiled successfully!");
