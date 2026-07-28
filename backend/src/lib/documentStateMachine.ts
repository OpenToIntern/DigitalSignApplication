const ALLOWED_PENDING = ['pending_user', 'pending_supervisor', 'pending_manager', 'locked', 'rejected'];

export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_user', 'pending_supervisor', 'pending_manager'],
  pending_user: ALLOWED_PENDING,
  pending_supervisor: ALLOWED_PENDING,
  pending_manager: ALLOWED_PENDING,
  rejected: ['draft'],
  locked: [],
};

export interface StateMachineResult {
  valid: boolean;
  error?: string;
  httpStatus?: number;
  computedNextStatus?: string;
}

/**
 * Validates a document status transition on the backend.
 * Enforces role check, assignment check, state transitions, signature verification,
 * and dynamic recipient order chain with parallel order group support.
 */
export function validateTransition(
  currentStatus: string,
  requestedStatus: string,
  callerId: string,
  callerRole: string,
  document: any,
  incomingMarkers?: any[],
  userMap?: Map<string, any>
): StateMachineResult {
  // If no change is requested, it's always valid
  if (currentStatus === requestedStatus) {
    return { valid: true };
  }

  // 1. Check if the status transition exists in the allowed transitions list (if requestedStatus is provided)
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (requestedStatus !== undefined && (!allowed || !allowed.includes(requestedStatus))) {
    return {
      valid: false,
      error: `Invalid transition: document cannot move from '${currentStatus}' to '${requestedStatus}'.`,
      httpStatus: 400,
    };
  }

  // Helper to resolve markers (merging incoming body markers with DB markers)
  const resolveMarkers = (dbMarkers: any[] = [], reqMarkers?: any[]) => {
    const map = new Map<string, any>();
    for (const m of dbMarkers) map.set(m.id, { ...m });
    if (reqMarkers) {
      for (const m of reqMarkers) {
        const existing = map.get(m.id);
        map.set(m.id, {
          ...existing,
          ...m,
          assignedToId: m.assignedTo?.id || m.assignedToId || existing?.assignedToId,
        });
      }
    }
    return Array.from(map.values());
  };

  // 2. Validate role authorization and assignment based on transition path
  let computedStatus: string | undefined = undefined;

  switch (currentStatus) {
    case 'draft': {
      // Must be document owner (senderId)
      if (callerId !== document.senderId) {
        return {
          valid: false,
          error: 'Forbidden: Only the document owner (initiator) can submit it for review.',
          httpStatus: 403,
        };
      }

      // Upfront Marker & Recipient Completeness Validation
      const sortedSignatories = [...(document.signatories || [])].sort((a: any, b: any) => a.order - b.order);
      if (sortedSignatories.length === 0) {
        return {
          valid: false,
          error: 'Cannot send document: At least one recipient/signatory must be added.',
          httpStatus: 400,
        };
      }

      const recipients = sortedSignatories.map((s: any) => s.user || userMap?.get(s.userId) || { id: s.userId });
      const currentMarkers = incomingMarkers || document.markers || [];
      const markerCheck = validateMarkersAndRecipients(currentMarkers, recipients, userMap || new Map(), document.senderId, document.sender?.email);

      if (!markerCheck.valid) {
        return {
          valid: false,
          error: markerCheck.error,
          httpStatus: 400,
        };
      }

      // Verify requested initial status matches recipient #1's accessRole
      const firstRole = sortedSignatories[0].user?.accessRole || userMap?.get(sortedSignatories[0].userId)?.accessRole || 'user';
      const expectedInitialStatus = `pending_${firstRole}`;
      computedStatus = expectedInitialStatus;

      if (requestedStatus && requestedStatus !== expectedInitialStatus) {
        return {
          valid: false,
          error: `Invalid transition target: Expected initial status '${expectedInitialStatus}' for recipient #1 (role '${firstRole}'), got '${requestedStatus}'.`,
          httpStatus: 400,
        };
      }
      break;
    }

    case 'rejected': {
      // Must be document owner (senderId)
      if (callerId !== document.senderId) {
        return {
          valid: false,
          error: 'Forbidden: Only the document owner (initiator) can resubmit it for review.',
          httpStatus: 403,
        };
      }
      
      if (requestedStatus === 'draft') {
        computedStatus = 'draft';
      } else {
        const sortedSignatories = [...(document.signatories || [])].sort((a: any, b: any) => a.order - b.order);
        const firstRole = sortedSignatories[0]?.user?.accessRole || userMap?.get(sortedSignatories[0]?.userId)?.accessRole || 'user';
        computedStatus = `pending_${firstRole}`;
      }
      break;
    }

    default: {
      if (currentStatus.startsWith('pending_')) {
        const sortedSignatories = [...(document.signatories || [])].sort((a: any, b: any) => a.order - b.order);
        const resolvedMarkers = resolveMarkers(document.markers, incomingMarkers);

        // 1. Find current active order group
        const activeOrder = sortedSignatories.find((sig: any) => {
          const sigUserId = sig.userId || sig.user?.id;
          const sigMarkers = (document.markers || []).filter(
            (m: any) => (m.assignedToId || m.assignedTo?.id) === sigUserId
          );
          return sigMarkers.length > 0 && sigMarkers.some((m: any) => !m.signed);
        })?.order || (sortedSignatories[0]?.order ?? 1);

        // 2. Identify all signatories belonging to the active order group
        const activeGroupSignatories = sortedSignatories.filter((sig: any) => sig.order === activeOrder);
        const activeGroupUserIds = activeGroupSignatories.map((sig: any) => sig.userId || sig.user?.id);

        // 3. Validate caller identity
        const isCallerInActiveGroup = activeGroupUserIds.includes(callerId);
        const callerHasUnsignedMarker = (document.markers || []).some((m: any) => {
          const mUserId = m.assignedToId || m.assignedTo?.id;
          return mUserId === callerId && !m.signed;
        });

        if (!isCallerInActiveGroup || !callerHasUnsignedMarker) {
          return {
            valid: false,
            error: `Forbidden: It is not your turn to sign this document. Awaiting signature(s) for step group #${activeOrder}.`,
            httpStatus: 403,
          };
        }

        // 4. Handle Rejection
        if (requestedStatus === 'rejected') {
          computedStatus = 'rejected';
          break;
        }

        // 5. Compute expected next status
        const nextUnsignedSignatory = sortedSignatories.find((sig: any) => {
          const sigUserId = sig.userId || sig.user?.id;
          const sigMarkers = resolvedMarkers.filter(
            (m: any) => (m.assignedToId || m.assignedTo?.id) === sigUserId
          );
          return sigMarkers.some((m: any) => !m.signed);
        });

        const expectedNextStatus = nextUnsignedSignatory
          ? `pending_${nextUnsignedSignatory.user?.accessRole || userMap?.get(nextUnsignedSignatory.userId)?.accessRole || 'user'}`
          : 'locked';

        computedStatus = expectedNextStatus;

        // 6. Enforce exact match if requested
        if (requestedStatus && requestedStatus !== expectedNextStatus) {
          return {
            valid: false,
            error: `Invalid transition target: Requested status '${requestedStatus}' does not match expected next status '${expectedNextStatus}'.`,
            httpStatus: 400,
          };
        }

        // 7. If locking, ensure every signature marker is signed
        if (expectedNextStatus === 'locked') {
          const allSigned = resolvedMarkers.length > 0 && resolvedMarkers.every((m: any) => m.signed);
          if (!allSigned) {
            return {
              valid: false,
              error: 'Bad Request: Missing signature evidence. All assigned signature markers must be signed to lock the document.',
              httpStatus: 400,
            };
          }
        }
        break;
      }

      return {
        valid: false,
        error: `System Error: Transition rules for current state '${currentStatus}' are not defined.`,
        httpStatus: 500,
      };
    }
  }

  return { valid: true, computedNextStatus: computedStatus };
}

