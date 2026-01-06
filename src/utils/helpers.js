

### src/utils/helpers.js


```js
import fs from 'fs';
import path from 'path';


// יוצר תיקייה אם היא לא קיימת
export function ensureDir(dirPath) {
if (!fs.existsSync(dirPath)) {
fs.mkdirSync(dirPath, { recursive: true });
}
}


// מחזיר תאריך סריקה אחיד (לוגים, מטא־דאטה)
export function getScanTimestamp() {
return new Date().toISOString();
}


// מחזיר שם תיקייה בטוח להרצה (למשל: 2026-01-05_19-53-22)
export function getRunFolderName() {
const d = new Date();


const pad = (n) => String(n).padStart(2, '0');


return (
d.getFullYear() + '-' +
pad(d.getMonth() + 1) + '-' +
pad(d.getDate()) + '_' +
pad(d.getHours()) + '-' +
pad(d.getMinutes()) + '-' +
pad(d.getSeconds())
);
}
```
