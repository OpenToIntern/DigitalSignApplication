export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_supervisor'],
  pending_supervisor: ['pending_manager', 'rejected'],
  pending_manager: ['locked'],
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
 * Enforces role check, assignment check, state transitions, and signature verification.
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

  // 2. Validate role authorization and assignment based on transition path
  const transitionPath = `${currentStatus}->${requestedStatus}`;

  switch (transitionPath) {
    case 'draft->pending_supervisor': {
      // Must be Staff (role = 'user')
      if (callerRole !== 'user') {
        return {
          valid: false,
          error: `Forbidden: Only Staff users can submit documents for review (got role '${callerRole}').`,
          httpStatus: 403,
        };
      }
      // Must be document owner (senderId)
      if (callerId !== document.senderId) {
        return {
          valid: false,
          error: 'Forbidden: Only the document owner (initiator) can submit it for review.',
          httpStatus: 403,
        };
      }
      break;
    }

    case 'pending_supervisor->pending_manager':
    case 'pending_supervisor->rejected': {
      // Must be Supervisor (role = 'supervisor')
      if (callerRole !== 'supervisor') {
        return {
          valid: false,
          error: `Forbidden: Only Supervisor users can sign or reject at this stage (got role '${callerRole}').`,
          httpStatus: 403,
        };
      }
      // Must be the assigned Supervisor signatory on the document
      const assignedSupervisor = document.signatories?.find(
        (s: any) => s.user?.id === callerId && s.user?.accessRole === 'supervisor'
      );
      if (!assignedSupervisor) {
        return {
          valid: false,
          error: 'Forbidden: You are not assigned as a Supervisor signatory on this document.',
          httpStatus: 403,
        };
      }
      break;
    }

    case 'pending_manager->locked': {
      // Must be Manager (role = 'manager')
      if (callerRole !== 'manager') {
        return {
          valid: false,
          error: `Forbidden: Only Manager users can finalize/lock documents (got role '${callerRole}').`,
          httpStatus: 403,
        };
      }
      // Must be the assigned Manager signatory on the document
      const assignedManager = document.signatories?.find(
        (s: any) => s.user?.id === callerId && s.user?.accessRole === 'manager'
      );
      if (!assignedManager) {
        return {
          valid: false,
          error: 'Forbidden: You are not assigned as a Manager signatory on this document.',
          httpStatus: 403,
        };
      }

      // Verify signature evidence is present for BOTH Supervisor and Manager (FR-008)
      // Resolve markers by combining incoming request body markers and database markers
      const resolvedMarkersMap = new Map<string, any>();
      if (document.markers) {
        for (const m of document.markers) {
          resolvedMarkersMap.set(m.id, m);
        }
      }
      if (incomingMarkers) {
        for (const m of incomingMarkers) {
          const existing = resolvedMarkersMap.get(m.id);
          resolvedMarkersMap.set(m.id, {
            ...existing,
            ...m,
            assignedToId: m.assignedTo?.id || existing?.assignedToId,
          });
        }
      }

      const allResolvedMarkers = Array.from(resolvedMarkersMap.values());

      const supervisorMarker = allResolvedMarkers.find(m => {
        const userId = m.assignedToId || m.assignedTo?.id;
        const user = userMap?.get(userId);
        return user?.accessRole === 'supervisor';
      });

      const managerMarker = allResolvedMarkers.find(m => {
        const userId = m.assignedToId || m.assignedTo?.id;
        const user = userMap?.get(userId);
        return user?.accessRole === 'manager';
      });

      const hasSupervisorSig = supervisorMarker && supervisorMarker.signed && supervisorMarker.signature;
      const hasManagerSig = managerMarker && managerMarker.signed && managerMarker.signature;

      if (!hasSupervisorSig || !hasManagerSig) {
        return {
          valid: false,
          error: 'Bad Request: Missing signature evidence. Both Supervisor and Manager signatures must be present and signed to lock the document.',
          httpStatus: 400,
        };
      }
      break;
    }

    case 'rejected->draft': {
      // Must be Staff (role = 'user')
      if (callerRole !== 'user') {
        return {
          valid: false,
          error: `Forbidden: Only Staff users can resubmit a rejected document (got role '${callerRole}').`,
          httpStatus: 403,
        };
      }
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

    default:
      return {
        valid: false,
        error: `System Error: Transition rules for path '${transitionPath}' are not defined.`,
        httpStatus: 500,
      };
  }

  return { valid: true };
}
