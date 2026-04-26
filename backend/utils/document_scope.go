package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/tether-erp/config"
	"github.com/tether-erp/types"
)

// DocumentScope represents what level of document access a user has.
type DocumentScope struct {
	CanViewAll    bool
	IsProcurement bool
	UserID        string
	OrgID         string
	UserRole      string
	OrgRoleIDs    []string // custom org role UUIDs for the user
}

var privilegeRoles = []string{
	"admin", "super_admin", "manager", "department_manager", "finance", "approver",
}

var approvalPermissions = []string{
	"requisition.approve", "approval.approve", "budget.approve",
	"purchase_order.approve", "payment_voucher.approve", "grn.approve",
}

// GetDocumentScope determines the document access level for the given user.
func GetDocumentScope(ctx context.Context, userID, userRole, orgID string) DocumentScope {
	scope := DocumentScope{UserID: userID, OrgID: orgID, UserRole: userRole}

	lower := strings.ToLower(userRole)
	for _, r := range privilegeRoles {
		if lower == r {
			scope.CanViewAll = true
			return scope
		}
	}

	rows, err := config.PgxDB.Query(ctx, `
		SELECT uor.role_id::text, COALESCE(orole.permissions, '[]'::jsonb)
		FROM user_organization_roles uor
		LEFT JOIN organization_roles orole ON orole.id = uor.role_id AND orole.active = true
		WHERE uor.user_id = $1 AND uor.organization_id = $2 AND uor.active = true
	`, userID, orgID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var roleID string
			var permsJSON []byte
			if err := rows.Scan(&roleID, &permsJSON); err != nil {
				continue
			}
			scope.OrgRoleIDs = append(scope.OrgRoleIDs, roleID)
			var permissions []string
			if err := json.Unmarshal(permsJSON, &permissions); err != nil {
				continue
			}
			for _, perm := range permissions {
				pLower := strings.ToLower(perm)
				for _, ap := range approvalPermissions {
					if pLower == ap {
						scope.CanViewAll = true
					}
				}
				if pLower == "purchase_order.create" {
					scope.IsProcurement = true
				}
			}
		}
		if scope.CanViewAll {
			return scope
		}
	}

	if lower == "procurement" {
		scope.IsProcurement = true
	}
	return scope
}

// WhereSQL returns a `(<sql>)` predicate plus the args to bind, given a starting
// positional arg index `nextArg`. Returns ("", nil, nextArg) when no filtering is needed
// (CanViewAll or IsProcurement).
//
// Caller composes the returned SQL into a WHERE clause already containing the
// organization_id filter, e.g.:
//
//	sql := "SELECT * FROM requisitions WHERE organization_id = $1 AND deleted_at IS NULL"
//	frag, fragArgs, _ := scope.WhereSQL("requester_id", "requisition", "", 2)
//	if frag != "" { sql += " AND " + frag }
//	args := append([]interface{}{orgID}, fragArgs...)
func (s DocumentScope) WhereSQL(ownerField, entityType, extraOwnerField string, nextArg int) (string, []interface{}, int) {
	if s.CanViewAll || s.IsProcurement {
		return "", nil, nextArg
	}

	var args []interface{}

	// Owner clause(s).
	owner := fmt.Sprintf("%s = $%d", ownerField, nextArg)
	args = append(args, s.UserID)
	nextArg++

	if extraOwnerField != "" {
		owner += fmt.Sprintf(" OR %s = $%d", extraOwnerField, nextArg)
		args = append(args, s.UserID)
		nextArg++
	}

	// Workflow involvement subquery.
	roleClauses := []string{fmt.Sprintf("LOWER(assigned_role) = LOWER($%d)", nextArg)}
	args = append(args, s.UserRole)
	nextArg++

	if len(s.OrgRoleIDs) > 0 {
		roleClauses = append(roleClauses, fmt.Sprintf("assigned_role = ANY($%d::text[])", nextArg))
		args = append(args, s.OrgRoleIDs)
		nextArg++
	}

	involved := fmt.Sprintf(
		"id IN (SELECT entity_id FROM workflow_tasks WHERE organization_id = $%d AND entity_type = $%d AND (assigned_user_id = $%d OR %s OR claimed_by = $%d))",
		nextArg, nextArg+1, nextArg+2, strings.Join(roleClauses, " OR "), nextArg+3,
	)
	args = append(args, s.OrgID, entityType, s.UserID, s.UserID)
	nextArg += 4

	return "(" + owner + " OR " + involved + ")", args, nextArg
}