/**
 * Validates that:
 * 1. At least one signature marker exists.
 * 2. Each recipient has at least one marker specifically assigned to them.
 */
export function validateMarkersAndRecipients(
  markers: any[],
  recipients: any[],
  userMap: Map<string, any>,
  senderId?: string,
  senderEmail?: string
): { valid: boolean; error?: string } {
  if (!markers || markers.length === 0) {
    return {
      valid: false,
      error: 'Cannot send invitations: At least one signature marker must be placed on the document.',
    };
  }

  if (!recipients || recipients.length === 0) {
    return {
      valid: false,
      error: 'Cannot send invitations: The document has no recipients.',
    };
  }

  const recipientEmails = recipients.map((r: any) => String(r.email || '').trim().toLowerCase());

  const hasMarkersForAll = recipients.every((recipient: any) => {
    const recipientEmail = String(recipient.email || '').trim().toLowerCase();

    return markers.some((m: any) => {
      let markerEmail = '';
      if (m.assignedTo?.email) {
        markerEmail = String(m.assignedTo.email).trim().toLowerCase();
      } else {
        const userId = m.assignedToId || m.assignedTo?.id;
        if (userId) {
          const rUser = recipients.find((r: any) => r.id === userId);
          if (rUser) {
            markerEmail = String(rUser.email || '').trim().toLowerCase();
          } else {
            const dbUser = userMap.get(userId);
            if (dbUser) {
              markerEmail = String(dbUser.email || '').trim().toLowerCase();
            }
          }
        }
      }

      if (markerEmail) {
        if (markerEmail === recipientEmail) {
          return true;
        }
      }
      return false;
    });
  });

  if (!hasMarkersForAll) {
    return {
      valid: false,
      error: 'Cannot send invitations: Each recipient must have at least one signature marker specifically assigned to them.',
    };
  }

  return { valid: true };
}


