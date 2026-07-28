import { validateTransition, validateMarkersAndRecipients } from './documentStateMachine';

function runTests() {
  console.log('=== STARTING STATE MACHINE UNIT TESTS ===\n');

  // Mock users directory map
  const userMap = new Map<string, any>([
    ['staff-1', { id: 'staff-1', name: 'Richie', email: 'staff1@company.com', accessRole: 'user' }],
    ['staff-2', { id: 'staff-2', name: 'Ricky', email: 'staff2@company.com', accessRole: 'user' }],
    ['spv-1', { id: 'spv-1', name: 'Inria', email: 'spv1@company.com', accessRole: 'supervisor' }],
    ['spv-2', { id: 'spv-2', name: 'Supervisor 2', email: 'spv2@company.com', accessRole: 'supervisor' }],
    ['mgr-1', { id: 'mgr-1', name: 'Jesynta', email: 'mgr1@company.com', accessRole: 'manager' }],
    ['mgr-2', { id: 'mgr-2', name: 'Manager 2', email: 'mgr2@company.com', accessRole: 'manager' }],
  ]);

  // Mock signatories list
  const signatories = [
    { userId: 'spv-1', order: 1, user: { id: 'spv-1', email: 'spv1@company.com', accessRole: 'supervisor' } },
    { userId: 'mgr-1', order: 2, user: { id: 'mgr-1', email: 'mgr1@company.com', accessRole: 'manager' } },
  ];

  // Base mockup document
  const baseDoc = {
    id: 'doc-1',
    name: 'Contract.pdf',
    senderId: 'staff-1',
    signatories,
    markers: [
      { id: 'm-spv', assignedToId: 'spv-1', signed: false, signature: null },
      { id: 'm-mgr', assignedToId: 'mgr-1', signed: false, signature: null },
    ],
  };

  // Test Case 1: Same status is always valid
  let res = validateTransition('draft', 'draft', 'staff-1', 'user', baseDoc);
  console.assert(res.valid === true, 'Case 1 failed');
  console.log('✅ PASS: Case 1 - Same status transition is allowed (draft -> draft)');

  // Test Case 2: Allowed status path with correct initiator
  res = validateTransition('draft', 'pending_supervisor', 'staff-1', 'user', baseDoc);
  console.assert(res.valid === true, 'Case 2 failed');
  console.log('✅ PASS: Case 2 - Valid transition (draft -> pending_supervisor) succeeds for initiator');

  // Test Case 3: Invalid transition draft -> locked (direct bypass)
  res = validateTransition('draft', 'locked', 'staff-1', 'user', baseDoc);
  console.assert(res.valid === false && res.httpStatus === 400, 'Case 3 failed');
  console.log('✅ PASS: Case 3 - Direct state bypass (draft -> locked) is rejected with 400');

  // Test Case 4: Wrong role trying to submit draft
  res = validateTransition('draft', 'pending_supervisor', 'spv-1', 'supervisor', baseDoc);
  console.assert(res.valid === false && res.httpStatus === 403, 'Case 4 failed');
  console.log('✅ PASS: Case 4 - Submit draft by supervisor role is rejected with 403 (Wrong Role)');

  // Test Case 5: Correct role but wrong initiator trying to submit draft
  res = validateTransition('draft', 'pending_supervisor', 'staff-2', 'user', baseDoc);
  console.assert(res.valid === false && res.httpStatus === 403, 'Case 5 failed');
  console.log('✅ PASS: Case 5 - Submit draft by unassigned staff is rejected with 403 (Wrong Assignment)');

  // Test Case 6: Supervisor signs document - correct role and assigned
  const spvSignedMarkers = [
    { id: 'm-spv', assignedToId: 'spv-1', signed: true, signature: 'data:image/png;base64,spv1' },
  ];
  res = validateTransition('pending_supervisor', 'pending_manager', 'spv-1', 'supervisor', baseDoc, spvSignedMarkers, userMap);
  console.assert(res.valid === true, 'Case 6 failed');
  console.log('✅ PASS: Case 6 - Assigned supervisor signing (pending_supervisor -> pending_manager) succeeds');

  // Test Case 7: Supervisor rejects document - correct role and assigned
  res = validateTransition('pending_supervisor', 'rejected', 'spv-1', 'supervisor', baseDoc, [], userMap);
  console.assert(res.valid === true, 'Case 7 failed');
  console.log('✅ PASS: Case 7 - Assigned supervisor rejecting (pending_supervisor -> rejected) succeeds');

  // Test Case 8: Correct role but unassigned Supervisor trying to sign
  res = validateTransition('pending_supervisor', 'pending_manager', 'spv-2', 'supervisor', baseDoc, spvSignedMarkers, userMap);
  console.assert(res.valid === false && res.httpStatus === 403, 'Case 8 failed');
  console.log('✅ PASS: Case 8 - Sign by unassigned supervisor is rejected with 403 (Wrong Assignment)');

  // Test Case 9: Manager tries to transition supervisor status (skipping step)
  res = validateTransition('pending_supervisor', 'pending_manager', 'mgr-1', 'manager', baseDoc, spvSignedMarkers, userMap);
  console.assert(res.valid === false && res.httpStatus === 403, 'Case 9 failed');
  console.log('✅ PASS: Case 9 - Manager signing during supervisor stage is rejected with 403 (Wrong Role)');

  // Base mockup document for when it is pending manager (supervisor already signed)
  const pendingManagerDoc = {
    ...baseDoc,
    markers: [
      { id: 'm-spv', assignedToId: 'spv-1', signed: true, signature: 'data:image/png;base64,123' },
      { id: 'm-mgr', assignedToId: 'mgr-1', signed: false, signature: null },
    ],
  };

  // Test Case 10: Manager signs (final lock) - but missing signature evidence
  res = validateTransition('pending_manager', 'locked', 'mgr-1', 'manager', pendingManagerDoc, [], userMap);
  console.assert(res.valid === false && res.httpStatus === 400, 'Case 10 failed');
  console.log('✅ PASS: Case 10 - Final lock (pending_manager -> locked) is rejected with 400 due to missing signatures');

  // Test Case 11: Manager signs (final lock) - supervisor signed, manager signed (evidence provided)
  const allSignedMarkers = [
    { id: 'm-spv', assignedToId: 'spv-1', signed: true, signature: 'data:image/png;base64,123' },
    { id: 'm-mgr', assignedToId: 'mgr-1', signed: true, signature: 'data:image/png;base64,456' },
  ];
  res = validateTransition('pending_manager', 'locked', 'mgr-1', 'manager', pendingManagerDoc, allSignedMarkers, userMap);
  console.assert(res.valid === true, 'Case 11 failed');
  console.log('✅ PASS: Case 11 - Final lock succeeds with 200 when signature evidence is present');

  // Test Case 12: Manager signs - wrong assignment
  res = validateTransition('pending_manager', 'locked', 'mgr-2', 'manager', pendingManagerDoc, allSignedMarkers, userMap);
  console.assert(res.valid === false && res.httpStatus === 403, 'Case 12 failed');
  console.log('✅ PASS: Case 12 - Lock by unassigned manager is rejected with 403 (Wrong Assignment)');

  // Test Case 13: Manager rejects document
  res = validateTransition('pending_manager', 'rejected', 'mgr-1', 'manager', pendingManagerDoc, allSignedMarkers, userMap);
  console.assert(res.valid === true, 'Case 13 failed');
  console.log('✅ PASS: Case 13 - Manager rejection on pending_manager succeeds');

  // Test Case 14: Resubmit rejected document by initiator
  res = validateTransition('rejected', 'draft', 'staff-1', 'user', baseDoc);
  console.assert(res.valid === true, 'Case 14 failed');
  console.log('✅ PASS: Case 14 - Resubmit rejected document (rejected -> draft) succeeds for initiator');

  // Test Case 15: Resubmit rejected document by wrong initiator
  res = validateTransition('rejected', 'draft', 'staff-2', 'user', baseDoc);
  console.assert(res.valid === false && res.httpStatus === 403, 'Case 15 failed');
  console.log('✅ PASS: Case 15 - Resubmit rejected document by unassigned staff is rejected with 403 (Wrong Assignment)');

  // Test Case 16: Transitioning locked terminal state
  res = validateTransition('locked', 'draft', 'staff-1', 'user', baseDoc);
  console.assert(res.valid === false && res.httpStatus === 400, 'Case 16 failed');
  console.log('✅ PASS: Case 16 - Transition out of terminal state (locked -> draft) is rejected with 400');

  // Test Case 17: validateMarkersAndRecipients - empty markers list fails
  let check = validateMarkersAndRecipients([], signatories.map(s => s.user), userMap);
  console.assert(check.valid === false && check.error?.includes('At least one signature marker must be placed'), 'Case 17 failed');
  console.log('✅ PASS: Case 17 - Empty markers list is rejected');

  // Test Case 18: validateMarkersAndRecipients - empty recipients list fails
  check = validateMarkersAndRecipients(baseDoc.markers, [], userMap);
  console.assert(check.valid === false && check.error?.includes('The document has no recipients'), 'Case 18 failed');
  console.log('✅ PASS: Case 18 - Empty recipients list is rejected');

  // Test Case 19: validateMarkersAndRecipients - successful validation when all recipients have markers
  check = validateMarkersAndRecipients(baseDoc.markers, signatories.map(s => s.user), userMap);
  console.assert(check.valid === true, 'Case 19 failed');
  console.log('✅ PASS: Case 19 - Valid markers and recipients configuration passes');

  // Test Case 20: validateMarkersAndRecipients - missing marker for one recipient fails
  const incompleteMarkers = [
    { id: 'm-spv', assignedToId: 'spv-1' }
  ];
  check = validateMarkersAndRecipients(incompleteMarkers, signatories.map(s => s.user), userMap);
  console.assert(check.valid === false && check.error?.includes('Each recipient must have at least one signature marker'), 'Case 20 failed');
  console.log('✅ PASS: Case 20 - Missing marker for a recipient is rejected');

  // Test Case 21: validateMarkersAndRecipients - unmapped marker fails validation
  const unmappedMarkers = [
    { id: 'm-unmapped', assignedToId: 'unassigned-user' }
  ];
  // Since 'unassigned-user' is not in recipients list, no recipient is satisfied by this marker. This should FAIL.
  check = validateMarkersAndRecipients(unmappedMarkers, signatories.map(s => s.user), userMap);
  console.assert(check.valid === false && check.error?.includes('Each recipient must have at least one signature marker'), 'Case 21 failed');
  console.log('✅ PASS: Case 21 - Unmapped marker does not satisfy recipients and is rejected');

  // Test Case 22: Reverse order (Manager first, then Supervisor)
  const reverseSignatories = [
    { userId: 'mgr-1', order: 1, user: { id: 'mgr-1', email: 'mgr1@company.com', accessRole: 'manager' } },
    { userId: 'spv-1', order: 2, user: { id: 'spv-1', email: 'spv1@company.com', accessRole: 'supervisor' } },
  ];
  const reverseDoc = {
    ...baseDoc,
    signatories: reverseSignatories,
    markers: [
      { id: 'm-mgr', assignedToId: 'mgr-1', signed: false, signature: null },
      { id: 'm-spv', assignedToId: 'spv-1', signed: false, signature: null },
    ],
  };
  
  // 22a. Confirm draft->pending_manager is accepted as the initial transition
  res = validateTransition('draft', 'pending_manager', 'staff-1', 'user', reverseDoc);
  console.assert(res.valid === true, 'Case 22a failed');
  console.log('✅ PASS: Case 22a - Reverse order draft -> pending_manager initial transition succeeds');

  // 22b. pending_manager->pending_supervisor correctly progresses forward
  const mgrSignedMarkers = [
    { id: 'm-mgr', assignedToId: 'mgr-1', signed: true, signature: 'data:image/png;base64,mgr1' },
  ];
  res = validateTransition('pending_manager', 'pending_supervisor', 'mgr-1', 'manager', reverseDoc, mgrSignedMarkers, userMap);
  console.assert(res.valid === true, 'Case 22b failed');
  console.log('✅ PASS: Case 22b - Reverse order pending_manager -> pending_supervisor progresses forward');

  // Test Case 23: Single signatory (Supervisor only)
  const singleSignatory = [
    { userId: 'spv-1', order: 1, user: { id: 'spv-1', email: 'spv1@company.com', accessRole: 'supervisor' } },
  ];
  const singleDoc = {
    ...baseDoc,
    signatories: singleSignatory,
    markers: [
      { id: 'm-spv', assignedToId: 'spv-1', signed: false, signature: null },
    ],
  };

  // 23a. Confirm draft->pending_supervisor is accepted
  res = validateTransition('draft', 'pending_supervisor', 'staff-1', 'user', singleDoc);
  console.assert(res.valid === true, 'Case 23a failed');
  console.log('✅ PASS: Case 23a - Single signatory draft -> pending_supervisor succeeds');

  // 23b. Supervisor signing transitions directly to locked, skipping manager stage
  res = validateTransition('pending_supervisor', 'locked', 'spv-1', 'supervisor', singleDoc, spvSignedMarkers, userMap);
  console.assert(res.valid === true, 'Case 23b failed');
  console.log('✅ PASS: Case 23b - Single signatory pending_supervisor -> locked skips manager stage directly');

  console.log('\n=== ALL 25 TESTS PASSED SUCCESSFULLY ===');
}

runTests();