// GetDocumentApprovalHistory fetches live approval history for a document.
func GetDocumentApprovalHistory(ctx context.Context, entityID, entityType string) []types.ApprovalRecord {
	// PRIMARY: stage_approval_records
	rows, err := config.PgxDB.Query(ctx, `
		SELECT sar.approver_id, sar.approver_name, sar.approver_role, sar.action,
		       COALESCE(sar.comments, ''), COALESCE(sar.signature, ''), sar.approved_at,
		       COALESCE(sar.man_number, ''), COALESCE(sar.position, ''), sar.stage_number
		FROM stage_approval_records sar
		JOIN workflow_tasks wt ON wt.id = sar.workflow_task_id
		WHERE wt.entity_id = $1 AND wt.entity_type = $2
		ORDER BY sar.stage_number ASC, sar.approved_at ASC
	`, entityID, entityType)
	if err == nil {
		defer rows.Close()
		var result []types.ApprovalRecord
		for rows.Next() {
			var (
				approverID, approverName, role, action string
				comments, signature, manNumber, pos    string
				approvedAt                             time.Time
				stageNum                               int
			)
			if err := rows.Scan(&approverID, &approverName, &role, &action,
				&comments, &signature, &approvedAt, &manNumber, &pos, &stageNum); err != nil {
				continue
			}
			result = append(result, types.ApprovalRecord{
				ApproverID:   approverID,
				ApproverName: approverName,
				Status:       action,
				Comments:     comments,
				Signature:    signature,
				ApprovedAt:   approvedAt,
				ManNumber:    manNumber,
				Position:     pos,
				StageNumber:  &stageNum,
				AssignedRole: &role,
			})
		}
		if len(result) > 0 {
			return result
		}
	}

	// FALLBACK: workflow_assignments stage_history JSONB
	var stageHistoryJSON []byte
	err = config.PgxDB.QueryRow(ctx, `
		SELECT COALESCE(stage_history, '[]'::jsonb)
		FROM workflow_assignments
		WHERE entity_id = $1 AND LOWER(entity_type) = LOWER($2)
		ORDER BY created_at DESC LIMIT 1
	`, entityID, entityType).Scan(&stageHistoryJSON)
	if err != nil || len(stageHistoryJSON) == 0 {
		return nil
	}

	type stageHistoryEntry struct {
		StageNumber  int    `json:"stageNumber"`
		StageName    string `json:"stageName"`
		ApproverID   string `json:"approverId"`
		ApproverName string `json:"approverName"`
		ApproverRole string `json:"approverRole"`
		Action       string `json:"action"`
		Comments     string `json:"comments"`
		Signature    string `json:"signature"`
		ExecutedAt   any    `json:"executedAt"`
	}
	var history []stageHistoryEntry
	if err := json.Unmarshal(stageHistoryJSON, &history); err != nil {
		return nil
	}
	result := make([]types.ApprovalRecord, 0, len(history))
	for _, e := range history {
		stageNum := e.StageNumber
		stageName := e.StageName
		role := e.ApproverRole
		result = append(result, types.ApprovalRecord{
			ApproverID:   e.ApproverID,
			ApproverName: e.ApproverName,
			Status:       e.Action,
			Comments:     e.Comments,
			Signature:    e.Signature,
			StageNumber:  &stageNum,
			StageName:    &stageName,
			AssignedRole: &role,
		})
	}
	return result
}
