import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function testLogin(email: string, password: string, expectSuccess: boolean, expectNikPending: boolean) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data: any = await res.json().catch(() => ({}));
    const status = res.status;

    if (expectSuccess) {
      if (status === 200) {
        console.log(`✅ SUCCESS: Login for ${email} succeeded with 200.`);
        if (expectNikPending) {
          if (data.nikPending) {
            console.log(`   👉 Correctly routed to NIK verification (nikPending: true).`);
          } else {
            console.log(`   ❌ ERROR: Expected nikPending: true, got:`, data);
          }
        } else {
          if (data.mfaPending) {
            console.log(`   👉 Correctly skipped NIK and routed to MFA (mfaPending: true).`);
          } else {
            console.log(`   ❌ ERROR: Expected mfaPending: true, got:`, data);
          }
        }
      } else {
        console.log(`❌ ERROR: Expected 200 success for ${email}, but got status ${status}:`, data);
      }
    } else {
      if (status === 401) {
        console.log(`✅ SUCCESS: Login for ${email} with password "${password}" correctly rejected with 401. Error: "${data.error}"`);
      } else {
        console.log(`❌ ERROR: Expected 401 rejection for ${email}, but got status ${status}:`, data);
      }
    }
  } catch (err: any) {
    console.error(`❌ HTTP Request Failed for ${email}:`, err.message);
  }
  console.log();
}

async function runTests() {
  console.log('=== RUNNING MANUAL LOGIN SCENARIO TESTS ===\n');

  // 1. Richie (Staff) — unverified NIK, correct password
  await testLogin('jesyntaivolairia05@gmail.com', 'Staff2026', true, true);
  await testLogin('richie.wong@companyx.com', 'Staff2026', true, true);

  // 2. Inria (Supervisor) — verified NIK, correct password
  await testLogin('cheritablemoney@gmail.com', 'Supervisor2026', true, false);
  await testLogin('inria.kalalo@companyx.com', 'Supervisor2026', true, false);

  // 3. Jesynta (Manager) — verified NIK, correct password
  await testLogin('jessyharia05@gmail.com', 'Manager2026', true, false);
  await testLogin('jesynta.harya@companyx.com', 'Manager2026', true, false);

  // 4. Richie with wrong password
  await testLogin('jesyntaivolairia05@gmail.com', 'WrongPassword123', false, false);

  // 5. Inria with wrong password
  await testLogin('cheritablemoney@gmail.com', 'Staff2026', false, false);

  // 6. Non-existent user
  await testLogin('doesnotexist@gmail.com', 'Password123', false, false);
}

runTests();
