export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_supervisor', 'pending_manager'],
  pending_supervisor: ['pending_supervisor', 'pending_manager', 'locked', 'rejected'],
  pending_manager: ['pending_supervisor', 'pending_manager', 'locked', 'rejected'],
  rejected: ['draft'],
  locked: [],
};

export interface StateMachineResult {
  valid: boolean;
  error?: string;
  httpStatus?: number;
}

/**
 * Validates a document status transition on the backend.
 * Enforces role check, assignment check, state transitions, signature verification,
 * and dynamic recipient order chain.
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

  // 1. Check if the status transition exists in the allowed transitions list
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(requestedStatus)) {
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
  const transitionPath = `${currentStatus}->${requestedStatus}`;

  switch (transitionPath) {
    case 'draft->pending_supervisor':
    case 'draft->pending_manager': {
      // Must be document owner (senderId) — ANY role (staff, supervisor, manager) can create/initiate
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
      const firstRole = sortedSignatories[0].user?.accessRole || userMap?.get(sortedSignatories[0].userId)?.accessRole || 'supervisor';
      const expectedInitialStatus = `pending_${firstRole}`;
      if (requestedStatus !== expectedInitialStatus) {
        return {
          valid: false,
          error: `Invalid transition target: Expected initial status '${expectedInitialStatus}' for recipient #1 (role '${firstRole}'), got '${requestedStatus}'.`,
          httpStatus: 400,
        };
      }
      break;
    }

    case 'rejected->draft': {
      // Must be document owner (senderId)
      if (callerId !== document.senderId) {
        return {
          valid: false,
          error: 'Forbidden: Only the document owner (initiator) can resubmit it for review.',
          httpStatus: 403,
        };
      }
      break;
    }

    default: {
      if (currentStatus.startsWith('pending_')) {
        const sortedSignatories = [...(document.signatories || [])].sort((a: any, b: any) => a.order - b.order);
        const resolvedMarkers = resolveMarkers(document.markers, incomingMarkers);

        // 1. Identify current active signatory expecting signature before incoming markers are applied
        const currentActiveSignatory = sortedSignatories.find((sig: any) => {
          const sigMarkers = (document.markers || []).filter(
            (m: any) => (m.assignedToId || m.assignedTo?.id) === sig.userId
          );
          return sigMarkers.length > 0 && sigMarkers.some((m: any) => !m.signed);
        }) || sortedSignatories[sortedSignatories.length - 1];

        // 2. Validate caller identity
        const activeUserId = currentActiveSignatory?.userId || currentActiveSignatory?.user?.id;
        if (activeUserId && callerId !== activeUserId) {
          return {
            valid: false,
            error: `Forbidden: It is not your turn to sign this document. Awaiting signature from recipient #${currentActiveSignatory?.order}.`,
            httpStatus: 403,
          };
        }

        // 3. Handle Rejection (allowed if caller is the current active signatory)
        if (requestedStatus === 'rejected') {
          break;
        }

        // 4. Compute expected next status AFTER applying incoming signatures
        const nextUnsignedSignatory = sortedSignatories.find((sig: any) => {
          const sigMarkers = resolvedMarkers.filter(
            (m: any) => (m.assignedToId || m.assignedTo?.id) === sig.userId
          );
          return sigMarkers.some((m: any) => !m.signed);
        });

        const expectedNextStatus = nextUnsignedSignatory
          ? `pending_${nextUnsignedSignatory.user?.accessRole || userMap?.get(nextUnsignedSignatory.userId)?.accessRole || 'supervisor'}`
          : 'locked';

        // 5. Enforce exact match between caller's requested target and server-computed target
        if (requestedStatus !== expectedNextStatus) {
          return {
            valid: false,
            error: `Invalid transition target: Requested status '${requestedStatus}' does not match expected next status '${expectedNextStatus}'.`,
            httpStatus: 400,
          };
        }

        // 6. If locking, ensure every signature marker across all recipients is signed
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
        error: `System Error: Transition rules for path '${transitionPath}' are not defined.`,
        httpStatus: 500,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates that:
 * 1. At least one signature marker exists.
 * 2. Each recipient has at least one marker specifically assigned to them.
 * 3. The initiator (senderId/senderEmail) is NOT included as a recipient.
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

  // Prevent initiator from being added as a recipient/signatory
  if (senderId || senderEmail) {
    const isSelfIncluded = recipients.some((r: any) => {
      const rId = r.id || r.userId;
      const rEmail = String(r.email || '').trim().toLowerCase();
      if (senderId && rId === senderId) return true;
      if (senderEmail && rEmail && rEmail === String(senderEmail).trim().toLowerCase()) return true;
      return false;
    });

    if (isSelfIncluded) {
      return {
        valid: false,
        error: 'Cannot send invitations: Initiator (document creator) cannot be added as a recipient or signatory on their own document.',
      };
    }
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


