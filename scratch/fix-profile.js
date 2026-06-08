const fs = require('fs');
const src1 = fs.readFileSync('src/app/admin/customers/CustomersClient.tsx', 'utf8');
let src2 = fs.readFileSync('src/app/admin/customers/[id]/CustomerProfileClient.tsx', 'utf8');

// 1. Add packagesList state
if (!src2.includes('const [packagesList, setPackagesList]')) {
  src2 = src2.replace(
    'const [showPassword, setShowPassword] = useState(false);',
    'const [showPassword, setShowPassword] = useState(false);\n  const [packagesList, setPackagesList] = useState<any[]>([]);\n'
  );
}

// 2. Add useEffect to fetch packages
if (!src2.includes('fetch("/api/admin/packages")')) {
  src2 = src2.replace(
    'useEffect(() => {',
    'useEffect(() => {\n    fetch("/api/admin/packages").then(r => r.json()).then(data => { if (Array.isArray(data)) setPackagesList(data); }).catch(() => {});\n'
  );
}

// 3. Extract getMonthsList
const getMonthsListMatch = src1.match(/const getMonthsList = \(\) => {[\s\S]*?};/);
if (getMonthsListMatch && !src2.includes('const getMonthsList =')) {
  src2 = src2.replace('const handleReboot = async () => {', getMonthsListMatch[0] + '\n\n  const handleReboot = async () => {');
}

// 4. Extract Calculation block
const calcBlockRegex = /\/\/ Calculate values for Recharge Modal[\s\S]*?(?=const handleRechargeSubmit)/;
const calcBlockMatch = src1.match(calcBlockRegex);
if (calcBlockMatch && !src2.includes('// Calculate values for Recharge Modal')) {
  src2 = src2.replace('const handleReboot = async () => {', calcBlockMatch[0] + '\n\n  const handleReboot = async () => {');
}

// 5. Extract handleRechargeSubmit
const submitRegex = /const handleRechargeSubmit = async \(e: React\.FormEvent\) => {[\s\S]*?catch \(e\) {[\s\S]*?}[\s\S]*?};/;
const submitMatch = src1.match(submitRegex);
if (submitMatch && !src2.includes('const handleRechargeSubmit =')) {
  src2 = src2.replace('const handleReboot = async () => {', submitMatch[0] + '\n\n  const handleReboot = async () => {');
}

// 6. Extract handleSmsSubmit
const smsSubmitRegex = /const handleSmsSubmit = async \(e: React\.FormEvent\) => {[\s\S]*?catch \(e\) {[\s\S]*?}[\s\S]*?};/;
const smsSubmitMatch = src1.match(smsSubmitRegex);
if (smsSubmitMatch && !src2.includes('const handleSmsSubmit =')) {
  src2 = src2.replace('const handleReboot = async () => {', smsSubmitMatch[0] + '\n\n  const handleReboot = async () => {');
}

// 7. Add smsCustomer and sms states if missing
if (!src2.includes('const [smsCustomer, setSmsCustomer]')) {
  src2 = src2.replace(
    'const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);',
    'const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);\n  const [smsCustomer, setSmsCustomer] = useState<any | null>(null);\n  const [showSmsModal2, setShowSmsModal2] = useState(false);\n  const [smsText, setSmsText] = useState("");\n  const [smsLoading, setSmsLoading] = useState(false);\n'
  );
}

fs.writeFileSync('src/app/admin/customers/[id]/CustomerProfileClient.tsx', src2);
