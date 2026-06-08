const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/extracted-actions.json', 'utf8'));
const profileSrc = fs.readFileSync('src/app/admin/customers/[id]/CustomerProfileClient.tsx', 'utf8');

// The replacement logic:
let newSrc = profileSrc.replace('const [showPassword, setShowPassword] = useState(false);', 
  'const [showPassword, setShowPassword] = useState(false);\n' + 
  '  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);\n' + 
  '  const [rechargeCustomer, setRechargeCustomer] = useState<any | null>(null);\n' +
  data.statesBlock + '\n' +
  data.smsStateBlock.replace('showSmsModal', 'showSmsModal2')
);

newSrc = newSrc.replace('useEffect(() => {', 
  data.rechargeSubmitBlock + '\n' +
  data.smsSubmitBlock + '\n' +
  '  const triggerSuspend = async () => {\n' +
  '    if (!window.confirm("Are you sure you want to suspend this customer?")) return;\n' +
  '    try {\n' +
  '      await fetch("/api/admin/customers/" + customer.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "expired" }) });\n' +
  '      window.location.reload();\n' +
  '    } catch {}\n' +
  '  };\n' +
  '  const triggerDelete = async () => {\n' +
  '    if (!window.confirm("Are you sure you want to delete this customer? This cannot be undone.")) return;\n' +
  '    try {\n' +
  '      await fetch("/api/admin/customers/" + customer.id, { method: "DELETE" });\n' +
  '      window.location.href = "/admin/customers";\n' +
  '    } catch {}\n' +
  '  };\n' +
  '  const triggerNote = async () => {\n' +
  '    const note = prompt("Edit note:", customer.address || "");\n' +
  '    if (note !== null) {\n' +
  '      await fetch("/api/admin/customers/" + customer.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: note }) });\n' +
  '      window.location.reload();\n' +
  '    }\n' +
  '  };\n' +
  'useEffect(() => {'
);

newSrc = newSrc.replace('const { showConfirm, showAlert } = usePopup();',
  'const { showConfirm, showAlert } = usePopup();\n' +
  'const [packagesList, setPackagesList] = useState<any[]>([]);\n' +
  'useEffect(() => { fetch("/api/admin/packages").then(r=>r.json()).then(d=>setPackagesList(d)).catch(()=>{}); }, []);'
);

// We need to add the MoreHorizontal dropdown HTML to the profile UI.
// Looking at CustomerProfileClient.tsx, it has a card for Identity:
const targetCardStart = '          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">';

const dropdownHtml = `
          {/* ACTION DROPDOWN FOR PROFILE PAGE */}
          <div className="absolute top-4 left-4 z-50">
            <button
              onClick={() => setActiveDropdownId(activeDropdownId === customer.id ? null : customer.id)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all shadow-lg border border-white/10 flex items-center gap-2"
            >
              <MoreHorizontal size={18} /> <span className="text-xs font-bold">অ্যাকশন (Actions)</span>
            </button>
            {activeDropdownId === customer.id && (
              <div className="absolute left-0 mt-2 w-56 rounded-xl bg-slate-900 border border-white/10 shadow-2xl z-50 py-1 text-left overflow-hidden">
                <button
                  onClick={() => { setRechargeCustomer(customer); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Zap size={13} className="text-neon-green" /> রিচার্জ করুন (Recharge)
                </button>
                <Link 
                  href={"/admin/customers/" + customer.id + "/edit"}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Edit size={13} /> এডিট (Edit)
                </Link>
                <Link 
                  href={"/admin/tickets?userId=" + customer.id}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FileText size={13} /> টিকেট (Ticket List)
                </Link>
                <button
                  onClick={() => { triggerNote(); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FileText size={13} /> নোট (Note)
                </button>
                <button
                  onClick={() => { triggerDelete(); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash size={13} /> ডিলিট (Delete)
                </button>
                <button
                  onClick={() => { setSmsCustomer(customer); setShowSmsModal2(true); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <MessageSquare size={13} /> মেসেজ (Send SMS)
                </button>
                <button
                  onClick={() => { triggerSuspend(); setActiveDropdownId(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <ShieldAlert size={13} /> Suspend (লাইন বন্ধ করুন)
                </button>
                <Link 
                  href={"/admin/tickets"}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <ShieldAlert size={13} /> ওপেন সাপোর্ট টিকেট
                </Link>
              </div>
            )}
          </div>
`;

newSrc = newSrc.replace(targetCardStart, dropdownHtml + '\n' + targetCardStart);


newSrc = newSrc.replace('{/* Tool Modals (Ping/TraceRoute) */}',
  data.rechargeJsx + '\n' + data.successJsx + '\n' + data.smsJsx + '\n' +
  '{/* Tool Modals (Ping/TraceRoute) */}'
);

fs.writeFileSync('src/app/admin/customers/[id]/CustomerProfileClient.tsx', newSrc);
console.log('Patch complete!');
