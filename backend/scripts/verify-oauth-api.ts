import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function testOAuth(code: string, expectedUserEmail: string, expectNikPending: boolean) {
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data: any = await res.json().catch(() => ({}));
    const status = res.status;

    if (status === 200) {
      console.log(`✅ SUCCESS: Google OAuth mock for "${code}" returned 200.`);
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
      console.log(`❌ ERROR: Expected 200 for OAuth code "${code}", but got status ${status}:`, data);
    }
  } catch (err: any) {
    console.error(`❌ OAuth HTTP Request Failed for "${code}":`, err.message);
  }
  console.log();
}

async function runTests() {
  console.log('=== RUNNING GOOGLE OAUTH SIMULATION TESTS ===\n');

  // 1. Richie (Staff) — mock-code-staff -> jesyntaivolairia05@gmail.com -> NIK pending
  await testOAuth('mock-code-staff', 'jesyntaivolairia05@gmail.com', true);

  // 2. Inria (Supervisor) — mock-code-supervisor -> cheritablemoney@gmail.com -> MFA pending
  await testOAuth('mock-code-supervisor', 'cheritablemoney@gmail.com', false);

  // 3. Jesynta (Manager) — mock-code-manager -> jessyharia05@gmail.com -> MFA pending
  await testOAuth('mock-code-manager', 'jessyharia05@gmail.com', false);
}

runTests();
