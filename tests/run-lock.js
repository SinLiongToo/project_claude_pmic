// Global setup / teardown: allow only one test run at a time.
// Two runs share the test server and the output folder; the second one would wipe the first one's files.
const fs = require('fs');
const os = require('os');
const path = require('path');

const LOCK = path.join(os.tmpdir(), 'pmic-notes-tests.lock');

function alive(pid){ try{ process.kill(pid, 0); return true; }catch(e){ return e.code === 'EPERM'; } }

module.exports = async function globalSetup(){
  if(fs.existsSync(LOCK)){
    const pid = parseInt(fs.readFileSync(LOCK, 'utf8'), 10);
    if(pid && pid !== process.pid && alive(pid))
      throw new Error(`Another test run (pid ${pid}) is still in progress. Wait for it to finish, or delete ${LOCK} if it was killed.`);
  }
  fs.writeFileSync(LOCK, String(process.pid));
  return async () => { try{ if(fs.readFileSync(LOCK, 'utf8') === String(process.pid)) fs.unlinkSync(LOCK); }catch(e){} };
};
